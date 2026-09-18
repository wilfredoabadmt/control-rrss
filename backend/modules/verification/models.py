"""
Modelos de Verificación de Interacciones Institucionales — GAMEA Social Monitor
Principio V: No Inventar Datos
Principio XXVII: No Rankings
Principio XXVIII: Explicabilidad de Estados
REQ-VER-001, REQ-VER-002, REQ-VER-003, REQ-VER-004
"""

import uuid
from datetime import datetime

from database import Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now
from modules.employees.models import Employee
from modules.interactions.models import Interaction, InteractionEvidence
from modules.shared.enums import VerificationStatus
from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Verification(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """
    Registro formal de verificación de una interacción con un funcionario (REQ-VER-001).
    Almacena el estado epistémico y la justificación textual comprensible (Principio XXVIII).
    """
    __tablename__ = "verifications"

    interaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("interactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Interacción auditada",
    )
    employee_id: Mapped[str | None] = mapped_column(
        String(50),
        ForeignKey("employees.employee_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Identificador único inmutable del funcionario",
    )
    verification_status: Mapped[str] = mapped_column(
        String(50),
        default=VerificationStatus.PENDING.value,
        nullable=False,
        index=True,
        comment="Estado epistémico: CONFIRMED, NOT_FOUND, NOT_OBSERVABLE, DECLARED_CONFIRMED, API_RESTRICTED",
    )
    verification_method: Mapped[str] = mapped_column(
        String(50),
        default="AUTOMATIC_CROSS_REFERENCE",
        nullable=False,
        comment="Método: AUTOMATIC_CROSS_REFERENCE, MANUAL_OPERATOR, BULK_IMPORT",
    )
    verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
        comment="Fecha y hora de emisión del dictamen de verificación",
    )
    verified_by_user_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="Usuario operador o sistema/worker que verificó",
    )
    explanation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Explicación humana y técnica del estado asignado (Principio XXVIII)",
    )
    evidence_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("interaction_evidences.id", ondelete="SET NULL"),
        nullable=True,
        comment="Evidencia adjunta cuando aplica",
    )

    # Relaciones
    interaction: Mapped[Interaction] = relationship(
        Interaction,
        back_populates="verifications",
    )
    employee: Mapped[Employee | None] = relationship(
        Employee,
    )
    evidence: Mapped[InteractionEvidence | None] = relationship(
        InteractionEvidence,
    )
