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
