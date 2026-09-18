"""
Modelos de Interacciones y Evidencias — GAMEA Social Monitor
Principio V: No Inventar Datos (Categorización Epistémica)
Principio VI: Proveniencia del Dato
Principio XV: Ingesta Idempotente
REQ-INT-001, REQ-INT-002
"""

import uuid
from datetime import datetime

from database import Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now
from modules.publications.models import Publication
from modules.shared.enums import CaptureMethod, DataOriginType
from modules.social_accounts.models import InstitutionalAccount, SocialPlatform
from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Interaction(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """
    Registro canónico de una interacción observada en redes sociales (REQ-INT-001).
    """
    __tablename__ = "interactions"

    publication_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("publications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Publicación monitoreada sobre la que ocurrió la interacción",
    )
    platform_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("social_platforms.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Plataforma de red social",
    )
    interaction_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="Tipo canónico: COMMENT, LIKE, SHARE, REPLY",
    )
    external_interaction_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="ID único externo de la interacción en la plataforma",
    )
    external_post_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="ID externo del post en la red social",
    )
    external_author_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="ID de usuario/autor en la plataforma social (ej. Graph API user ID)",
    )
    external_author_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Nombre visible o display name del autor",
    )
    content_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Texto del comentario o respuesta",
    )
    reaction_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="Tipo específico de reacción (LIKE, LOVE, CARE, HAHA, WOW, SAD, ANGRY)",
    )
    external_created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Fecha y hora de emisión original en la red social (UTC)",
    )
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
        comment="Fecha y hora de captura e ingesta en el sistema (UTC)",
    )
    capture_method: Mapped[str] = mapped_column(
        String(50),
        default=CaptureMethod.POLLING.value,
        nullable=False,
        comment="Método de captura: WEBHOOK, POLLING, MANUAL_IMPORT, BACKFILL",
    )
    api_version: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="Versión del endpoint de la API utilizada (ej. v26.0)",
    )
    data_origin_type: Mapped[str] = mapped_column(
        String(50),
        default=DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value,
        nullable=False,
        comment="Categoría epistémica de origen (Principio V)",
    )
    source_platform: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="Nombre canónico de la red social de origen",
    )
    source_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("institutional_accounts.id", ondelete="SET NULL"),
        nullable=True,
        comment="Cuenta institucional receptora",
    )
    raw_payload_ref: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Hash SHA-256 o referencia de almacenamiento del payload crudo",
    )
    correlation_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="ID de correlación distribuida",
    )

    # Relaciones
    publication: Mapped[Publication] = relationship(Publication)
    platform: Mapped[SocialPlatform] = relationship(SocialPlatform)
    source_account: Mapped[InstitutionalAccount | None] = relationship(InstitutionalAccount)
    evidences: Mapped[list["InteractionEvidence"]] = relationship(
        "InteractionEvidence",
        back_populates="interaction",
        cascade="all, delete-orphan",
    )
    verifications: Mapped[list["Verification"]] = relationship(  # type: ignore # noqa: F821
        "Verification",
        back_populates="interaction",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        # Idempotencia estricta por plataforma y ID externo de interacción (Principio XV & BR-INT-001)
        UniqueConstraint("platform_id", "external_interaction_id", name="uq_interactions_platform_external_id"),
    )


class InteractionEvidence(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """
    Evidencia técnica y forense que respalda una interacción capturada (REQ-INT-002).
    """
    __tablename__ = "interaction_evidences"

    interaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("interactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Interacción respaldada por esta evidencia",
    )
    evidence_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Tipo de evidencia: API_RESPONSE, SCREENSHOT, MANUAL_NOTE, WEBHOOK_PAYLOAD",
    )
    content: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Payload JSON o contenido textual de la evidencia",
    )
    content_hash: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        index=True,
        comment="Hash criptográfico SHA-256 del contenido para verificar integridad",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
    )
    created_by_user_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="ID del usuario operador o del worker de ingesta",
    )

    # Relación
    interaction: Mapped[Interaction] = relationship(
        Interaction,
        back_populates="evidences",
    )
