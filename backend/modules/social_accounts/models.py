"""
Modelos de Cuentas Sociales e Institucionales — GAMEA Social Monitor
Principio VII: Identidad Única de Funcionarios
Principio IX: Modelo de Datos Normalizado
REQ-SAB-001 / REQ-PUB-001
"""

import uuid
from datetime import datetime

from database import Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now
from modules.shared.enums import BindingStatus
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


class SocialPlatform(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """Catálogo de plataformas de redes sociales monitoreadas (FACEBOOK, TIKTOK)."""
    __tablename__ = "social_platforms"

    name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        comment="Identificador canónico de la plataforma (ej. FACEBOOK, TIKTOK)",
    )
    display_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Nombre legible (ej. Facebook / Meta)",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Indica si la plataforma está habilitada para monitoreo",
    )
    api_version: Mapped[str] = mapped_column(
        String(20),
        default="v20.0",
        nullable=False,
        comment="Versión de API actualmente utilizada",
    )

    # Relaciones
    accounts: Mapped[list["SocialAccount"]] = relationship(
        "SocialAccount",
        back_populates="platform",
    )
    institutional_accounts: Mapped[list["InstitutionalAccount"]] = relationship(
        "InstitutionalAccount",
        back_populates="platform",
    )


class SocialAccount(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """
    Cuenta de red social de un funcionario vinculado institucionalmente (REQ-SAB-001).
    """
    __tablename__ = "social_accounts"

    employee_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Funcionario al que está vinculada la cuenta",
    )
    platform_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("social_platforms.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Plataforma de red social",
    )
    external_user_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="ID técnico permanente asignado por la plataforma social",
    )
    current_username: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Nombre de usuario o @handle visible actual",
    )
    profile_url: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="URL del perfil en la red social",
    )
    binding_status: Mapped[str] = mapped_column(
        String(30),
        default=BindingStatus.ACTIVE.value,
        nullable=False,
        index=True,
        comment="Estado: ACTIVE, INACTIVE, PENDING_VERIFICATION, DISPUTED",
    )
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Fecha y hora de verificación de la vinculación",
    )

    # Relaciones
    platform: Mapped[SocialPlatform] = relationship(
        SocialPlatform,
        back_populates="accounts",
    )
    username_history: Mapped[list["UsernameHistory"]] = relationship(
        "UsernameHistory",
        back_populates="social_account",
        order_by="desc(UsernameHistory.changed_at)",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        # Un funcionario solo puede tener una cuenta activa por plataforma
        UniqueConstraint("employee_id", "platform_id", name="uq_employee_platform_account"),
    )


class UsernameHistory(Base, UUIDPrimaryKeyMixin):
    """
    Historial de cambios de @username o alias en redes sociales (REQ-SAB-002).
    Asegura que el cambio de username no rompa la trazabilidad de interacciones previas.
    """
    __tablename__ = "username_history"

    social_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("social_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    previous_username: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Username anterior",
    )
    new_username: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Nuevo username",
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
        comment="Timestamp UTC de detección o registro del cambio",
    )
    recorded_by_user_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
    )
    correlation_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )

    social_account: Mapped[SocialAccount] = relationship(
        SocialAccount,
        back_populates="username_history",
    )


class InstitutionalAccount(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """
    Cuentas oficiales de redes sociales del GAMEA sujetas a monitoreo (REQ-PUB-001).
    """
    __tablename__ = "institutional_accounts"

    platform_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("social_platforms.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    external_page_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="Identificador único de la página o canal en la plataforma",
    )
    account_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        comment="Nombre de la cuenta oficial (ej. Gobierno Autónomo Municipal de El Alto)",
    )
    handle: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Handle o @usuario (ej. @ElAltoAlcaldia)",
    )
    access_token_encrypted: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Token de acceso para APIs oficiales (cifrado con Fernet)",
    )
    token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Expiración del token oficial",
    )
    is_monitored: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Indica si sus publicaciones e interacciones son monitoreadas activamente",
    )

    platform: Mapped[SocialPlatform] = relationship(
        SocialPlatform,
        back_populates="institutional_accounts",
    )
