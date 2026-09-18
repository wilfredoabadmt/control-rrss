"""
Modelos de Monitoreo y Trabajos de Sincronización — GAMEA Social Monitor
Principio XXIII: Estados Canónicos Estrictos
Principio XIV: Resiliencia
REQ-MON-001, REQ-MON-002
"""

import uuid
from datetime import datetime

from database import Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now
from modules.shared.enums import SyncJobStatus
from modules.social_accounts.models import InstitutionalAccount, SocialPlatform
from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


class ExternalSyncJob(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """
    Registro y control de ciclo de vida de un trabajo de sincronización externa (REQ-MON-001/002).
    """
    __tablename__ = "external_sync_jobs"

    platform_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("social_platforms.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Plataforma externa sobre la que se ejecutó el trabajo",
    )
    institutional_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("institutional_accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Cuenta institucional sincronizada (si aplica)",
    )
    job_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="Tipo de trabajo: FETCH_POSTS, FETCH_COMMENTS, FETCH_METRICS, VERIFY_INTERACTIONS",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default=SyncJobStatus.PENDING.value,
        nullable=False,
        index=True,
        comment="Estado canónico de la máquina de estados de sincronización",
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
        comment="Timestamp UTC de inicio de la tarea",
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp UTC de finalización (éxito o fallo)",
    )
    records_processed: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    records_created: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    records_updated: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    records_failed: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    error_details: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Descripción detallada de fallos o tracebacks cuando aplique",
    )
    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Número de reintentos ejecutados bajo backoff exponencial",
    )
    api_version: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="Versión de la API externa utilizada durante la ejecución",
    )
    correlation_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="ID de correlación distribuida",
    )

    # Relaciones
    platform: Mapped[SocialPlatform] = relationship(SocialPlatform)
    institutional_account: Mapped[InstitutionalAccount | None] = relationship(InstitutionalAccount)
