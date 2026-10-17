"""
Pruebas Unitarias y de Integración del Módulo 16: Analítica de Reacciones y Fiscalización Interactiva (SDD)
RF-ANL-001 a RF-ANL-007 — GAMEA Social Monitor
"""

import io
import uuid
from datetime import UTC, datetime, timedelta

import openpyxl
import pytest
import pytest_asyncio
from database import Base
from modules.analytics.schemas import (
    AnalyticsEmployeesPageResponse,
    AnalyticsOverviewResponse,
)
from modules.analytics.service import AnalyticsService
from modules.employees.models import Employee, OrganizationalUnit
from modules.iam.models import Role, User
from modules.interactions.models import Interaction
from modules.publications.models import Publication
from modules.shared.enums import DataOriginType, UserRole, VerificationStatus
from modules.social_accounts.models import SocialPlatform
from modules.verification.models import Verification
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        # Seed basic platforms
        session.add(SocialPlatform(id=uuid.uuid4(), name="FACEBOOK", display_name="Facebook", is_active=True))
        session.add(SocialPlatform(id=uuid.uuid4(), name="TIKTOK", display_name="TikTok", is_active=True))
        await session.commit()
        yield session

    await engine.dispose()


@pytest.fixture
def super_admin():
    return User(
        id=uuid.uuid4(),
        email="admin@elalto.gob.bo",
        full_name="Super Administrador",
        password_hash="hash",
        workspace_type="GLOBAL",
        assigned_direction=None,
        assigned_unit=None,
        roles=[Role(id=uuid.uuid4(), name=UserRole.SUPER_ADMIN.value, description="Super Admin")],
    )


@pytest.fixture
def operator_prensa():
    return User(
        id=uuid.uuid4(),
        email="prensa@elalto.gob.bo",
        full_name="Operador Prensa",
        password_hash="hash",
        workspace_type="UNIT",
        assigned_direction="Dirección de Comunicación",
        assigned_unit="Unidad de Prensa",
        roles=[Role(id=uuid.uuid4(), name=UserRole.OPERATOR.value, description="Operador")],
    )


@pytest.mark.asyncio
async def test_analytics_overview_empty(async_db: AsyncSession, super_admin: User):
    """Verifica que el overview responda con ceros limpios y estructura válida cuando no hay datos."""
    overview = await AnalyticsService.get_overview(db=async_db, current_user=super_admin)
    assert isinstance(overview, AnalyticsOverviewResponse)
    assert overview.kpis.total_employees == 0
    assert overview.kpis.total_reactions == 0
    assert overview.kpis.participation_rate == 0.0
    assert len(overview.reactions_breakdown) >= 1
    assert isinstance(overview.platform_comparison.facebook.total_reactions, int)


