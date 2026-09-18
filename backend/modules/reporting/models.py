"""
Modelos de Reportes y Auditoría de Generación — GAMEA Social Monitor
Principio XXIV: Reportes Reproducibles
Principio XXVI: Semántica de Indicadores
REQ-RPT-001, BR-RPT-001 a BR-RPT-005
"""

import uuid
from datetime import datetime
from typing import Any

from database import Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now
from modules.iam.models import User
from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


class ReportExecution(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """
    Registro inmutable de la ejecución y generación de un reporte institucional (REQ-RPT-001).
    Garantiza reproducibilidad e integridad criptográfica (SHA-256).
    """
    __tablename__ = "report_executions"

    report_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="Tipo de reporte: CAMPAIGN_COVERAGE, ORG_UNIT_INTERACTIONS, EMPLOYEE_INTERACTIONS, VERIFICATION_STATUS, SYNC_ACTIVITY",
    )
    report_version: Mapped[str] = mapped_column(
        String(20),
        default="1.0",
        nullable=False,
        comment="Versión del algoritmo generador",
    )
    requested_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Usuario solicitante",
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
        comment="Timestamp UTC de generación",
    )
    parameters: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
        comment="Parámetros de filtrado exactos usados para garantizar reproducibilidad",
    )
    file_hash: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        index=True,
        comment="Hash criptográfico SHA-256 del archivo .xlsx generado",
    )
    file_path: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="Ruta interna de almacenamiento del archivo",
    )
    row_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Número total de filas de datos generadas",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="COMPLETED",
        nullable=False,
        comment="Estado: GENERATING, COMPLETED, FAILED",
    )

    # Relaciones
    requested_by: Mapped[User | None] = relationship(User)
