"""
Routers de Autenticación y Gestión de Usuarios — GAMEA Social Monitor
"""

import uuid

from core.audit.service import record_audit_event
from core.pagination import PageResponse
from core.security.auth import CurrentUserDep, get_current_user
from core.security.rbac import require_roles
from database import get_async_db
from dependencies import PaginationDep
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from modules.iam.models import Role, User
from modules.iam.schemas import (
    LoginRequest,
    RefreshTokenRequest,
    RoleResponse,
    TokenResponse,
    UserCreate,
    UserResponse,
    UserRolesUpdate,
    UserUpdate,
)
from modules.iam.service import IAMService
from modules.shared.enums import AuditAction, UserRole
from modules.shared.exceptions import (
    AuthenticationException,
    EntityNotFoundException,
    ValidationException,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

auth_router = APIRouter()
users_router = APIRouter()
roles_router = APIRouter()


from core.security.limiter import limiter

# -----------------------------------------------------------------------------
# Endpoints de Autenticación (/api/v1/auth)
# -----------------------------------------------------------------------------

@auth_router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    req: LoginRequest,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Inicia sesión en el sistema y retorna Access y Refresh Tokens JWT.
    Bloquea la cuenta por 15 minutos tras 5 intentos fallidos consecutivos (BR-IAM-002).
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    try:
        user_email = req.email or req.username or ""
        return await IAMService.authenticate_user(
            db=db,
            email=user_email,
            password=req.password,
            ip_address=client_ip,
            user_agent=user_agent,
        )
    except AuthenticationException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    req: RefreshTokenRequest,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Emite un nuevo Access Token a partir de un Refresh Token válido.
    """
    try:
        return await IAMService.refresh_access_token(db, req.refresh_token)
    except AuthenticationException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


@auth_router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    current_user: CurrentUserDep,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Cierra la sesión del usuario actual y registra evento en auditoría (Principio X).
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    await record_audit_event(
        db=db,
        action=AuditAction.LOGOUT,
        entity_name="User",
        entity_id=str(current_user.id),
        user_id=str(current_user.id),
        user_email=current_user.email,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    await db.commit()
    return {"detail": "Sesión cerrada exitosamente."}


@auth_router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: CurrentUserDep):
    """
    Retorna el perfil del usuario autenticado actualmente.
    """
    return UserResponse.model_validate(current_user)


# -----------------------------------------------------------------------------
# Endpoints de Gestión de Usuarios (/api/v1/users)
# -----------------------------------------------------------------------------

@users_router.get("/", response_model=PageResponse[UserResponse])
async def list_users(
    pagination: PaginationDep,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.AUDITOR, UserRole.DIRECTOR)),
):
    """
    Consulta paginada de usuarios institucionales.
    """
    users, total = await IAMService.list_users(
        db=db,
        offset=pagination.offset,
        limit=pagination.limit,
    )
    items = [UserResponse.model_validate(u) for u in users]
    return PageResponse.create(items=items, total=total, page=pagination.page, page_size=pagination.page_size)


@users_router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """
    Crea un nuevo usuario institucional.
    Exclusivo para rol SUPER_ADMIN.
    """
    try:
        user = await IAMService.create_user(db=db, user_in=user_in, current_user=current_user)
        return UserResponse.model_validate(user)
    except ValidationException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@users_router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """
    Obtiene la información de un usuario específico.
    """
    user = await IAMService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    # Control de acceso: Solo el mismo usuario, SUPER_ADMIN, AUDITOR o DIRECTOR pueden consultarlo
    is_self = current_user.id == user.id
    user_roles_set = {r.name for r in current_user.roles}
    privileged = {UserRole.SUPER_ADMIN.value, UserRole.AUDITOR.value, UserRole.DIRECTOR.value}
    if not is_self and not user_roles_set.intersection(privileged):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes.")

    return UserResponse.model_validate(user)


@users_router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """
    Actualiza datos de un usuario. Exclusivo para SUPER_ADMIN.
    """
    try:
        user = await IAMService.update_user(db, user_id, user_in, current_user)
        return UserResponse.model_validate(user)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@users_router.patch("/{user_id}/roles", response_model=UserResponse)
async def assign_user_roles(
    user_id: uuid.UUID,
    roles_in: UserRolesUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """
    Asigna roles a un usuario institucional. Exclusivo para SUPER_ADMIN (BR-IAM-008).
    """
    try:
        user = await IAMService.assign_roles(db, user_id, roles_in.role_names, current_user)
        return UserResponse.model_validate(user)
    except (EntityNotFoundException, ValidationException) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@users_router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def deactivate_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """
    Baja lógica de usuario (BR-IAM-009). Nunca se elimina físicamente.
    """
    try:
        await IAMService.deactivate_user(db, user_id, current_user)
        return {"detail": "Usuario desactivado correctamente."}
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


# -----------------------------------------------------------------------------
# Endpoints de Roles (/api/v1/roles)
# -----------------------------------------------------------------------------

@roles_router.get("/", response_model=list[RoleResponse])
async def list_roles(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna el catálogo de los 7 roles constitucionales y sus permisos.
    """
    stmt = select(Role).options(selectinload(Role.permissions)).order_by(Role.name)
    result = await db.execute(stmt)
    roles = list(result.scalars().all())
    return [RoleResponse.model_validate(r) for r in roles]