@pytest.mark.asyncio
async def test_analytics_overview_with_activity(async_db: AsyncSession, super_admin: User):
    """Verifica el cálculo de KPIs, rankings por dirección, breakdown de reacciones y serie temporal."""
    # 1. Crear Unidades Organizacionales
    dir_com = OrganizationalUnit(id=uuid.uuid4(), name="Dirección de Comunicación", code="DIR-COM")
    unit_prensa = OrganizationalUnit(id=uuid.uuid4(), name="Unidad de Prensa", code="U-PRENSA", parent_id=dir_com.id)
    dir_salud = OrganizationalUnit(id=uuid.uuid4(), name="Dirección de Salud", code="DIR-SALUD")
    unit_hosp = OrganizationalUnit(id=uuid.uuid4(), name="Unidad Hospitalaria", code="U-HOSP", parent_id=dir_salud.id)
    async_db.add_all([dir_com, unit_prensa, dir_salud, unit_hosp])

    # 2. Crear Empleados
    emp1 = Employee(
        employee_id="EMP-001",
        first_name="Juan",
        last_name="Perez",
        document_number_encrypted="enc1",
        document_hash="hash1",
        status="ACTIVE",
        direction_name="Dirección de Comunicación",
        organizational_unit_id=unit_prensa.id,
    )
    emp2 = Employee(
        employee_id="EMP-002",
        first_name="Maria",
        last_name="Gomez",
        document_number_encrypted="enc2",
        document_hash="hash2",
        status="ACTIVE",
        direction_name="Dirección de Comunicación",
        organizational_unit_id=unit_prensa.id,
    )
    emp3 = Employee(
        employee_id="EMP-003",
        first_name="Carlos",
        last_name="Quispe",
        document_number_encrypted="enc3",
        document_hash="hash3",
        status="ACTIVE",
        direction_name="Dirección de Salud",
        organizational_unit_id=unit_hosp.id,
    )
    async_db.add_all([emp1, emp2, emp3])
    await async_db.commit()

    # 3. Plataformas y Publicaciones
    fb_plat = (await async_db.execute(SocialPlatform.__table__.select().where(SocialPlatform.name == "FACEBOOK"))).first()
    pub1 = Publication(
        platform_id=fb_plat.id,
        external_post_id="post_fb_100",
        content_text="Inauguración de obras en El Alto",
        published_at=datetime.now(UTC) - timedelta(days=2),
        is_monitored=True,
    )
    async_db.add(pub1)
    await async_db.commit()

    # 4. Crear interacción y verificación para Juan Perez (LOVE)
    inter1 = Interaction(
        publication_id=pub1.id,
        platform_id=fb_plat.id,
        external_interaction_id="inter_1",
        interaction_type="LOVE",
        external_author_name="Juan Perez",
        content_text=None,
        external_created_at=datetime.now(UTC) - timedelta(days=2),
        data_origin_type=DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value,
    )
    async_db.add(inter1)
    await async_db.flush()

    verif1 = Verification(
        interaction_id=inter1.id,
        employee_id=emp1.employee_id,
        verification_status=VerificationStatus.CONFIRMED.value,
        verification_method="BATCH_REACTION_MATCHER",
        verified_at=datetime.now(UTC),
        verified_by_user_id=str(super_admin.id),
        explanation="Cotejo automático verificado",
    )
    async_db.add(verif1)
    await async_db.commit()

    # 5. Obtener overview analítico
    overview = await AnalyticsService.get_overview(db=async_db, current_user=super_admin)

    assert overview.kpis.total_employees == 3
    assert overview.kpis.total_publications == 1
    assert overview.kpis.total_reactions == 1
    assert overview.kpis.participating_employees == 1
    # 1 de 3 = 33.3%
    assert overview.kpis.participation_rate == 33.3

    # Desglose de reacciones
    love_item = next((r for r in overview.reactions_breakdown if r.type == "LOVE"), None)
    assert love_item is not None
    assert love_item.count == 1

    # Ranking por Dirección
    dir_com_rank = next((d for d in overview.direction_rankings if "Prensa" in d.direction or "Comunicación" in d.direction), None)
    assert dir_com_rank is not None
    assert dir_com_rank.total_employees == 2
    assert dir_com_rank.participating_employees == 1
    assert dir_com_rank.participation_rate == 50.0

    # Timeline y Plataforma
    assert len(overview.timeline_series) >= 1
    assert overview.platform_comparison.facebook.total_reactions == 1
    assert overview.platform_comparison.tiktok.total_reactions == 0


@pytest.mark.asyncio
async def test_analytics_workspace_isolation(async_db: AsyncSession, super_admin: User, operator_prensa: User):
    """Verifica que un operador de unidad solo vea métricas de su propia unidad y no de otras direcciones."""
    dir_com = OrganizationalUnit(id=uuid.uuid4(), name="Dirección de Comunicación", code="DIR-COM")
    unit_prensa = OrganizationalUnit(id=uuid.uuid4(), name="Unidad de Prensa", code="U-PRENSA", parent_id=dir_com.id)
    dir_salud = OrganizationalUnit(id=uuid.uuid4(), name="Dirección de Salud", code="DIR-SALUD")
    unit_hosp = OrganizationalUnit(id=uuid.uuid4(), name="Unidad Hospitalaria", code="U-HOSP", parent_id=dir_salud.id)
    async_db.add_all([dir_com, unit_prensa, dir_salud, unit_hosp])

    emp_prensa = Employee(
        employee_id="EMP-P1",
        first_name="Ana",
        last_name="Prensa",
        document_number_encrypted="encP",
        document_hash="hashP",
        status="ACTIVE",
        direction_name="Dirección de Comunicación",
        organizational_unit_id=unit_prensa.id,
    )
    emp_salud = Employee(
        employee_id="EMP-S1",
        first_name="Carlos",
        last_name="Salud",
        document_number_encrypted="encS",
        document_hash="hashS",
        status="ACTIVE",
        direction_name="Dirección de Salud",
        organizational_unit_id=unit_hosp.id,
    )
    async_db.add_all([emp_prensa, emp_salud])
    await async_db.commit()

    # Vista Super Admin: ve 2 funcionarios en total
    overview_admin = await AnalyticsService.get_overview(db=async_db, current_user=super_admin)
    assert overview_admin.kpis.total_employees == 2

    # Vista Operador Prensa: aislado estrictamente a 1 funcionario
    overview_prensa = await AnalyticsService.get_overview(db=async_db, current_user=operator_prensa)
    assert overview_prensa.kpis.total_employees == 1


