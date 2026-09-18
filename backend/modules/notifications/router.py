"""
Router de Alertas y Notificaciones Internas — GAMEA Social Monitor
REQ-NOT-001, REQ-NOT-002
"""

from core.security.auth import get_current_user
from database import get_async_db
from fastapi import APIRouter, Depends
from modules.iam.models import User
from modules.notifications.service import NotificationService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/notifications", tags=["Notifications & Alerts"])


@router.get("/alerts", response_model=list[dict[str, str]], summary="Obtener alertas operativas del sistema")
async def get_system_alerts(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna la lista de alertas activas del sistema (Circuit Breaker, DLQ, etc.).
    """
    return await NotificationService.get_active_system_alerts(db)
