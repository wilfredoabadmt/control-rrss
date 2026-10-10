"""
Configuración Global de Pytest y Fixtures Compartidos — GAMEA Social Monitor
"""

import pytest_asyncio
from database import Base
import core.audit.models  # noqa: F401
import modules.iam.models  # noqa: F401
import modules.employees.models  # noqa: F401
import modules.social_accounts.models  # noqa: F401
import modules.publications.models  # noqa: F401
import modules.interactions.models  # noqa: F401
import modules.verification.models  # noqa: F401
import modules.reporting.models  # noqa: F401
import modules.monitoring.models  # noqa: F401
from modules.social_accounts.seed import seed_social_platforms
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        await seed_social_platforms(session)
        yield session

    await engine.dispose()
