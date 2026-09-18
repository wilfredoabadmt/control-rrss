"""
Router de Auditoría Inmutable — GAMEA Social Monitor
Principio X: Registro de Auditoría Inmutable
REQ-AUD-002: Consulta y Exportación de Auditoría
"""

import csv
import io
import uuid
from datetime import datetime
from typing import Any

from core.audit.models import AuditEvent
from core.pagination import PageResponse
from core.security.rbac import require_roles
from database import get_async_db
from dependencies import PaginationDep
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from modules.iam.models import User
from modules.shared.enums import UserRole
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

audit_router = APIRouter()


class AuditEventResponse(BaseModel):
    id: uuid.UUID
    timestamp_utc: datetime
    user_id: str | None = None
    user_email: str | None = None
    action: str
    entity_name: str
    entity_id: str | None = None
    previous_state: Any | None = None
    new_state: Any | None = None
    correlation_id: str
    ip_address: str | None = None
    user_agent: str | None = None
    details: Any | None = None

    model_config = {"from_attributes": True}


@audit_router.get("/events", response_model=PageResponse[AuditEventResponse])
async def list_audit_events(
    pagination: PaginationDep,
    user_id: str | None = Query(None, description="Filtrar por ID de usuario"),
    action: str | None = Query(None, description="Filtrar por acción (CREATE, UPDATE, LOGIN...)"),
    entity_name: str | None = Query(None, description="Filtrar por tipo de entidad"),
    entity_id: str | None = Query(None, description="Filtrar por ID de entidad"),
    correlation_id: str | None = Query(None, description="Filtrar por correlation_id"),
    from_date: datetime | None = Query(None, description="Fecha inicial UTC"),
    to_date: datetime | None = Query(None, description="Fecha final UTC"),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.AUDITOR)),
):
    """
    Consulta paginada de trazas de auditoría. Exclusivo para AUDITOR y SUPER_ADMIN.
    """
    query = select(AuditEvent)
    count_query = select(func.count()).select_from(AuditEvent)

    if user_id:
        query = query.where(AuditEvent.user_id == user_id)
        count_query = count_query.where(AuditEvent.user_id == user_id)
    if action:
        query = query.where(AuditEvent.action == action.upper())
        count_query = count_query.where(AuditEvent.action == action.upper())
    if entity_name:
        query = query.where(AuditEvent.entity_name == entity_name)
        count_query = count_query.where(AuditEvent.entity_name == entity_name)
    if entity_id:
        query = query.where(AuditEvent.entity_id == entity_id)
        count_query = count_query.where(AuditEvent.entity_id == entity_id)
    if correlation_id:
        query = query.where(AuditEvent.correlation_id == correlation_id)
        count_query = count_query.where(AuditEvent.correlation_id == correlation_id)
    if from_date:
        query = query.where(AuditEvent.timestamp_utc >= from_date)
        count_query = count_query.where(AuditEvent.timestamp_utc >= from_date)
    if to_date:
        query = query.where(AuditEvent.timestamp_utc <= to_date)
        count_query = count_query.where(AuditEvent.timestamp_utc <= to_date)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(AuditEvent.timestamp_utc.desc()).offset(pagination.offset).limit(pagination.limit)
    result = await db.execute(query)
    events = list(result.scalars().all())

    items = [AuditEventResponse.model_validate(e) for e in events]
    return PageResponse.create(items=items, total=total, page=pagination.page, page_size=pagination.page_size)


@audit_router.get("/export")
async def export_audit_events_csv(
    action: str | None = None,
    entity_name: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.AUDITOR)),
):
    """
    Exportación de eventos de auditoría a archivo CSV descargable.
    """
    query = select(AuditEvent).order_by(AuditEvent.timestamp_utc.desc()).limit(5000)

    if action:
        query = query.where(AuditEvent.action == action.upper())
    if entity_name:
        query = query.where(AuditEvent.entity_name == entity_name)
    if from_date:
        query = query.where(AuditEvent.timestamp_utc >= from_date)
    if to_date:
        query = query.where(AuditEvent.timestamp_utc <= to_date)

    result = await db.execute(query)
    events = list(result.scalars().all())

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id",
        "timestamp_utc",
        "user_id",
        "user_email",
        "action",
        "entity_name",
        "entity_id",
        "correlation_id",
        "ip_address",
    ])

    for e in events:
        writer.writerow([
            str(e.id),
            e.timestamp_utc.isoformat(),
            e.user_id or "",
            e.user_email or "",
            e.action,
            e.entity_name,
            e.entity_id or "",
            e.correlation_id,
            e.ip_address or "",
        ])

    output.seek(0)
    filename = f"audit_events_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
