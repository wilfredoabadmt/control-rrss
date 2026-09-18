"""
Programación de Tareas Periódicas (Celery Beat) — GAMEA Social Monitor
"""

from celery.schedules import crontab
from workers.celery_app import celery_app

celery_app.conf.beat_schedule = {
    "heartbeat-ping-every-minute": {
        "task": "workers.celery_app.ping",
        "schedule": 60.0,
    },
    "database-daily-backup-check": {
        "task": "workers.celery_app.ping",
        "schedule": crontab(hour=2, minute=0),  # 02:00 AM UTC
    },
}
