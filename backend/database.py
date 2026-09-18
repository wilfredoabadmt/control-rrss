"""
Capa de Base de Datos — GAMEA Social Monitor
Principio XXI: Persistencia Transaccional ACID
Principio XXIII: Timestamps canónicos en UTC con zona horaria
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from config import settings
from sqlalchemy import DateTime, create_engine
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


def utc_now() -> datetime:
    """Retorna la fecha y hora actual en UTC con timezone explícito."""
    return datetime.now(UTC)


class Base(DeclarativeBase):
    """Clase base para todos los modelos del dominio."""
    pass


class TimestampMixin:
    """Mixin canónico para auditoría de creación y actualización."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        comment="Timestamp de creación en UTC"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
        comment="Timestamp de última actualización en UTC"
    )


class UUIDPrimaryKeyMixin:
    """Mixin canónico para primary key UUIDv4."""
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
        comment="Identificador único UUIDv4"
    )


# Engine Asíncrono (FastAPI)
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Engine Síncrono (Alembic, Workers, Scripts)
sync_engine = create_engine(
    settings.DATABASE_URL_SYNC,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False,
)


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency para inyección de sesión asíncrona de base de datos."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_db():
    """Generador para scripts y workers síncronos."""
    db = SyncSessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