@pytest.mark.asyncio
async def test_analytics_employees_table_and_filtering(async_db: AsyncSession, super_admin: User):
    """Verifica la paginación, filtros de búsqueda y filtrado por estado de participación."""
    dir_com = OrganizationalUnit(id=uuid.uuid4(), name="Dirección de Comunicación", code="DIR-COM")
    unit_prensa = OrganizationalUnit(id=uuid.uuid4(), name="Unidad de Prensa", code="U-PRENSA", parent_id=dir_com.id)
    async_db.add_all([dir_com, unit_prensa])

    emp1 = Employee(
        employee_id="EMP-010",
        first_name="Rodrigo",
        last_name="Morales",
        document_number_encrypted="enc10",
        document_hash="hash10",
        status="ACTIVE",
        direction_name="Dirección de Comunicación",
        organizational_unit_id=unit_prensa.id,
    )
    emp2 = Employee(
        employee_id="EMP-011",
        first_name="Beatriz",
        last_name="Vargas",
        document_number_encrypted="enc11",
        document_hash="hash11",
        status="ACTIVE",
        direction_name="Dirección de Comunicación",
        organizational_unit_id=unit_prensa.id,
    )
    async_db.add_all([emp1, emp2])
    await async_db.commit()

    # Consulta con búsqueda por nombre "Rodrigo"
    res_search = await AnalyticsService.get_employees_table(
        db=async_db,
        current_user=super_admin,
        search="Rodrigo",
        page=1,
        page_size=10,
    )
    assert isinstance(res_search, AnalyticsEmployeesPageResponse)
    assert res_search.total == 1
    assert "Rodrigo" in res_search.items[0].full_name

    # Filtrar por NO_REACTION (ambos están sin interacción)
    res_no_react = await AnalyticsService.get_employees_table(
        db=async_db,
        current_user=super_admin,
        participation_status="NO_REACTION",
    )
    assert res_no_react.total == 2

    # Filtrar por PARTICIPATED (ninguno ha reaccionado)
    res_part = await AnalyticsService.get_employees_table(
        db=async_db,
        current_user=super_admin,
        participation_status="PARTICIPATED",
    )
    assert res_part.total == 0


@pytest.mark.asyncio
async def test_analytics_export_excel(async_db: AsyncSession, super_admin: User):
    """Verifica que la exportación genere un archivo Excel con formato y carátula válidos."""
    excel_bytes = await AnalyticsService.export_excel(db=async_db, current_user=super_admin)
    assert isinstance(excel_bytes, bytes)
    assert len(excel_bytes) > 1000

    # Cargar el Excel en memoria con openpyxl para verificar las hojas
    wb = openpyxl.load_workbook(io.BytesIO(excel_bytes))
    sheet_names = wb.sheetnames
    assert "Resumen Ejecutivo" in sheet_names
    assert "Detalle de Funcionarios" in sheet_names

    summary_sheet = wb["Resumen Ejecutivo"]
    assert "GOBIERNO AUTÓNOMO MUNICIPAL DE EL ALTO" in str(summary_sheet["A1"].value)


