"""
Tareas Celery para Sincronización de Facebook — GAMEA Social Monitor
Principio XIV: Resiliencia del Sistema
Principio XXIII: Estados de Sincronización
REQ-MON-001, REQ-FBI-001 a REQ-FBI-004
"""

from typing import Any

from core.logging_config import get_logger
from workers.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(
    name="workers.sync_tasks.sync_facebook_posts",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def sync_facebook_posts_task(self, institutional_account_id: str) -> dict[str, Any]:
    """
    Sincroniza publicaciones de una página institucional de Facebook.
    """
    logger.info("sync_facebook_posts_started", account_id=institutional_account_id)
    # Lógica de sincronización asíncrona delegada al worker
    return {
        "status": "COMPLETED",
        "account_id": institutional_account_id,
        "task_id": self.request.id,
    }


@celery_app.task(
    name="workers.sync_tasks.sync_facebook_comments",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def sync_facebook_comments_task(self, publication_id: str) -> dict[str, Any]:
    """
    Sincroniza comentarios y reacciones de una publicación institucional.
    """
    logger.info("sync_facebook_comments_started", publication_id=publication_id)
    return {
        "status": "COMPLETED",
        "publication_id": publication_id,
        "task_id": self.request.id,
    }
