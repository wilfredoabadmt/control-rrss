"""
Routers para Cuentas Sociales e Institucionales — GAMEA Social Monitor
"""

import uuid

from core.security.auth import get_current_user
from core.security.rbac import require_roles
from database import get_async_db
from fastapi import APIRouter, Depends, HTTPException, status
from modules.iam.models import User
from modules.shared.enums import UserRole
from modules.shared.exceptions import EntityNotFoundException, ValidationException
from modules.social_accounts.models import (
    InstitutionalAccount,
    SocialAccount,
    SocialPlatform,
    UsernameHistory,
)
from modules.social_accounts.schemas import (
    BindSocialAccountRequest,
    InstitutionalAccountCreate,
    InstitutionalAccountResponse,
    SocialAccountResponse,
    SocialPlatformResponse,
    UnbindSocialAccountRequest,
    UpdateUsernameRequest,
    UsernameHistoryResponse,
)
from modules.social_accounts.service import SocialAccountService
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

social_accounts_router = APIRouter()


@social_accounts_router.get("/platforms", response_model=list[SocialPlatformResponse])
async def list_social_platforms(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna el catálogo de plataformas de redes sociales monitoreadas."""
    stmt = select(SocialPlatform).order_by(SocialPlatform.name)
    platforms = list((await db.execute(stmt)).scalars().all())
    return [SocialPlatformResponse.model_validate(p) for p in platforms]


@social_accounts_router.post("/bind", response_model=SocialAccountResponse, status_code=status.HTTP_201_CREATED)
async def bind_social_account(
    req: BindSocialAccountRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD, UserRole.OPERATOR)),
):
    """
    Vincula una cuenta social a un funcionario institucional (REQ-SAB-001).
    Valida unicidad para evitar que una misma cuenta pertenezca a varios funcionarios.
    """
    try:
        account = await SocialAccountService.bind_account(db, req, current_user)
        return SocialAccountResponse.model_validate(account)
    except (EntityNotFoundException, ValidationException) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@social_accounts_router.post("/{account_id}/unbind", response_model=SocialAccountResponse)
async def unbind_social_account(
    account_id: uuid.UUID,
    req: UnbindSocialAccountRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD, UserRole.OPERATOR)),
):
    """
    Desvincula una cuenta social preservando el historial de interacciones previas (REQ-SAB-003).
    """
    try:
        account = await SocialAccountService.unbind_account(db, account_id, req.reason or "Desvinculación", current_user)
        return SocialAccountResponse.model_validate(account)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@social_accounts_router.patch("/{account_id}/username", response_model=SocialAccountResponse)
async def update_social_username(
    account_id: uuid.UUID,
    req: UpdateUsernameRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD, UserRole.OPERATOR)),
):
    """
    Actualiza el username y crea registro inmutable en UsernameHistory (T-302 / REQ-SAB-002).
    """
    try:
        account = await SocialAccountService.update_username(db, account_id, req.new_username, current_user)
        return SocialAccountResponse.model_validate(account)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@social_accounts_router.get("/{account_id}/history", response_model=list[UsernameHistoryResponse])
async def get_username_history(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna el historial de cambios de alias y username de una cuenta social."""
    stmt = (
        select(UsernameHistory)
        .where(UsernameHistory.social_account_id == account_id)
        .order_by(UsernameHistory.changed_at.desc())
    )
    history = list((await db.execute(stmt)).scalars().all())
    return [UsernameHistoryResponse.model_validate(h) for h in history]


@social_accounts_router.get("/by-employee/{employee_id}", response_model=list[SocialAccountResponse])
async def list_employee_social_accounts(
    employee_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Consulta todas las cuentas de redes sociales vinculadas a un funcionario."""
    stmt = (
        select(SocialAccount)
        .where(SocialAccount.employee_id == employee_id.strip())
        .options(selectinload(SocialAccount.platform))
    )
    accounts = list((await db.execute(stmt)).scalars().all())
    return [SocialAccountResponse.model_validate(a) for a in accounts]


# -----------------------------------------------------------------------------
# Cuentas Institucionales
# -----------------------------------------------------------------------------

@social_accounts_router.post("/institutional", response_model=InstitutionalAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_institutional_account(
    acc_in: InstitutionalAccountCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD)),
):
    """Registra una página o canal institucional del GAMEA (REQ-PUB-001)."""
    acc = await SocialAccountService.create_institutional_account(db, acc_in, current_user)
    return InstitutionalAccountResponse.model_validate(acc)


@social_accounts_router.get("/institutional", response_model=list[InstitutionalAccountResponse])
async def list_institutional_accounts(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Lista las cuentas institucionales oficiales del municipio."""
    stmt = select(InstitutionalAccount).options(selectinload(InstitutionalAccount.platform)).order_by(InstitutionalAccount.account_name)
    accounts = list((await db.execute(stmt)).scalars().all())
    return [InstitutionalAccountResponse.model_validate(a) for a in accounts]
