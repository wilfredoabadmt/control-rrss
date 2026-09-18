"""
Modelos del Directorio de Funcionarios y Organización — GAMEA Social Monitor
Principio VII: Identidad Única e Inmutable de Funcionarios
Principio VIII: Fuente Maestra de Recursos Humanos
Principio IX: Modelo de Datos Normalizado
Principio XX: Protección de Datos Personales
"""

import uuid
from datetime import date, datetime
from typing import Optional

from database import Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now
from modules.shared.enums import EmployeeStatus
from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


class OrganizationalUnit(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """Unidad organizacional de la estructura jerárquica del GAMEA."""
    __tablename__ = "organizational_units"

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="Nombre de la unidad (ej. Dirección de Comunicación Social)",
    )
    code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        comment="Código identificador institucional corto",
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizational_units.id", ondelete="SET NULL"),
        nullable=True,
        comment="Referencia a unidad superior jerárquica (nullable para raíz)",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="ACTIVE",
        nullable=False,
        comment="Estado: ACTIVE / INACTIVE",
    )

    # Relación jerárquica padre-hijos
    children: Mapped[list["OrganizationalUnit"]] = relationship(
        "OrganizationalUnit",
        back_populates="parent",
        cascade="all, delete-orphan",
    )
    parent: Mapped[Optional["OrganizationalUnit"]] = relationship(
        "OrganizationalUnit",
        back_populates="children",
        remote_side="OrganizationalUnit.id",
    )
    employees: Mapped[list["Employee"]] = relationship(
        "Employee",
        back_populates="organizational_unit",
    )


class Position(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """Cargos o funciones institucionales dentro del GAMEA."""
    __tablename__ = "positions"

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        comment="Denominación del cargo",
    )
    code: Mapped[str | None] = mapped_column(
        String(50),
        unique=True,
        nullable=True,
        index=True,
        comment="Código interno del cargo",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="ACTIVE",
        nullable=False,
        comment="Estado: ACTIVE / INACTIVE",
    )

    employees: Mapped[list["Employee"]] = relationship(
        "Employee",
        back_populates="position",
    )


class Employee(Base, TimestampMixin):
    """
    Funcionario del Gobierno Autónomo Municipal de El Alto.
    El employee_id es la clave primaria única e inmutable (Principio VII).
    """
    __tablename__ = "employees"

    # Clave Primaria Inmutable Institucional
    employee_id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        nullable=False,
        comment="Identificador único institucional inmutable (Principio VII)",
    )

    # Documento de Identidad (Cifrado en reposo + Blind Index para búsqueda exacta)
    document_number_encrypted: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Cédula de identidad cifrada con Fernet/AES-256 (Principio XX)",
    )
    document_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
        comment="Blind Index determinista (HMAC-SHA256) para búsquedas exactas",
    )

    # Datos Personales (Clasificación CONFIDENTIAL)
    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Nombres del funcionario (CONFIDENCIAL)",
    )
    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Apellidos del funcionario (CONFIDENCIAL)",
    )

    # Pertenencia Organizacional y Cargo
    organizational_unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizational_units.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Unidad organizacional actual a la que pertenece",
    )
    position_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("positions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Cargo actual desempeñado",
    )

    # Estado y Fechas de Vinculación
    status: Mapped[str] = mapped_column(
        String(30),
        default=EmployeeStatus.ACTIVE.value,
        nullable=False,
        index=True,
        comment="Estado del funcionario: ACTIVE, INACTIVE, ON_LEAVE, TERMINATED",
    )
    hire_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        comment="Fecha de ingreso institucional",
    )
    termination_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        comment="Fecha de desvinculación (si aplica)",
    )

    # Relaciones
    organizational_unit: Mapped[OrganizationalUnit | None] = relationship(
        OrganizationalUnit,
        back_populates="employees",
    )
    position: Mapped[Position | None] = relationship(
        Position,
        back_populates="employees",
    )
    history: Mapped[list["EmployeeHistory"]] = relationship(
        "EmployeeHistory",
        back_populates="employee",
        order_by="desc(EmployeeHistory.effective_date)",
        cascade="all, delete-orphan",
    )


class EmployeeHistory(Base, UUIDPrimaryKeyMixin):
    """
    Historial inmutable de transferencias, cambios de cargo o de estado de funcionarios.
    Trazabilidad de cambios organizacionales (REQ-EMP-004).
    """
    __tablename__ = "employee_history"

    employee_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Funcionario al que pertenece el historial",
    )
    previous_organizational_unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    new_organizational_unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    previous_position_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    new_position_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    previous_status: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )
    new_status: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )
    effective_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
        comment="Momento exacto en UTC en que se registró el cambio",
    )
    change_reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Motivo del cambio (ej. Transferencia interna, Promoción, Desvinculación)",
    )
    recorded_by_user_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        comment="Usuario que ejecutó o importó la modificación",
    )
    correlation_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
        comment="Correlation ID para trazabilidad extremo a extremo",
    )

    employee: Mapped[Employee] = relationship(
        Employee,
        back_populates="history",
    )