@pytest.mark.asyncio
async def test_hierarchical_filtering_and_purge(async_db: AsyncSession, super_admin: User):
    """Verifica el filtrado jerárquico tridimensional y la depuración de datos de prueba."""
    # 1. Crear estructura y empleados
    sec = OrganizationalUnit(id=uuid.uuid4(), name="Secretaría Municipal de Educación y Cultura", code="SEC-EDU")
    dir_dep = OrganizationalUnit(id=uuid.uuid4(), name="Dirección de Deportes", code="DIR-DEP", parent_id=sec.id)
    unit_infra = OrganizationalUnit(id=uuid.uuid4(), name="Unidad de Infraestructura", code="U-INFRA", parent_id=dir_dep.id)
    async_db.add_all([sec, dir_dep, unit_infra])

    emp = Employee(
        employee_id="EMP-EDU-01",
        first_name="Carlos",
        last_name="Mendoza",
        document_number_encrypted="doc",
        document_hash="hash_edu",
        organizational_unit_id=unit_infra.id,
        direction_name="Dirección de Deportes",
        status="ACTIVE",
    )
    async_db.add(emp)

    stmt_plat = select(SocialPlatform).where(SocialPlatform.name == "FACEBOOK")
    fb_plat = (await async_db.execute(stmt_plat)).scalar_one()

    pub = Publication(
        id=uuid.uuid4(),
        platform_id=fb_plat.id,
        external_post_id="post_real_001",
        post_url="https://facebook.com/post_real_001",
        is_monitored=True,
    )
    async_db.add(pub)

    inter = Interaction(
        id=uuid.uuid4(),
        publication_id=pub.id,
        platform_id=fb_plat.id,
        data_origin_type=DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value,
        interaction_type="LIKE",
        external_author_name="Carlos Mendoza",
        external_interaction_id="inter_test_hier",
    )
    async_db.add(inter)
    await async_db.flush()

    verif = Verification(
        id=uuid.uuid4(),
        interaction_id=inter.id,
        employee_id="EMP-EDU-01",
        verification_status=VerificationStatus.CONFIRMED.value,
        verification_method="BATCH_REACTION_MATCHER",
        verified_at=datetime.now(UTC),
        explanation="Verificación de prueba",
    )
    async_db.add(verif)
    await async_db.commit()

    # Filtro por Secretaría
    res_sec = await AnalyticsService.get_overview(
        db=async_db,
        current_user=super_admin,
        secretaria="Secretaría Municipal de Educación y Cultura",
    )
    assert res_sec.kpis.total_employees == 1
    assert "Secretaría Municipal de Educación y Cultura" in res_sec.available_secretarias

    # Filtro por otra secretaría inexistente en este empleado
    res_other = await AnalyticsService.get_overview(
        db=async_db,
        current_user=super_admin,
        secretaria="Secretaría Municipal de Salud",
    )
    assert res_other.kpis.total_employees == 0

    # Depuración de datos de prueba
    purge_res = await AnalyticsService.purge_test_data(async_db)
    assert purge_res["success"] is True

    # Comprobar que tras el purge no quedan reacciones ni verificaciones
    res_purged = await AnalyticsService.get_overview(db=async_db, current_user=super_admin)
    assert res_purged.kpis.total_reactions == 0
    assert res_purged.kpis.participating_employees == 0


@pytest.mark.asyncio
async def test_analytics_subalcaldias_filtering(async_db: AsyncSession, super_admin: User):
    """Verifica que las Subalcaldías aparezcan en el organigrama y funcionen en los filtros jerárquicos."""
    # 1. Comprobar que Subalcaldías esté en las secretarías disponibles
    overview = await AnalyticsService.get_overview(db=async_db, current_user=super_admin)
    assert "Subalcaldías" in overview.available_secretarias

    # 2. Registrar unidad y funcionario perteneciente a una Subalcaldía (Distrito 3)
    unit_sub3 = OrganizationalUnit(
        id=uuid.uuid4(),
        name="Unidad de Infraestructura Pública",
        code="SUB3-INFRA",
    )
    async_db.add(unit_sub3)
    await async_db.flush()

    emp_sub = Employee(
        employee_id="EMP-SUB-03",
        first_name="Ramiro",
        last_name="Callisaya",
        document_number_encrypted="enc_sub3",
        document_hash="hash_sub3",
        organizational_unit_id=unit_sub3.id,
        direction_name="Subalcaldía Distrito Municipal 3",
        status="ACTIVE",
    )
    async_db.add(emp_sub)
    await async_db.commit()

    # 3. Filtrar por Secretaría "Subalcaldías"
    res_sub = await AnalyticsService.get_overview(
        db=async_db,
        current_user=super_admin,
        secretaria="Subalcaldías",
    )
    assert res_sub.kpis.total_employees == 1
    assert "Subalcaldía Distrito Municipal 3" in res_sub.available_directions

    # 4. Filtrar por Dirección específica "Subalcaldía Distrito Municipal 3"
    res_dir = await AnalyticsService.get_overview(
        db=async_db,
        current_user=super_admin,
        direction="Subalcaldía Distrito Municipal 3",
    )
    assert res_dir.kpis.total_employees == 1

    # 5. Filtrar por otra Subalcaldía (Distrito 4) -> 0 empleados
    res_other = await AnalyticsService.get_overview(
        db=async_db,
        current_user=super_admin,
        direction="Subalcaldía Distrito Municipal 4",
    )
    assert res_other.kpis.total_employees == 0

    # 6. Verificar en la tabla de funcionarios
    table_res = await AnalyticsService.get_employees_table(
        db=async_db,
        current_user=super_admin,
        secretaria="Subalcaldías",
    )
    assert table_res.total == 1
    assert table_res.items[0].secretaria == "Subalcaldías"
    assert table_res.items[0].direction == "Subalcaldía Distrito Municipal 3"


