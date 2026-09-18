"""
Modelos de Publicaciones Institucionales y Campañas de Monitoreo — GAMEA Social Monitor
Principio IX: Modelo Normalizado
Principio XI: Ingesta Idempotente
REQ-PUB-002, REQ-PUB-003, REQ-PUB-004
"""

import uuid
from datetime import datetime

from database import Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now
from modules.employees.models import OrganizationalUnit
from modules.social_accounts.models import InstitutionalAccount, SocialPlatform
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

# Tabla intermedia M:N Campañas y Publicaciones
campaign_publications = Table(
    "campaign_publications",
    Base.metadata,
    Column("campaign_id", UUID(as_uuid=True), ForeignKey("monitoring_campaigns.id", ondelete="CASCADE"), primary_key=True),
    Column("publication_id", UUID(as_uuid=True), ForeignKey("publications.id", ondelete="CASCADE"), primary_key=True),
)


class Publication(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """
    Publicación oficial emitida por una cuenta municipal monitoreada (REQ-PUB-002).
    """
    __tablename__ = "publications"

    institutional_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("institutional_accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    platform_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("social_platforms.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    external_post_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Identificador único del post en la red social (Facebook/TikTok)",
    )
    post_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="Enlace directo a la publicación",
    )
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
        comment="Fecha y hora de publicación en UTC",
    )
    content_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Texto o descripción del post",
    )
    media_type: Mapped[str] = mapped_column(
        String(50),
        default="POST",
        nullable=False,
        comment="Tipo de medio: POST, VIDEO, REEL, PHOTO",
    )
    is_monitored: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Indica si se deben capturar interacciones de esta publicación",
    )
    last_sync_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp UTC de la última sincronización",
    )

    # Relaciones
    platform: Mapped[SocialPlatform] = relationship(
        SocialPlatform,
    )
    institutional_account: Mapped[InstitutionalAccount | None] = relationship(
        InstitutionalAccount,
    )
    campaigns: Mapped[list["MonitoringCampaign"]] = relationship(
        "MonitoringCampaign",
        secondary=campaign_publications,
        back_populates="publications",
    )

    __table_args__ = (
        # Idempotencia: No se puede duplicar un post de la misma plataforma
        UniqueConstraint("platform_id", "external_post_id", name="uq_platform_external_post_id"),
    )


class MonitoringCampaign(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """
    Campaña temática o institucional de monitoreo (REQ-PUB-003).
    Agrupa múltiples publicaciones bajo una directriz y metas de cumplimiento.
    """
    __tablename__ = "monitoring_campaigns"

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="Título de la campaña (ej. Campaña Vacunación y Salud El Alto 2026)",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Objetivo y alcance de la campaña",
    )
    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
    )
    end_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
    )

    # Relaciones
    publications: Mapped[list[Publication]] = relationship(
        Publication,
        secondary=campaign_publications,
        back_populates="campaigns",
    )
    targets: Mapped[list["MonitoringTarget"]] = relationship(
        "MonitoringTarget",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )


class MonitoringTarget(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """
    Metas institucionales por unidad organizacional dentro de una campaña (REQ-PUB-004).
    """
    __tablename__ = "monitoring_targets"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("monitoring_campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organizational_unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizational_units.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_percentage: Mapped[float] = mapped_column(
        Float,
        default=80.0,
        nullable=False,
        comment="Porcentaje objetivo de participación de la unidad (ej. 80%)",
    )
    target_count: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Cantidad fija esperada de interacciones (opcional)",
    )
    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Relaciones
    campaign: Mapped[MonitoringCampaign] = relationship(
        MonitoringCampaign,
        back_populates="targets",
    )
    organizational_unit: Mapped[OrganizationalUnit] = relationship(
        OrganizationalUnit,
    )
