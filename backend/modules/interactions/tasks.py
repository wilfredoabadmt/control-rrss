"""
Tareas Asíncronas de Interacciones y Purga de Evidencias — GAMEA Social Monitor
BR-INT-005: Purga automática de payloads crudos a los 180 días conservando hash SHA-256
Principio IX: Minimización de Datos
Principio X: Auditoría Inmutable
"""

from datetime import UTC, datetime, timedelta

from celery import shared_task
from core.audit.service import record_audit_event
from database import AsyncSessionLocal
from modules.interactions.models import InteractionEvidence
from modules.shared.enums import AuditAction
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession


async def purge_expired_raw_evidences(
    db: AsyncSession,
    retention_days: int = 180,
    actor_id: str | None = None,
) -> int:
    """
    Purga el payload crudo (`content`) de las evidencias que superen los `retention_days`.
    PRESERVA estrictamente el `content_hash` (SHA-256) garantizando verificabilidad perenne.
    """
    cutoff_date = datetime.now(UTC) - timedelta(days=retention_days)

    # Identificar registros a purgar
    stmt_select = select(InteractionEvidence.id).where(
        InteractionEvidence.created_at < cutoff_date,
        InteractionEvidence.content.isnot(None),
    )
    evidence_ids = (await db.execute(stmt_select)).scalars().all()
    purged_count = len(evidence_ids)

    if purged_count > 0:
        stmt_update = (
            update(InteractionEvidence)
            .where(InteractionEvidence.id.in_(evidence_ids))
            .values(content=None)
        )
        await db.execute(stmt_update)

        # Registrar en pista de auditoría inmutable (Principio X)
        await record_audit_event(
            db=db,
            action=AuditAction.DELETE,
            entity_name="InteractionEvidence",
            entity_id=f"batch_purge_{purged_count}_records",
            user_id=actor_id or "SYSTEM_CELERY_BEAT",
            details={
                "retention_days": retention_days,
                "purged_records_count": purged_count,
                "cutoff_date": cutoff_date.isoformat(),
                "policy": "BR-INT-005_HASH_PRESERVED",
            },
        )
        await db.commit()

    return purged_count


@shared_task(name="tasks.purge_expired_raw_evidences_task")
def purge_expired_evidences_task(retention_days: int = 180) -> dict:
    """
    Tarea Celery Beat periódica para cumplimiento de BR-INT-005.
    """
    import asyncio

    async def _runner():
        async with AsyncSessionLocal() as session:
            count = await purge_expired_raw_evidences(session, retention_days=retention_days)
            return {"purged_count": count, "retention_days": retention_days}

    return asyncio.run(_runner())