@pytest.mark.asyncio
async def test_analytics_comments_audit_and_kpis(async_db: AsyncSession, super_admin: User):
    """Verifica la contabilización y auditoría de quiénes comentaron junto a reacciones (RF-COM-001 a RF-COM-004)."""
    # 1. Crear unidad y empleado
    unit = OrganizationalUnit(id=uuid.uuid4(), name="Unidad de Comunicación Digital", code="UCD-01")
    async_db.add(unit)
    await async_db.flush()

    emp = Employee(
        employee_id="EMP-COMM-99",
        first_name="Gonzalo",
        last_name="Quispe",
        document_number_encrypted="enc_gq",
        document_hash="hash_gq",
        organizational_unit_id=unit.id,
        direction_name="Dirección de Comunicación",
        status="ACTIVE",
    )
    async_db.add(emp)

    # 2. Crear publicación evaluada
    stmt_p = select(SocialPlatform).where(SocialPlatform.name == "FACEBOOK")
    plat = (await async_db.execute(stmt_p)).scalar_one()

    pub = Publication(
        id=uuid.uuid4(),
        platform_id=plat.id,
        external_post_id="post_fb_eval_99",
        post_url="https://facebook.com/gamea/posts/99",
        content_text="Entrega de Luminarias en Distrito 8",
        published_at=datetime.now(UTC),
        is_monitored=True,
        meta_reactions_total=10,
        meta_comments_total=5,
    )
    async_db.add(pub)
    await async_db.flush()

    # 3. Comentario 1: Emitido por el funcionario (con verificación)
    comm_emp = Interaction(
        id=uuid.uuid4(),
        publication_id=pub.id,
        platform_id=plat.id,
        interaction_type="COMMENT",
        external_interaction_id="comm_emp_01",
        external_author_id=emp.employee_id,
        external_author_name=f"{emp.first_name} {emp.last_name}",
        content_text="Excelente gestión por el Distrito 8, felicidades!",
        captured_at=datetime.now(UTC),
        data_origin_type=DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value,
    )
    async_db.add(comm_emp)
    await async_db.flush()

    ver_comm = Verification(
        interaction_id=comm_emp.id,
        employee_id=emp.employee_id,
        verification_status=VerificationStatus.CONFIRMED.value,
        verification_method="AUTOMATIC_SYNC_MATCHER",
        explanation="Cotejo automático de comentario",
    )
    async_db.add(ver_comm)

    # 4. Reacción del mismo funcionario (participación integral: reaccionó + comentó)
    react_emp = Interaction(
        id=uuid.uuid4(),
        publication_id=pub.id,
        platform_id=plat.id,
        interaction_type="LIKE",
        reaction_type="LOVE",
        external_interaction_id="react_emp_01",
        external_author_id=emp.employee_id,
        external_author_name=f"{emp.first_name} {emp.last_name}",
        captured_at=datetime.now(UTC),
        data_origin_type=DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value,
    )
    async_db.add(react_emp)
    await async_db.flush()

    ver_react = Verification(
        interaction_id=react_emp.id,
        employee_id=emp.employee_id,
        verification_status=VerificationStatus.CONFIRMED.value,
        verification_method="AUTOMATIC_SYNC_MATCHER",
        explanation="Cotejo automático de reacción",
    )
    async_db.add(ver_react)

    # 5. Comentario 2: Emitido por un ciudadano externo (sin verificación)
    comm_cit = Interaction(
        id=uuid.uuid4(),
        publication_id=pub.id,
        platform_id=plat.id,
        interaction_type="COMMENT",
        external_interaction_id="comm_citizen_01",
        external_author_id="fb_citizen_44",
        external_author_name="Vecino Alteño",
        content_text="Por favor también atiendan la avenida principal.",
        captured_at=datetime.now(UTC),
        data_origin_type=DataOriginType.CITIZEN_COMMENT_ON_OFFICIAL.value,
    )
    async_db.add(comm_cit)
    await async_db.commit()

    # 6. Comprobar Overview KPIs
    overview = await AnalyticsService.get_overview(db=async_db, current_user=super_admin)
    assert overview.kpis.total_comments == 2
    assert overview.kpis.total_employee_comments == 1
    assert overview.kpis.total_citizen_comments == 1
    assert overview.kpis.employees_with_comments == 1
    assert overview.kpis.employees_with_both == 1
    assert overview.kpis.comment_participation_rate == 100.0

    # 7. Comprobar Lista Auditada de Comentarios (GET /analytics/comments)
    # 7a. Todos los comentarios
    all_comms = await AnalyticsService.get_comments_list(db=async_db, current_user=super_admin)
    assert all_comms.total == 2
    assert all_comms.total_employee_comments == 1
    assert all_comms.total_citizen_comments == 1

    # 7b. Filtrar solo funcionarios
    emp_comms = await AnalyticsService.get_comments_list(db=async_db, current_user=super_admin, author_type="EMPLOYEES_ONLY")
    assert emp_comms.total == 1
    first_item = emp_comms.items[0]
    assert first_item.author.is_employee is True
    assert first_item.author.employee_id == emp.employee_id
    assert first_item.associated_reaction == "LOVE"  # Cruzado con su reacción LOVE
    assert first_item.epistemic_status == "CONFIRMED"

    # 7c. Filtrar solo ciudadanos
    cit_comms = await AnalyticsService.get_comments_list(db=async_db, current_user=super_admin, author_type="CITIZENS_ONLY")
    assert cit_comms.total == 1
    assert cit_comms.items[0].author.is_employee is False
    assert cit_comms.items[0].epistemic_status == "OBSERVED"

    # 8. Comprobar Tabla de Funcionarios (get_employees_table)
    table = await AnalyticsService.get_employees_table(db=async_db, current_user=super_admin)
    emp_row = next(i for i in table.items if i.employee_id == emp.employee_id)
    assert emp_row.has_commented is True
    assert emp_row.has_both is True
    assert emp_row.total_comments == 1
    assert len(emp_row.comments) == 1
    assert "Excelente gestión" in emp_row.comments[0].comment_text


