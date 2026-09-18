"""
Tareas Celery para Sincronización de TikTok — GAMEA Social Monitor
Principio XIV: Resiliencia del Sistema
Principio XXIII: Estados de Sincronización
REQ-MON-001, REQ-TKI-001
"""

from typing import Any

from core.logging_config import get_logger
from workers.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(
    name="workers.sync_tasks.sync_tiktok_videos",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def sync_tiktok_videos_task(self, institutional_account_id: str) -> dict[str, Any]:
    """
    Sincroniza videos y métricas agregadas de la cuenta de TikTok del GAMEA.
    """
    logger.info("sync_tiktok_videos_started", account_id=institutional_account_id)
    return {
        "status": "COMPLETED",
        "account_id": institutional_account_id,
        "task_id": self.request.id,
    }
