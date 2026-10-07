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
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


class SocialConnectorConfig(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """
    Configuración institucional de conectores y parámetros de extracción/scrapeo para Facebook y TikTok.
    REQ-MON-003: Permite parametrizar credenciales, identificadores de página, límites y modo de extracción.
    """
    __tablename__ = "social_connector_configs"

    platform_name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        comment="Identificador: FACEBOOK o TIKTOK",
    )
    target_account_id: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        default="",
        comment="ID de página o Handle oficial (ej. @AlcaldiaElAlto / 10006456789)",
    )
    display_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        default="",
        comment="Nombre descriptivo institucional",
    )
    access_token_encrypted: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Token de acceso oficial o clave de sesión cifrada",
    )
    api_secret_encrypted: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="App Secret o cookie/session de extracción cifrada",
    )
    api_version: Mapped[str] = mapped_column(
        String(30),
        default="v26.0",
        nullable=False,
    )
    extraction_mode: Mapped[str] = mapped_column(
        String(50),
        default="OFFICIAL_API",
        nullable=False,
        comment="OFFICIAL_API, HYBRID_SCRAPER, MANUAL_ASSISTED",
    )
    rate_limit_per_minute: Mapped[int] = mapped_column(
        Integer,
        default=60,
        nullable=False,
    )
    max_posts_per_sync: Mapped[int] = mapped_column(
        Integer,
        default=25,
        nullable=False,
    )
    max_comments_per_post: Mapped[int] = mapped_column(
        Integer,
        default=200,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    last_sync_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_status: Mapped[str] = mapped_column(
        String(50),
        default="CONFIGURED",
        nullable=False,
    )
    status_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )



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