@pytest.mark.asyncio
async def test_analytics_area_isolation_and_dynamic_rankings(async_db: AsyncSession, super_admin: User):
    """
    Verifica que al filtrar por Secretaría, Dirección o Unidad:
    1. Las métricas y KPIs no mezclen totales globales (comentarios ciudadanos externos o de otras secretarías).
    2. El ranking adapte su dimensión:
       - Si se filtra por Dirección -> rankea sus Unidades Operativas (UNIDAD).
       - Si se filtra por Unidad -> rankea sus Funcionarios (FUNCIONARIO).
    """
    # 1. Crear estructura organizativa
    sec_despacho = "Despacho Alcalde"
    dir_com = OrganizationalUnit(id=uuid.uuid4(), name="Dirección de Comunicación", code="DIR-COM-TEST")
    unit_prensa = OrganizationalUnit(id=uuid.uuid4(), name="Unidad de Prensa", code="U-PRENSA-TEST", parent_id=dir_com.id)
    unit_imagen = OrganizationalUnit(id=uuid.uuid4(), name="Unidad de Imagen Corporativa", code="U-IMG-TEST", parent_id=dir_com.id)
    async_db.add_all([dir_com, unit_prensa, unit_imagen])

    # 2. Empleados en dos unidades distintas de la misma dirección
    emp_prensa = Employee(
        employee_id="EMP-PRENSA-01",
        first_name="Carla",
        last_name="Flores",
        document_number_encrypted="enc_cf",
        document_hash="hash_cf",
        status="ACTIVE",
        direction_name="Dirección de Comunicación",
        organizational_unit_id=unit_prensa.id,
    )
    emp_imagen = Employee(
        employee_id="EMP-IMG-01",
        first_name="Rodrigo",
        last_name="Vargas",
        document_number_encrypted="enc_rv",
        document_hash="hash_rv",
        status="ACTIVE",
        direction_name="Dirección de Comunicación",
        organizational_unit_id=unit_imagen.id,
    )
    async_db.add_all([emp_prensa, emp_imagen])
    await async_db.commit()

    # 3. Publicación y Comentarios
    plat = (await async_db.execute(select(SocialPlatform).where(SocialPlatform.name == "FACEBOOK"))).scalar_one()
    pub = Publication(
        platform_id=plat.id,
        external_post_id="post_isolation_test",
        content_text="Post institucional de prueba",
        published_at=datetime.now(UTC),
        is_monitored=True,
    )
    async_db.add(pub)
    await async_db.commit()

    # Comentario del empleado de Prensa
    comm_emp = Interaction(
        id=uuid.uuid4(),
        publication_id=pub.id,
        platform_id=plat.id,
        interaction_type="COMMENT",
        external_interaction_id="comm_emp_prensa",
        external_author_id=emp_prensa.employee_id,
        external_author_name="Carla Flores",
        content_text="Apoyo total de la Unidad de Prensa",
        captured_at=datetime.now(UTC),
        data_origin_type=DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value,
    )
    # Comentario de un ciudadano ajeno
    comm_cit = Interaction(
        id=uuid.uuid4(),
        publication_id=pub.id,
        platform_id=plat.id,
        interaction_type="COMMENT",
        external_interaction_id="comm_citizen_ext",
        external_author_id="fb_cit_999",
        external_author_name="Ciudadano Externo",
        content_text="Comentario general sin pertenecer a la alcaldía",
        captured_at=datetime.now(UTC),
        data_origin_type=DataOriginType.CITIZEN_COMMENT_ON_OFFICIAL.value,
    )
    async_db.add_all([comm_emp, comm_cit])
    await async_db.flush()

    ver = Verification(
        interaction_id=comm_emp.id,
        employee_id=emp_prensa.employee_id,
        verification_status=VerificationStatus.CONFIRMED.value,
        verification_method="AUTOMATIC_SYNC_MATCHER",
        explanation="Cotejo exitoso",
    )
    async_db.add(ver)
    await async_db.commit()

    # A. Vista Global (Sin filtros): Debe mostrar el total consolidado (2 comentarios: 1 funcionario + 1 ciudadano)
    res_global = await AnalyticsService.get_overview(db=async_db, current_user=super_admin)
    assert res_global.kpis.total_comments == 2
    assert res_global.kpis.total_employee_comments == 1
    assert res_global.kpis.total_citizen_comments == 1
    assert res_global.ranking_dimension == "DIRECCION"

    # B. Vista Aislada por Dirección: Debe reflejar SOLO la Dirección de Comunicación (1 comentario, 0 ciudadanos ajenos)
    res_dir = await AnalyticsService.get_overview(
        db=async_db,
        current_user=super_admin,
        direction="Dirección de Comunicación",
    )
    assert res_dir.kpis.total_comments == 1
    assert res_dir.kpis.total_employee_comments == 1
    assert res_dir.kpis.total_citizen_comments == 0
    # Al filtrar por Dirección, el ranking debe desglosar las UNIDADES OPERATIVAS de esa dirección
    assert res_dir.ranking_dimension == "UNIDAD"
    assert "Unidades Operativas" in res_dir.ranking_title
    ranking_units = [item.direction for item in res_dir.direction_rankings]
    assert "Unidad de Prensa" in ranking_units or "Unidad de Imagen Corporativa" in ranking_units

    # C. Vista Aislada por Unidad: Debe desglosar los FUNCIONARIOS de esa unidad
    res_unit = await AnalyticsService.get_overview(
        db=async_db,
        current_user=super_admin,
        direction="Dirección de Comunicación",
        unit="Unidad de Prensa",
    )
    assert res_unit.kpis.total_employees == 1
    assert res_unit.ranking_dimension == "FUNCIONARIO"
    assert "Funcionarios" in res_unit.ranking_title
    assert "Carla Flores" in res_unit.direction_rankings[0].direction


