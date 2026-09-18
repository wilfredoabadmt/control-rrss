"""
Modelo de Auditoría Inmutable — GAMEA Social Monitor
Principio X: Registro de Auditoría Inmutable (Append-Only)
Principio XXII: Observabilidad y Trazabilidad
"""

from datetime import datetime
from typing import Any

from database import Base, UUIDPrimaryKeyMixin, utc_now
from modules.shared.exceptions import ImmutableAuditException
from sqlalchemy import JSON, DateTime, String, event
from sqlalchemy.orm import Mapped, mapped_column


class AuditEvent(Base, UUIDPrimaryKeyMixin):
    """
    Registro inmutable de auditoría institucional.
    Toda mutación en el sistema DEBE registrar un evento aquí.
    Esta tabla es estrictamente APPEND-ONLY.
    """
    __tablename__ = "audit_events"

    timestamp_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
        comment="Timestamp exacto del evento en UTC",
    )
    user_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        index=True,
        comment="ID del usuario que ejecutó la acción (nullable para no autenticados)",
    )
    user_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="Correo del usuario que ejecutó la acción",
    )
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="Acción ejecutada (AuditAction: CREATE, UPDATE, DELETE, LOGIN...)",
    )
    entity_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Entidad afectada (ej. User, Employee, Publication)",
    )
    entity_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="Identificador único del registro afectado",
    )
    previous_state: Mapped[Any | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Estado previo serializado en JSON",
    )
    new_state: Mapped[Any | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Nuevo estado serializado en JSON",
    )
    correlation_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
        comment="Identificador de correlación para trazabilidad extremo a extremo",
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
        comment="Dirección IP de origen de la solicitud",
    )
    user_agent: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="User-Agent del cliente HTTP",
    )
    details: Mapped[Any | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Metadatos contextuales adicionales del evento",
    )


# SQLAlchemy Event Listeners para garantizar inmutabilidad a nivel de aplicación (Principio X)
@event.listens_for(AuditEvent, "before_update")
def receive_before_update(mapper, connection, target):
    raise ImmutableAuditException(
        correlation_id=target.correlation_id if hasattr(target, "correlation_id") else None
    )


@event.listens_for(AuditEvent, "before_delete")
def receive_before_delete(mapper, connection, target):
    raise ImmutableAuditException(
        correlation_id=target.correlation_id if hasattr(target, "correlation_id") else None
    )
