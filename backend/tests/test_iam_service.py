"""
Pruebas de Integración del Servicio de IAM — GAMEA Social Monitor
Valida BR-IAM-001 a BR-IAM-010 con base de datos asíncrona en memoria
"""


import pytest
import pytest_asyncio
from database import Base
from modules.iam.schemas import UserCreate
from modules.iam.seed import seed_roles_and_permissions
from modules.iam.service import IAMService
from modules.shared.enums import UserRole
from modules.shared.exceptions import AuthenticationException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        # Sembrar roles constitucionales
        await seed_roles_and_permissions(session)
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_create_user_and_authenticate_success(async_db):
    """Crea un usuario y verifica inicio de sesión exitoso."""
    user_in = UserCreate(
        email="analista@elalto.gob.bo",
        full_name="Carlos Mamani",
        password="Password1234!#ElAlto",
        role_names=[UserRole.ANALYST.value],
    )
    user = await IAMService.create_user(async_db, user_in)
    assert user.id is not None
    assert user.email == "analista@elalto.gob.bo"
    assert len(user.roles) == 1
    assert user.roles[0].name == UserRole.ANALYST.value

    # Autenticar
    tokens = await IAMService.authenticate_user(
        db=async_db,
        email="analista@elalto.gob.bo",
        password="Password1234!#ElAlto",
    )
    assert tokens.access_token is not None
    assert tokens.refresh_token is not None
    assert tokens.user.email == "analista@elalto.gob.bo"


@pytest.mark.asyncio
async def test_account_lockout_after_five_failed_attempts(async_db):
    """
    BR-IAM-002: Tras 5 intentos fallidos consecutivos, la cuenta DEBE bloquearse
    por 15 minutos.
    """
    user_in = UserCreate(
        email="operador@elalto.gob.bo",
        full_name="Maria Condori",
        password="PasswordSegura2026!#",
        role_names=[UserRole.OPERATOR.value],
    )
    await IAMService.create_user(async_db, user_in)

    # 4 intentos fallidos: lanza AuthenticationException pero no bloquea aún
    for _ in range(4):
        with pytest.raises(AuthenticationException):
            await IAMService.authenticate_user(
                db=async_db,
                email="operador@elalto.gob.bo",
                password="WrongPassword999!",
            )

    user = await IAMService.get_user_by_email(async_db, "operador@elalto.gob.bo")
    assert user.failed_login_attempts == 4
    assert user.is_locked() is False

    # 5to intento fallido: alcanza el umbral constitucional y bloquea la cuenta
    with pytest.raises(AuthenticationException):
        await IAMService.authenticate_user(
            db=async_db,
            email="operador@elalto.gob.bo",
            password="WrongPassword999!",
        )

    user = await IAMService.get_user_by_email(async_db, "operador@elalto.gob.bo")
    assert user.failed_login_attempts == 5
    assert user.locked_until is not None
    assert user.is_locked() is True

    # 6to intento (incluso con contraseña correcta): bloqueado
    with pytest.raises(AuthenticationException) as excinfo:
        await IAMService.authenticate_user(
            db=async_db,
            email="operador@elalto.gob.bo",
            password="PasswordSegura2026!#",
        )
    assert "bloqueada" in str(excinfo.value).lower()


@pytest.mark.asyncio
async def test_deactivate_user_soft_delete(async_db):
    """
    BR-IAM-009: Los usuarios no se eliminan físicamente sino que se desactivan.
    """
    admin_in = UserCreate(
        email="superadmin@elalto.gob.bo",
        full_name="Admin General",
        password="SuperAdmin2026!#ElAlto",
        role_names=[UserRole.SUPER_ADMIN.value],
    )
    admin = await IAMService.create_user(async_db, admin_in)

    target_in = UserCreate(
        email="desactivar@elalto.gob.bo",
        full_name="Usuario Temporal",
        password="TempPassword123!#",
        role_names=[UserRole.VIEWER.value],
    )
    target = await IAMService.create_user(async_db, target_in, current_user=admin)

    # Desactivar
    deactivated = await IAMService.deactivate_user(async_db, target.id, current_user=admin)
    assert deactivated.is_active is False

    # Intentar autenticar cuenta inactiva
    with pytest.raises(AuthenticationException) as excinfo:
        await IAMService.authenticate_user(
            async_db,
            "desactivar@elalto.gob.bo",
            "TempPassword123!#",
        )
    assert "inactiva" in str(excinfo.value).lower()
