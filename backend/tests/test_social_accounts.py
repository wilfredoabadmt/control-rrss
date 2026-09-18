"""
Pruebas de Cuentas Sociales e Historial de Alias — GAMEA Social Monitor
Principio VII: Identidad Única de Funcionarios
REQ-SAB-001, REQ-SAB-002, REQ-SAB-003
"""

import uuid

import pytest
import pytest_asyncio
from database import Base
from modules.employees.models import Employee
from modules.iam.models import User
from modules.shared.enums import BindingStatus, SocialPlatformType
from modules.social_accounts.models import SocialPlatform
from modules.social_accounts.schemas import BindSocialAccountRequest
from modules.social_accounts.seed import seed_social_platforms
from modules.social_accounts.service import SocialAccountService
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        await seed_social_platforms(session)

        # Crear funcionario base
        emp = Employee(
            employee_id="FUNC-2026-001",
            first_name="Carlos",
            last_name="Quispe",
            document_number_encrypted="enc_doc",
            document_hash="hash_doc",
            status="ACTIVE",
        )
        session.add(emp)
        await session.commit()
        yield session

    await engine.dispose()


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email="operador@elalto.gob.bo",
        full_name="Operador Test",
        password_hash="hash",
    )


@pytest.mark.asyncio
async def test_bind_and_unbind_social_account(async_db, mock_user):
    """
    REQ-SAB-001 & REQ-SAB-003: Vincular cuenta social a funcionario y luego desvincular.
    """
    plat = (await async_db.execute(
        SocialPlatform.__table__.select().where(SocialPlatform.name == SocialPlatformType.FACEBOOK.value)
    )).first()

    bind_req = BindSocialAccountRequest(
        employee_id="FUNC-2026-001",
        platform_id=plat.id,
        current_username="carlos.quispe.elalto",
        external_user_id="fb_uid_12345678",
        profile_url="https://facebook.com/carlos.quispe.elalto",
    )

    # 1. Vincular
    acc = await SocialAccountService.bind_account(async_db, bind_req, mock_user)
    assert acc.id is not None
    assert acc.employee_id == "FUNC-2026-001"
    assert acc.binding_status == BindingStatus.ACTIVE.value
    assert acc.current_username == "carlos.quispe.elalto"

    # 2. Desvincular preservando historial
    unbound = await SocialAccountService.unbind_account(
        async_db,
        acc.id,
        reason="Solicitud expresa del funcionario",
        current_user=mock_user,
    )
    assert unbound.binding_status == BindingStatus.INACTIVE.value


@pytest.mark.asyncio
async def test_username_change_history_tracking(async_db, mock_user):
    """
    T-302 / REQ-SAB-002: Actualizar @username crea automáticamente un registro en UsernameHistory.
    """
    plat = (await async_db.execute(
        SocialPlatform.__table__.select().where(SocialPlatform.name == SocialPlatformType.TIKTOK.value)
    )).first()

    bind_req = BindSocialAccountRequest(
        employee_id="FUNC-2026-001",
        platform_id=plat.id,
        current_username="@carlos_tk_original",
    )
    acc = await SocialAccountService.bind_account(async_db, bind_req, mock_user)

    # Actualizar alias
    updated = await SocialAccountService.update_username(
        async_db,
        acc.id,
        new_username="@carlos_tk_renombrado",
        current_user=mock_user,
    )
    assert updated.current_username == "@carlos_tk_renombrado"

    # Verificar que se registró en UsernameHistory
    assert len(updated.username_history) == 1
    h_entry = updated.username_history[0]
    assert h_entry.previous_username == "@carlos_tk_original"
    assert h_entry.new_username == "@carlos_tk_renombrado"
    assert h_entry.correlation_id is not None
