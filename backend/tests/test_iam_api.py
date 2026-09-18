"""
Pruebas de Integración de Endpoints HTTP de IAM y Auditoría — GAMEA Social Monitor
"""

import uuid

import pytest
import pytest_asyncio
from core.security.tokens import create_access_token
from database import Base, get_async_db
from fastapi.testclient import TestClient
from main import app
from modules.iam.models import Role, User
from modules.iam.seed import seed_roles_and_permissions
from modules.shared.enums import UserRole
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def test_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
def client(test_engine):
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)

    async def override_get_async_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_async_db] = override_get_async_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_login_invalid_credentials_returns_401(client, test_engine):
    """POST /api/v1/auth/login con credenciales inexistentes retorna 401."""
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        await seed_roles_and_permissions(session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "noexiste@elalto.gob.bo", "password": "WrongPassword123!"},
    )
    assert response.status_code == 401
    assert "Credenciales" in response.json()["detail"]


def test_create_user_without_token_returns_401(client):
    """POST /api/v1/users sin token retorna 401."""
    response = client.post(
        "/api/v1/users/",
        json={
            "email": "nuevo@elalto.gob.bo",
            "full_name": "Nuevo Funcionario",
            "password": "Password1234!#",
            "role_names": ["VIEWER"],
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_user_with_non_admin_token_returns_403(client, test_engine):
    """
    REQ-IAM-002: Usuario con rol ANALYST no puede crear usuarios (retorna 403).
    """
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)
    analyst_user_id = uuid.uuid4()

    async with session_factory() as session:
        await seed_roles_and_permissions(session)
        analyst_role = (await session.execute(
            Role.__table__.select().where(Role.name == UserRole.ANALYST.value)
        )).first()

        analyst = User(
            id=analyst_user_id,
            email="analista_api@elalto.gob.bo",
            full_name="Analista API",
            password_hash="somehash",
            is_active=True,
        )
        session.add(analyst)
        await session.flush()
        # Asignar rol
        await session.execute(
            Base.metadata.tables["user_roles"].insert().values(
                user_id=analyst_user_id,
                role_id=analyst_role.id,
            )
        )
        await session.commit()

    token = create_access_token(
        subject=str(analyst_user_id),
        roles=[UserRole.ANALYST.value],
    )
    response = client.post(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "email": "intruso@elalto.gob.bo",
            "full_name": "Intruso",
            "password": "Password1234!#",
            "role_names": ["VIEWER"],
        },
    )
    assert response.status_code == 403
    assert "Permisos insuficientes" in response.json()["detail"]


def test_list_audit_events_without_token_returns_401(client):
    """GET /api/v1/audit/events sin token retorna 401."""
    response = client.get("/api/v1/audit/events")
    assert response.status_code == 401
