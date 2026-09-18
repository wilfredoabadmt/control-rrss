"""
Configuración Global de Pytest y Fixtures Compartidos — GAMEA Social Monitor
"""

import pytest_asyncio
from database import Base
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
