"""
Servicio de Auditoría — GAMEA Social Monitor
Principio X: Registro de Auditoría Inmutable
"""

from typing import Any

import structlog
from core.audit.models import AuditEvent
from core.logging_config import get_correlation_id
from modules.shared.enums import AuditAction
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger(__name__)


async def record_audit_event(
    db: AsyncSession,
    action: AuditAction | str,
    entity_name: str,
    entity_id: str | None = None,
    user_id: str | None = None,
    user_email: str | None = None,
    previous_state: Any | None = None,
    new_state: Any | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    details: Any | None = None,
    correlation_id: str | None = None,
) -> AuditEvent:
    """
    Registra de manera atómica e inmutable un evento de auditoría.
    """
    cid = correlation_id or get_correlation_id()
    action_str = action.value if isinstance(action, AuditAction) else str(action)

    event = AuditEvent(
        action=action_str,
        entity_name=entity_name,
        entity_id=str(entity_id) if entity_id else None,
        user_id=str(user_id) if user_id else None,
        user_email=user_email,
        previous_state=previous_state,
        new_state=new_state,
        correlation_id=cid,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
    )
    db.add(event)
    await db.flush()

    logger.info(
        "audit_event_recorded",
        action=action_str,
        entity_name=entity_name,
        entity_id=entity_id,
        user_id=user_id,
        correlation_id=cid,
    )
    return event
