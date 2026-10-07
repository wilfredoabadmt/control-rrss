"""
Pruebas de cotejo masivo de reacciones, matriz de actividades y deduplicación — GAMEA Social Monitor
Cubre: importación de nombres pegados del diálogo de reacciones de Facebook,
inclusión de publicaciones verificadas fuera de la ventana reciente,
fusión de duplicados canónicos de Meta y exclusión de autores anónimos.
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from modules.employees.models import Employee
from modules.iam.models import User
from modules.interactions.matcher import InteractionMatcher, MatchStatus
from modules.interactions.models import Interaction
from modules.interactions.router import list_interaction_users
from modules.monitoring.schemas import ImportReactionsBatchRequest
from modules.monitoring.service import MonitoringHubService
from modules.publications.models import Publication
from modules.publications.schemas import PublicationCreate
from modules.publications.service import PublicationService
from modules.shared.enums import DataOriginType, VerificationStatus
from modules.social_accounts.models import SocialPlatform
from modules.verification.models import Verification
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def mock_user() -> User:
    return User(
        id=uuid.uuid4(),
        email="comunicacion@elalto.gob.bo",
        full_name="Auditor de Comunicación",
        password_hash="hash",
    )


async def _facebook_platform(db: AsyncSession) -> SocialPlatform:
    stmt = select(SocialPlatform).where(SocialPlatform.name == "FACEBOOK")
    return (await db.execute(stmt)).scalar_one()


async def _add_employee(db: AsyncSession, employee_id: str, first_name: str, last_name: str) -> Employee:
    emp = Employee(
        employee_id=employee_id,
        first_name=first_name,
        last_name=last_name,
        document_number_encrypted="enc",
        document_hash="hash",
        status="ACTIVE",
    )
    db.add(emp)
    await db.commit()
    return emp


async def _count_publications(db: AsyncSession) -> int:
    return (await db.execute(select(func.count(Publication.id)))).scalar_one()


# -----------------------------------------------------------------------------
# 1. Importación masiva de reacciones con cotejo tolerante de nombres
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_import_reactions_batch_matches_partial_names(async_db: AsyncSession, mock_user: User):
    """
    Los nombres pegados del diálogo de Facebook llegan con un solo apellido o con
    nombres compuestos incompletos: el cruce debe resolverlos y reportar los que
    no pertenecen a la nómina en lugar de descartarlos en silencio.
    """
    plat = await _facebook_platform(async_db)
    await _add_employee(async_db, "EMP-001", "William Rodolfo", "Choque Mamani")
    await _add_employee(async_db, "EMP-002", "Pamela", "Arce Trujillo")
    await _add_employee(async_db, "EMP-003", "Ana", "Lopez Flores")
    await _add_employee(async_db, "EMP-004", "Ana", "Lopez Quispe")

    pub = Publication(
        platform_id=plat.id,
        external_post_id="1612864202296619_1417185383929434",
        content_text="Publicación institucional",
        is_monitored=True,
    )
    async_db.add(pub)
    await async_db.commit()

    res = await MonitoringHubService.import_reactions_batch(
        async_db,
        ImportReactionsBatchRequest(
            publication_id=pub.id,
            raw_text="William Choque\nPamela Arce\nJuan Ciudadano Comun\nAna Lopez",
        ),
        mock_user,
    )

    assert res.matched_count == 2
    matched_ids = {m.employee_id for m in res.matched_employees}
    assert matched_ids == {"EMP-001", "EMP-002"}
    assert "Juan Ciudadano Comun" in res.unmatched_names
    assert "Ana Lopez" in res.ambiguous_names
    assert {m.match_reason for m in res.matched_employees} == {"TOKENS", "EXACT"}

    # Las reacciones importadas quedaron registradas y verificadas
    interactions = list((await async_db.execute(select(Interaction))).scalars().all())
    assert len(interactions) == 2
    assert all(i.reaction_type == "LIKE" for i in interactions)
    verifications = list((await async_db.execute(select(Verification))).scalars().all())
    assert {v.employee_id for v in verifications} == {"EMP-001", "EMP-002"}
    assert all(v.verification_status == VerificationStatus.CONFIRMED.value for v in verifications)


# -----------------------------------------------------------------------------
# 2. La matriz no oculta publicaciones con actividad verificada
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_matrix_includes_verified_publications_outside_recent_window(
    async_db: AsyncSession, mock_user: User
):
    """REQ-MON: la ventana reciente no puede ocultar publicaciones ya auditadas."""
    plat = await _facebook_platform(async_db)
    emp = await _add_employee(async_db, "EMP-101", "Patricia", "Flores Callisaya")

    # 17 publicaciones: la ventana por defecto (15) deja fuera las 2 más antiguas
    oldest: Publication | None = None
    for i in range(17):
        pub = Publication(
            platform_id=plat.id,
            external_post_id=f"1612864202296619_{1000 + i}",
            content_text=f"Publicación {i}",
            published_at=datetime(2026, 3, 1, 12, 0, tzinfo=UTC) + timedelta(days=i),
            is_monitored=True,
        )
        async_db.add(pub)
        if i == 0:
            oldest = pub
    await async_db.commit()
    assert oldest is not None

    # Actividad verificada únicamente en la publicación más antigua
    interaction = Interaction(
        publication_id=oldest.id,
        platform_id=plat.id,
        interaction_type="COMMENT",
        external_interaction_id="comm_old_001",
        external_author_id=emp.employee_id,
        external_author_name="Patricia Flores Callisaya",
        content_text="Comentario verificado en publicación antigua",
        data_origin_type=DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value,
    )
    async_db.add(interaction)
    await async_db.flush()
    async_db.add(
        Verification(
            interaction_id=interaction.id,
            employee_id=emp.employee_id,
            verification_status=VerificationStatus.CONFIRMED.value,
            verification_method="BATCH_REACTION_MATCHER",
            verified_at=datetime.now(UTC),
            verified_by_user_id=str(mock_user.id),
            explanation="Verificación de prueba",
        )
    )
    await async_db.commit()

    matrix = await MonitoringHubService.get_activity_matrix(async_db)

    # 15 de la ventana + la publicación antigua verificada (la 2da antigua queda fuera)
    assert matrix.summary.total_publications_evaluated == 16

    row = next((r for r in matrix.rows if r.employee_id == emp.employee_id), None)
    assert row is not None
    assert row.has_participated is True
    assert row.total_comments == 1
    assert len(row.posts) == 16


# -----------------------------------------------------------------------------
# 3. Duplicados canónicos de Meta en la matriz
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_matrix_merges_canonical_duplicate_publications(async_db: AsyncSession):
    """Un mismo post de Meta registrado como id numérico y como id completo no debe partirse en dos."""
    plat = await _facebook_platform(async_db)
    async_db.add(
        Publication(
            platform_id=plat.id,
            external_post_id="1417185383929434",
            content_text="Versión id numérico",
            published_at=datetime(2026, 4, 1, 12, 0, tzinfo=UTC),
            is_monitored=True,
        )
    )
    async_db.add(
        Publication(
            platform_id=plat.id,
            external_post_id="1612864202296619_1417185383929434",
            content_text="Versión id completo",
            published_at=datetime(2026, 4, 2, 12, 0, tzinfo=UTC),
            is_monitored=True,
        )
    )
    async_db.add(
        Publication(
            platform_id=plat.id,
            external_post_id="1612864202296619_1417186590595980",
            content_text="Otra publicación",
            published_at=datetime(2026, 4, 3, 12, 0, tzinfo=UTC),
            is_monitored=True,
        )
    )
    await async_db.commit()

    matrix = await MonitoringHubService.get_activity_matrix(async_db)
    assert matrix.summary.total_publications_evaluated == 2


# -----------------------------------------------------------------------------
# 4. Alta de publicaciones sin duplicar equivalentes de Meta
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_publication_is_idempotent_for_canonical_ids(async_db: AsyncSession, mock_user: User):
    """REQ-PUB-002 / Principio XI: formas equivalentes de un id de Meta no crean dos filas."""
    before = await _count_publications(async_db)

    first = await PublicationService.create_publication(
        async_db,
        PublicationCreate(platform_id="FACEBOOK", external_post_id="1417186590595980"),
        mock_user,
    )
    second = await PublicationService.create_publication(
        async_db,
        PublicationCreate(
            platform_id="FACEBOOK",
            external_post_id="1612864202296619_1417186590595980",
        ),
        mock_user,
    )

    assert first.id == second.id
    assert await _count_publications(async_db) == before + 1

    # La URL con el id completo de Meta debe reconocer la publicación existente
    found = await PublicationService.find_existing_publication(
        async_db, first.platform_id, "1612864202296619_1417186590595980"
    )
    assert found is not None
    assert found.id == first.id


# -----------------------------------------------------------------------------
# 5. Autores anónimos: NOT_OBSERVABLE y fuera del padrón de usuarios
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_anonymous_authors_are_not_observable_and_not_listed(
    async_db: AsyncSession, mock_user: User
):
    """REQ-INT-003 / BR-INT-009: los autores anónimos no se atribuyen ni aparecen como personas."""
    plat = await _facebook_platform(async_db)
    await _add_employee(async_db, "EMP-201", "Gonzalo", "Aruquipa Mamani")

    pub = Publication(
        platform_id=plat.id,
        external_post_id="1612864202296619_1417999999999999",
        content_text="Publicación con reacciones anónimas",
        is_monitored=True,
    )
    async_db.add(pub)
    await async_db.flush()

    anon = Interaction(
        publication_id=pub.id,
        platform_id=plat.id,
        interaction_type="LIKE",
        external_interaction_id="react_anon_001",
        external_author_id="anonimo",
        external_author_name="Usuario Facebook",
        reaction_type="LIKE",
        data_origin_type=DataOriginType.THIRD_PARTY_OBSERVATION.value,
    )
    citizen = Interaction(
        publication_id=pub.id,
        platform_id=plat.id,
        interaction_type="COMMENT",
        external_interaction_id="comm_citizen_001",
        external_author_id="fb_citizen_777",
        external_author_name="Luis Comun",
        content_text="Excelente gestión",
        data_origin_type=DataOriginType.CITIZEN_COMMENT_ON_OFFICIAL.value,
    )
    async_db.add_all([anon, citizen])
    await async_db.commit()

    res_anon = await InteractionMatcher.match_interaction(async_db, anon)
    assert res_anon.status == MatchStatus.NOT_OBSERVABLE

    users = await list_interaction_users(
        publication_id=None,
        platform_id=None,
        interaction_type=None,
        db=async_db,
        _=mock_user,
    )
    author_ids = [u.external_author_id for u in users]
    assert "anonimo" not in author_ids
    assert "fb_citizen_777" in author_ids
