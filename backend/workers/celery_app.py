"""
Instancia de Celery — GAMEA Social Monitor
Principio XIV: Desacoplamiento Asíncrono
ADR-003: Redis + Celery para colas y tareas programadas
"""

import sys
from pathlib import Path

from celery import Celery

# Asegurar que backend está en el sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from datetime import UTC

from config import settings

celery_app = Celery(
    "gamea_social_monitor",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=1800,       # 30 min hard limit
    task_soft_time_limit=1500,  # 25 min soft limit
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_routes={
        "workers.celery_app.ping": {"queue": "default"},
        "workers.sync_tasks.*": {"queue": "sync_jobs"},
        "workers.report_tasks.*": {"queue": "reports"},
    },
)


@celery_app.task(name="workers.celery_app.ping", bind=True)
def ping(self) -> dict:
    """Tarea de comprobación básica del worker de Celery."""
    from datetime import datetime
    return {
        "status": "pong",
        "task_id": self.request.id,
        "timestamp_utc": datetime.now(UTC).isoformat(),
    }
