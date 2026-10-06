"""
Servicio y Tareas de Backup Inmutable de Base de Datos — GAMEA Social Monitor
ADR-006: Estrategia de Backup Inmutable y Recuperación ante Desastres
Principio XXXIII: Resiliencia Operativa y Copias de Seguridad Criptográficamente Verificables
"""

import hashlib
import os
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from celery import shared_task
from config import settings
from core.audit.service import record_audit_event
from database import AsyncSessionLocal
from modules.shared.enums import AuditAction
from sqlalchemy.ext.asyncio import AsyncSession


class DatabaseBackupService:
    @staticmethod
    def execute_pg_dump(backup_dir: Path | None = None) -> tuple[Path, str, int]:
        """
        Ejecuta dump real de PostgreSQL con pg_dump, calcula hash SHA-256 y tamaño.
        Si pg_dump no está disponible NO se fabrica un snapshot falso: se lanza una
        excepción para que el estado del backup refleje la realidad (Principio V).
        Retorna: (ruta_archivo, sha256_hash, tamaño_bytes)
        """
        if backup_dir is None:
            backup_dir = Path("backups")
        backup_dir.mkdir(parents=True, exist_ok=True)

        now_str = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"gamea_backup_{now_str}.dump"

        env = os.environ.copy()
        if settings.POSTGRES_PASSWORD:
            env["PGPASSWORD"] = settings.POSTGRES_PASSWORD

        cmd = [
            "pg_dump",
            "-h", settings.POSTGRES_SERVER or "localhost",
            "-p", str(settings.POSTGRES_PORT or 5432),
            "-U", settings.POSTGRES_USER or "gamea_admin",
            "-d", settings.POSTGRES_DB or "gamea_social_monitor",
            "-F", "c",  # Formato custom comprimido
            "-f", str(backup_file),
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, env=env, text=True, timeout=300)
        except FileNotFoundError as exc:
            raise RuntimeError(
                "pg_dump no está disponible en el PATH del servidor: no es posible generar "
                "una copia de seguridad real de PostgreSQL."
            ) from exc
        if result.returncode != 0:
            raise RuntimeError(f"pg_dump falló con código {result.returncode}: {result.stderr.strip()}")

        # Calcular SHA-256
        sha256 = hashlib.sha256()
        file_size = 0
        with open(backup_file, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
                file_size += len(chunk)

        return backup_file, sha256.hexdigest(), file_size

    @staticmethod
    async def run_backup_and_audit(db: AsyncSession, actor_id: str = "SYSTEM_CELERY_BEAT") -> dict:
        """
        Ejecuta el backup y lo asienta inmutablemente en el registro de auditoría (Principio X).
        """
        backup_path, sha256_hash, file_size = DatabaseBackupService.execute_pg_dump()

        await record_audit_event(
            db=db,
            action=AuditAction.EXPORT,
            entity_name="DatabaseBackup",
            entity_id=backup_path.name,
            user_id=actor_id,
            details={
                "backup_filename": backup_path.name,
                "sha256_hash": sha256_hash,
                "file_size_bytes": file_size,
                "timestamp_utc": datetime.now(UTC).isoformat(),
                "policy": "ADR-006_PRINCIPIO_XXXIII",
            },
        )
        await db.commit()

        return {
            "backup_file": str(backup_path),
            "sha256": sha256_hash,
            "size_bytes": file_size,
            "status": "COMPLETED",
        }


@shared_task(name="tasks.backup_database_task")
def backup_database_task() -> dict:
    """
    Tarea Celery periódica (ejecución diaria 02:00 UTC) para ADR-006 y Principio XXXIII.
    """
    import asyncio

    async def _runner():
        async with AsyncSessionLocal() as session:
            return await DatabaseBackupService.run_backup_and_audit(session)

    return asyncio.run(_runner())
