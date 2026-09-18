"""
Modelos de Datos para Identity & Access Management (IAM) — GAMEA Social Monitor
Principio XVI: Seguridad por Diseño
Principio XVII: Control de Acceso Basado en Roles (RBAC) en Backend
"""

from datetime import UTC, datetime

from database import Base, TimestampMixin, UUIDPrimaryKeyMixin
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

# Tabla de asociación M:N Usuarios y Roles
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

# Tabla de asociación M:N Roles y Permisos
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", UUID(as_uuid=True), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class Role(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """Rol de usuario en el sistema según Principio XVII."""
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        comment="Nombre único del rol constitucional",
    )
    description: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Descripción del alcance del rol",
    )
    is_system: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Indica si es un rol constitucional protegido",
    )

    # Relaciones
    users: Mapped[list["User"]] = relationship(
        "User",
        secondary=user_roles,
        back_populates="roles",
    )
    permissions: Mapped[list["Permission"]] = relationship(
        "Permission",
        secondary=role_permissions,
        back_populates="roles",
        lazy="selectin",
    )


class Permission(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """Permiso granular del sistema."""
    __tablename__ = "permissions"

    code: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="Código único del permiso (ej. users:create)",
    )
    description: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Descripción de la acción autorizada",
    )

    # Relaciones
    roles: Mapped[list[Role]] = relationship(
        Role,
        secondary=role_permissions,
        back_populates="permissions",
    )


class User(Base, TimestampMixin, UUIDPrimaryKeyMixin):
    """Usuario institucional del sistema."""
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="Correo electrónico institucional único",
    )
    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        comment="Nombre completo del usuario",
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Hash seguro Argon2id de la contraseña",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Indica si la cuenta está habilitada (baja lógica)",
    )
    failed_login_attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Contador de intentos fallidos consecutivos",
    )
    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Bloqueo temporal hasta timestamp UTC si supera intentos fallidos",
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp UTC del último inicio de sesión exitoso",
    )

    # Relaciones
    roles: Mapped[list[Role]] = relationship(
        Role,
        secondary=user_roles,
        back_populates="users",
        lazy="selectin",
    )

    def is_locked(self) -> bool:
        """Verifica si la cuenta se encuentra temporalmente bloqueada."""
        if not self.locked_until:
            return False
        return datetime.now(UTC) < self.locked_until
