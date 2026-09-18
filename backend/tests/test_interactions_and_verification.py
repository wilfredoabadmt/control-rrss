"""
Pruebas de Interacciones, Cruce de Funcionarios, Verificación Epistémica y Máquina de Estados
Fase 4 — GAMEA Social Monitor
Principio V: No Inventar Datos
Principio VI: Proveniencia del Dato
Principio XV: Ingesta Idempotente
Principio XXIII: Estados Canónicos Estrictos
Principio XXVIII: Explicabilidad
REQ-INT-001, REQ-INT-002, REQ-INT-003, REQ-VER-001 a REQ-VER-004, REQ-MON-002
"""

import uuid

import pytest
import pytest_asyncio
from database import Base
from modules.employees.models import Employee
from modules.iam.models import User
from modules.interactions.matcher import InteractionMatcher, MatchStatus
from modules.interactions.models import Interaction
from modules.interactions.processor import InteractionProcessor
from modules.interactions.schemas import InteractionCreate
from modules.monitoring.models import ExternalSyncJob
from modules.monitoring.state_machine import SyncStateMachine
from modules.publications.models import Publication
from modules.shared.enums import (
    BindingStatus,
    CaptureMethod,
    DataOriginType,
    InteractionType,
    SocialPlatformType,
    SyncJobStatus,
    VerificationStatus,
)
from modules.shared.exceptions import InvalidStateTransitionException, ValidationException
from modules.social_accounts.models import SocialAccount, SocialPlatform
from modules.social_accounts.seed import seed_social_platforms
from modules.verification.engine import VerificationEngine
from modules.verification.schemas import ManualVerificationRequest
from modules.verification.service import VerificationService
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        await seed_social_platforms(session)

        # 1. Crear funcionario activo de prueba
        emp = Employee(
            employee_id="FUNC-2026-042",
            first_name="Ramiro",
            last_name="Mamani",
            document_number_encrypted="enc_doc",
            document_hash="hash_doc",
            status="ACTIVE",
        )
        session.add(emp)

        # 2. Obtener plataforma Facebook
        plat = (await session.execute(
            SocialPlatform.__table__.select().where(SocialPlatform.name == SocialPlatformType.FACEBOOK.value)
        )).first()

        # 3. Vincular cuenta social activa
        acc = SocialAccount(
            employee_id="FUNC-2026-042",
            platform_id=plat.id,
            external_user_id="fb_author_999",
            current_username="ramiro.mamani.oficial",
            binding_status=BindingStatus.ACTIVE.value,
        )
        session.add(acc)

        # 4. Crear publicación monitoreada
        pub = Publication(
            id=uuid.uuid4(),
            platform_id=plat.id,
            external_post_id="post_alcaldia_2026",
            content_text="Inauguración de nuevo centro de salud en El Alto",
            is_monitored=True,
        )
        session.add(pub)

        await session.commit()
        yield session

    await engine.dispose()


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email="analista.verificador@elalto.gob.bo",
        full_name="Analista Verificación",
        password_hash="hash",
    )


# -----------------------------------------------------------------------------
# T-401: Ingesta Idempotente y Almacenamiento de Evidencia (REQ-INT-001 / REQ-INT-002)
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_interaction_ingestion_strict_idempotency(async_db: AsyncSession, mock_user: User):
    """
    REQ-INT-001 & Principio XV: 10 inserciones concurrentes/secuenciales del mismo payload
    deben producir exactamente 1 registro de interacción en base de datos.
    """
    pub = (await async_db.execute(Publication.__table__.select())).first()
    plat = (await async_db.execute(
        SocialPlatform.__table__.select().where(SocialPlatform.name == SocialPlatformType.FACEBOOK.value)
    )).first()

    raw_payload_sample = '{"comment_id": "comm_fb_12345", "text": "Excelente gestión alcaldesa", "from": {"id": "fb_author_999"}}'

    item = InteractionCreate(
        publication_id=pub.id,
        platform_id=plat.id,
        interaction_type=InteractionType.COMMENT.value,
        external_interaction_id="comm_fb_12345",
        external_author_id="fb_author_999",
        external_author_name="Ramiro Mamani",
        content_text="Excelente gestión alcaldesa",
        capture_method=CaptureMethod.POLLING.value,
        data_origin_type=DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value,
        raw_payload=raw_payload_sample,
    )

    first_int = await InteractionProcessor.process_interaction(async_db, item, str(mock_user.id))
    assert first_int.id is not None
    assert first_int.external_interaction_id == "comm_fb_12345"
    assert len(first_int.evidences) == 1
    assert first_int.evidences[0].content_hash is not None

    # Repetir 9 veces más la misma inserción
    for _ in range(9):
        dup_int = await InteractionProcessor.process_interaction(async_db, item, str(mock_user.id))
        assert dup_int.id == first_int.id

    # Comprobar que en la base de datos existe exactamente 1 registro
    total_count = (await async_db.execute(
        Interaction.__table__.select().where(Interaction.external_interaction_id == "comm_fb_12345")
    )).fetchall()
    assert len(total_count) == 1


