"""
Servicio de Notificaciones y Alertas Internas — GAMEA Social Monitor
REQ-NOT-001, REQ-NOT-002
"""

from datetime import UTC, datetime, timedelta

from modules.monitoring.models import ExternalSyncJob
from modules.shared.enums import SyncJobStatus
from modules.verification.models import Verification
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


class NotificationService:
    @staticmethod
    async def get_active_system_alerts(db: AsyncSession) -> list[dict[str, str]]:
        """
        Detecta anomalías operativas, trabajos fallidos y advertencias de seguridad:
        - Circuit Breakers activados (OPEN / HALF_OPEN).
        - Trabajos en Dead Letter Queue (DLQ) o fallo irrecuperable (FAILED_FATAL).
        - Verificaciones manuales acumuladas en espera.
        """
        alerts: list[dict[str, str]] = []

        # 1. Comprobar Circuit Breakers rotos
        stmt_cb = select(func.count(ExternalSyncJob.id)).where(
            ExternalSyncJob.status == SyncJobStatus.CIRCUIT_BROKEN
        )
        broken_cb_count = (await db.execute(stmt_cb)).scalar() or 0
        if broken_cb_count > 0:
            alerts.append({
                "level": "ERROR",
                "code": "CIRCUIT_BREAKER_ACTIVE",
                "message": (
                    f"Atención: {broken_cb_count} adaptadores con Circuit Breaker activado "
                    "por fallos repetidos en APIs externas."
                ),
            })

        # 2. Comprobar trabajos con fallo fatal en las últimas 24 horas
        yesterday = datetime.now(UTC) - timedelta(hours=24)
        stmt_fatal = select(func.count(ExternalSyncJob.id)).where(
            ExternalSyncJob.status == SyncJobStatus.FAILED_FATAL,
            ExternalSyncJob.started_at >= yesterday,
        )
        fatal_jobs_count = (await db.execute(stmt_fatal)).scalar() or 0
        if fatal_jobs_count > 0:
            alerts.append({
                "level": "WARNING",
                "code": "SYNC_FAILED_FATAL",
                "message": (
                    f"Se registraron {fatal_jobs_count} trabajos de sincronización en estado FAILED_FATAL (DLQ) "
                    "en las últimas 24 horas."
                ),
            })

        # 3. Comprobar volumen de verificaciones pendientes
        stmt_pending = select(func.count(Verification.id)).where(
            Verification.verification_status == "PENDING"
        )
        pending_verif_count = (await db.execute(stmt_pending)).scalar() or 0
        if pending_verif_count > 50:
            alerts.append({
                "level": "INFO",
                "code": "PENDING_VERIFICATIONS_HIGH",
                "message": f"Cola de verificación: {pending_verif_count} interacciones pendientes de revisión.",
            })

        return alerts
