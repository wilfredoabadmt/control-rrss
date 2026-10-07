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
    # Registro explícito de tareas: sin `include` no se carga NINGUNA tarea del dominio.
    include=[
        "modules.interactions.tasks",
        "modules.shared.backup",
        "modules.facebook_adapter.tasks",
        "modules.tiktok_adapter.tasks",
    ],
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
        "tasks.purge_expired_raw_evidences_task": {"queue": "sync_jobs"},
        "tasks.backup_database_task": {"queue": "default"},
        "modules.interactions.tasks.purge_expired_evidences_task": {"queue": "sync_jobs"},
        "modules.shared.backup.backup_database_task": {"queue": "default"},
    },
    # Programación de tareas periódicas (Celery Beat)
    beat_schedule={
        "heartbeat-ping-every-minute": {
            "task": "workers.celery_app.ping",
            "schedule": 60.0,
        },
        "purge-old-raw-evidences-weekly": {
            "task": "tasks.purge_expired_raw_evidences_task",
            "schedule": 60.0 * 60.0 * 24.0 * 7.0,  # semanal
            "kwargs": {"retention_days": 180},
        },
        "database-daily-backup": {
            "task": "tasks.backup_database_task",
            "schedule": 60.0 * 60.0 * 24.0,  # diario
        },
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