# -----------------------------------------------------------------------------
# T-402: Motor de Cruce con Funcionarios (REQ-INT-003)
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_interaction_matcher_scenarios(async_db: AsyncSession):
    """
    REQ-INT-003 / BR-INT-006 a BR-INT-009:
    1. Autor coincide con cuenta activa -> MATCHED.
    2. Autor no registrado en nómina -> UNMATCHED.
    3. Sin identidad de autor (API restringida) -> NOT_OBSERVABLE.
    """
    pub = (await async_db.execute(Publication.__table__.select())).first()
    plat = (await async_db.execute(
        SocialPlatform.__table__.select().where(SocialPlatform.name == SocialPlatformType.FACEBOOK.value)
    )).first()

    # 1. Caso Match: fb_author_999
    match_int = Interaction(
        publication_id=pub.id,
        platform_id=plat.id,
        interaction_type="COMMENT",
        external_author_id="fb_author_999",
        data_origin_type=DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value,
    )
    res_match = await InteractionMatcher.match_interaction(async_db, match_int)
    assert res_match.status == MatchStatus.MATCHED
    assert res_match.employee is not None
    assert res_match.employee.employee_id == "FUNC-2026-042"

    # 2. Caso Unmatched: autor externo no registrado
    unmatch_int = Interaction(
        publication_id=pub.id,
        platform_id=plat.id,
        interaction_type="COMMENT",
        external_author_id="ciudadano_comun_777",
        data_origin_type=DataOriginType.CITIZEN_COMMENT_ON_OFFICIAL.value,
    )
    res_unmatch = await InteractionMatcher.match_interaction(async_db, unmatch_int)
    assert res_unmatch.status == MatchStatus.UNMATCHED
    assert res_unmatch.employee is None

    # 3. Caso Not Observable: external_author_id es None (ej. API restringida)
    anon_int = Interaction(
        publication_id=pub.id,
        platform_id=plat.id,
        interaction_type="LIKE",
        external_author_id=None,
        data_origin_type=DataOriginType.THIRD_PARTY_OBSERVATION.value,
    )
    res_anon = await InteractionMatcher.match_interaction(async_db, anon_int)
    assert res_anon.status == MatchStatus.NOT_OBSERVABLE
    assert res_anon.employee is None


# -----------------------------------------------------------------------------
# T-403: Motor de Verificación Automática (REQ-VER-001)
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_automatic_verification_flow(async_db: AsyncSession, mock_user: User):
    """
    REQ-VER-001: Verificación automática de interacción cruzada.
    """
    pub = (await async_db.execute(Publication.__table__.select())).first()
    plat = (await async_db.execute(
        SocialPlatform.__table__.select().where(SocialPlatform.name == SocialPlatformType.FACEBOOK.value)
    )).first()

    # Interacción de comentario del funcionario
    item = InteractionCreate(
        publication_id=pub.id,
        platform_id=plat.id,
        interaction_type=InteractionType.COMMENT.value,
        external_interaction_id="fb_comm_verified_auto",
        external_author_id="fb_author_999",
        content_text="Felicidades por la nueva avenida",
        data_origin_type=DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value,
    )
    interaction = await InteractionProcessor.process_interaction(async_db, item, str(mock_user.id))

    # Ejecutar motor de verificación
    verification = await VerificationEngine.verify_interaction(async_db, interaction)
    assert verification.id is not None
    assert verification.verification_status == VerificationStatus.CONFIRMED.value
    assert verification.employee_id == "FUNC-2026-042"
    assert verification.verification_method == "AUTOMATIC_CROSS_REFERENCE"
    assert "Interacción confirmada" in verification.explanation
    assert "FUNC-2026-042" in verification.explanation


