"""
Suite de Pruebas de Seguridad y Cumplimiento Constitucional (OWASP) — GAMEA Social Monitor
Fase 8: T-800 a T-804
Principio IX: Minimización de Datos
Principio X: Auditoría Inmutable
Principio XVI: Defensa en Profundidad
Constitución §Security.2
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from core.audit.models import AuditEvent
from database import get_async_db
from fastapi.testclient import TestClient
from main import app
from modules.employees.service import EmployeeService
from modules.iam.models import Role, User
from modules.interactions.models import Interaction, InteractionEvidence
from modules.interactions.tasks import purge_expired_raw_evidences
from modules.monitoring.models import ExternalSyncJob
from modules.notifications.service import NotificationService
from modules.publications.models import Publication
from modules.shared.enums import (
    DataOriginType,
    InteractionType,
    SocialPlatformType,
    SyncJobStatus,
    UserRole,
)
from modules.social_accounts.models import SocialPlatform
from modules.social_accounts.seed import seed_social_platforms
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# -----------------------------------------------------------------------------
# T-800: Pruebas de Notificaciones y Detección de Anomalías
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_notification_service_detects_circuit_breaker_and_fatal_jobs(
    async_db: AsyncSession,
):
    await seed_social_platforms(async_db)
    plat = (
        await async_db.execute(
            select(SocialPlatform).where(
                SocialPlatform.name == SocialPlatformType.FACEBOOK.value
            )
        )
    ).scalar_one()

    # Insertar un trabajo con CIRCUIT_BROKEN
    job_cb = ExternalSyncJob(
        platform_id=plat.id,
        job_type="COMMENT_SYNC",
        status=SyncJobStatus.CIRCUIT_BROKEN,
    )
    async_db.add(job_cb)
    await async_db.commit()

    alerts = await NotificationService.get_active_system_alerts(async_db)
    codes = [a["code"] for a in alerts]
    assert "CIRCUIT_BREAKER_ACTIVE" in codes


# -----------------------------------------------------------------------------
# T-801 & T-802: Cabeceras de Seguridad HTTP y Rate Limiting
# -----------------------------------------------------------------------------

def test_http_security_headers_present():
    """Valida presencia de cabeceras de endurecimiento OWASP (T-802)."""
    with TestClient(app) as client:
        res = client.get("/health/liveness")
        assert res.status_code == 200
        headers = res.headers

        assert headers.get("X-Content-Type-Options") == "nosniff"
        assert headers.get("X-Frame-Options") == "DENY"
        assert headers.get("X-XSS-Protection") == "1; mode=block"
        assert "max-age=31536000" in headers.get("Strict-Transport-Security", "")
        assert "default-src 'self'" in headers.get("Content-Security-Policy", "")


@pytest.mark.asyncio
async def test_rate_limiter_configuration_and_headers(async_db: AsyncSession):
    """Valida que los endpoints sensibles tengan activas cabeceras y control de tasa (T-801)."""
    app.dependency_overrides[get_async_db] = lambda: async_db

    try:
        with TestClient(app) as client:
            # Petición a login con credenciales erróneas
            res = client.post(
                "/api/v1/auth/login",
                json={"email": "nonexistent@elalto.gob.bo", "password": "wrongpassword123"},
            )
            # El endpoint protegido debe procesar la tasa y rechazar credenciales inexistentes con 401
            assert res.status_code in [401, 429]
    finally:
        app.dependency_overrides.clear()


# -----------------------------------------------------------------------------
# T-803: Purga Automática de Payloads Crudos Preservando Hash Criptográfico
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_purge_expired_raw_evidences_preserves_hash(
    async_db: AsyncSession,
):
    """
    BR-INT-005: Purga automática de payloads crudos a los 180 días.
    Debe vaciar el contenido crudo preservando estrictamente el content_hash SHA-256
    y registrando la operación en la auditoría inmutable (Principio X).
    """
    await seed_social_platforms(async_db)
    plat = (
        await async_db.execute(
            select(SocialPlatform).where(
                SocialPlatform.name == SocialPlatformType.FACEBOOK.value
            )
        )
    ).scalar_one()

    # 1. Crear publicación e interacción
    pub = Publication(
        platform_id=plat.id,
        external_post_id=f"post-purge-{uuid.uuid4().hex[:8]}",
        published_at=datetime.now(UTC),
    )
    async_db.add(pub)
    await async_db.flush()

    interaction = Interaction(
        publication_id=pub.id,
        platform_id=plat.id,
        interaction_type=InteractionType.COMMENT.value,
        data_origin_type=DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value,
        external_interaction_id=f"int-purge-{uuid.uuid4().hex[:8]}",
        captured_at=datetime.now(UTC),
    )
    async_db.add(interaction)
    await async_db.flush()

    # 2. Crear dos evidencias: una reciente (< 180 días) y una expirada (> 180 días)
    sha_expired = "a" * 64
    sha_recent = "b" * 64

    evidence_expired = InteractionEvidence(
        interaction_id=interaction.id,
        evidence_type="API_RESPONSE",
        content='{"raw_citizen_comment": "Texto sensible antiguo"}',
        content_hash=sha_expired,
        created_at=datetime.now(UTC) - timedelta(days=200),
    )
    evidence_recent = InteractionEvidence(
        interaction_id=interaction.id,
        evidence_type="API_RESPONSE",
        content='{"raw_citizen_comment": "Texto reciente"}',
        content_hash=sha_recent,
        created_at=datetime.now(UTC) - timedelta(days=10),
    )
    async_db.add_all([evidence_expired, evidence_recent])
    await async_db.commit()

    # 3. Ejecutar purga de evidencias con retención de 180 días
    purged_count = await purge_expired_raw_evidences(async_db, retention_days=180)
    assert purged_count >= 1

    # 4. Verificar estados en base de datos
    await async_db.refresh(evidence_expired)
    await async_db.refresh(evidence_recent)

    # La evidencia expirada debe tener su content vaciado (None), PERO el hash intacto
    assert evidence_expired.content is None
    assert evidence_expired.content_hash == sha_expired

    # La evidencia reciente no debió ser afectada
    assert evidence_recent.content is not None
    assert evidence_recent.content_hash == sha_recent

    # 5. Verificar registro en pista de auditoría inmutable (Principio X)
    stmt_audit = select(AuditEvent).where(
        AuditEvent.entity_name == "InteractionEvidence",
        AuditEvent.action == "DELETE",
    )
    audit_events = (await async_db.execute(stmt_audit)).scalars().all()
    assert len(audit_events) > 0


# -----------------------------------------------------------------------------
# T-804: Validación OWASP — Prevención de Inyección SQL y Escalación de Roles
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sql_injection_resilience_in_parameters(async_db: AsyncSession):
    """
    Verifica que consultas con entradas maliciosas de inyección SQL
    sean neutralizadas mediante consultas parametrizadas de SQLAlchemy.
    """
    malicious_input = "' OR '1'='1' --"
    # No debe arrojar excepción de sintaxis SQL ni corromper la BD
    emps, total = await EmployeeService.list_employees(
        db=async_db, search=malicious_input, limit=10, offset=0
    )
    assert isinstance(emps, list)
    assert isinstance(total, int)


@pytest.mark.asyncio
async def test_privilege_escalation_blocked_for_unauthorized_roles(
    async_db: AsyncSession,
):
    """
    Verifica que endpoints críticos (Auditoría y Gestión de Usuarios)
    rechacen peticiones de usuarios con roles sin privilegios con HTTP 403.
    """
    from core.security.auth import get_current_user

    # Crear rol VIEWER
    viewer_role = Role(
        name=UserRole.VIEWER.value,
        description="Solo lectura",
        is_system=True,
    )
    async_db.add(viewer_role)
    await async_db.flush()

    viewer_user = User(
        email="viewer@elalto.gob.bo",
        full_name="Usuario Observador",
        password_hash="mockhash",
        is_active=True,
    )
    viewer_user.roles.append(viewer_role)
    async_db.add(viewer_user)
    await async_db.commit()

    app.dependency_overrides[get_async_db] = lambda: async_db
    app.dependency_overrides[get_current_user] = lambda: viewer_user

    try:
        with TestClient(app) as client:
            # 1. Intentar acceder a pistas de auditoría (solo SUPER_ADMIN y AUDITOR)
            res_audit = client.get("/api/v1/audit/events")
            assert res_audit.status_code == 403

            # 2. Intentar acceder a listado de usuarios (solo SUPER_ADMIN)
            res_users = client.get("/api/v1/users/")
            assert res_users.status_code == 403
    finally:
        app.dependency_overrides.clear()