# -----------------------------------------------------------------------------
# T-404 & T-405: Verificación Manual Asistida y Explicabilidad (REQ-VER-002 / REQ-VER-004)
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_manual_verification_and_consolidation(async_db: AsyncSession, mock_user: User):
    """
    REQ-VER-002: Verificación manual asistida con evidencia y auditoría (DECLARED_CONFIRMED).
    """
    pub = (await async_db.execute(Publication.__table__.select())).first()
    plat = (await async_db.execute(
        SocialPlatform.__table__.select().where(SocialPlatform.name == SocialPlatformType.FACEBOOK.value)
    )).first()

    # Interacción con from vacío (típico en TikTok o restricciones de Graph API)
    item = InteractionCreate(
        publication_id=pub.id,
        platform_id=plat.id,
        interaction_type=InteractionType.COMMENT.value,
        external_interaction_id="tt_comm_restricted_01",
        external_author_id=None,
        content_text="Comentario visualmente atribuido al funcionario",
        data_origin_type=DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value,
    )
    interaction = await InteractionProcessor.process_interaction(async_db, item, str(mock_user.id))

    # 1. Intento con estado inválido (ej. no DECLARED_*) debe fallar
    with pytest.raises(ValidationException):
        await VerificationService.manual_verification(
            async_db,
            ManualVerificationRequest(
                interaction_id=interaction.id,
                employee_id="FUNC-2026-042",
                status="CONFIRMED",  # Ilegal para flujo manual (BR-VER-004)
                evidence_note="Nota de evidencia",
            ),
            mock_user,
        )

    # 2. Verificación válida como DECLARED_CONFIRMED
    v_manual = await VerificationService.manual_verification(
        async_db,
        ManualVerificationRequest(
            interaction_id=interaction.id,
            employee_id="FUNC-2026-042",
            status=VerificationStatus.DECLARED_CONFIRMED.value,
            evidence_note="Revisión visual directa del comentario en TikTok y coincidencia con screenshot adjunto",
            evidence_content="base64_screenshot_hash_mock",
        ),
        mock_user,
    )
    assert v_manual.verification_status == VerificationStatus.DECLARED_CONFIRMED.value
    assert v_manual.employee_id == "FUNC-2026-042"
    assert v_manual.verification_method == "MANUAL_OPERATOR"
    assert v_manual.evidence_id is not None
    assert mock_user.email in v_manual.explanation

    # 3. Consultar estado consolidado (REQ-VER-003)
    consolidated = await VerificationService.get_consolidated_status(
        async_db,
        employee_id="FUNC-2026-042",
        publication_id=pub.id,
        interaction_type=InteractionType.COMMENT.value,
    )
    assert consolidated.status == VerificationStatus.DECLARED_CONFIRMED.value


# -----------------------------------------------------------------------------
# T-406: Máquina de Estados de Sincronización (REQ-MON-002 / Principio XXIII)
# -----------------------------------------------------------------------------

def test_sync_state_machine_valid_and_invalid_transitions():
    """
    REQ-MON-002: Transiciones válidas y rechazo estricto de transiciones ilegales.
    """
    job = ExternalSyncJob(
        id=uuid.uuid4(),
        platform_id=uuid.uuid4(),
        job_type="FETCH_COMMENTS",
        status=SyncJobStatus.PENDING.value,
    )

    # 1. PENDING -> QUEUED (Válido)
    SyncStateMachine.transition(job, SyncJobStatus.QUEUED)
    assert job.status == SyncJobStatus.QUEUED.value

    # 2. QUEUED -> RUNNING (Válido)
    SyncStateMachine.transition(job, SyncJobStatus.RUNNING)
    assert job.status == SyncJobStatus.RUNNING.value

    # 3. RUNNING -> PAUSED_RATE_LIMIT (Válido por HTTP 429)
    SyncStateMachine.transition(job, SyncJobStatus.PAUSED_RATE_LIMIT, error_details="Rate limit hit. Retry in 60s")
    assert job.status == SyncJobStatus.PAUSED_RATE_LIMIT.value
    assert job.error_details is not None

    # 4. PAUSED_RATE_LIMIT -> QUEUED (Re-encolado tras backoff)
    SyncStateMachine.transition(job, SyncJobStatus.QUEUED)
    assert job.status == SyncJobStatus.QUEUED.value

    # 5. QUEUED -> RUNNING -> FAILED_RETRYABLE (Fallo transitorio, retry_count incrementa)
    SyncStateMachine.transition(job, SyncJobStatus.RUNNING)
    SyncStateMachine.transition(job, SyncJobStatus.FAILED_RETRYABLE, error_details="Timeout de red")
    assert job.status == SyncJobStatus.FAILED_RETRYABLE.value
    assert job.retry_count == 1

    # 6. FAILED_RETRYABLE -> QUEUED -> RUNNING -> COMPLETED (Éxito terminal)
    SyncStateMachine.transition(job, SyncJobStatus.QUEUED)
    SyncStateMachine.transition(job, SyncJobStatus.RUNNING)
    SyncStateMachine.transition(job, SyncJobStatus.COMPLETED)
    assert job.status == SyncJobStatus.COMPLETED.value
    assert job.completed_at is not None

    # 7. COMPLETED -> PENDING (ILEGAL: Estado terminal no puede volver a PENDING)
    with pytest.raises(InvalidStateTransitionException) as exc_info:
        SyncStateMachine.transition(job, SyncJobStatus.PENDING)
    assert "no es posible pasar de 'COMPLETED' a 'PENDING'" in str(exc_info.value)
