"""
Esquemas Pydantic para IAM — GAMEA Social Monitor
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

# -----------------------------------------------------------------------------
# Esquemas de Permisos y Roles
# -----------------------------------------------------------------------------

class PermissionResponse(BaseModel):
    id: uuid.UUID
    code: str
    description: str

    model_config = {"from_attributes": True}


class RoleResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    is_system: bool
    permissions: list[PermissionResponse] = []

    model_config = {"from_attributes": True}


# -----------------------------------------------------------------------------
# Esquemas de Usuarios
# -----------------------------------------------------------------------------

class UserBase(BaseModel):
    email: EmailStr = Field(..., description="Correo institucional único")
    full_name: str = Field(..., min_length=3, max_length=150, description="Nombre completo")
    is_active: bool = Field(default=True, description="Estado de la cuenta")


class UserCreate(UserBase):
    password: str = Field(..., min_length=12, description="Contraseña institucional (mínimo 12 caracteres)")
    role_names: list[str] = Field(default=["VIEWER"], description="Roles asignados inicialmente")


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=3, max_length=150)
    is_active: bool | None = None


class UserRolesUpdate(BaseModel):
    role_names: list[str] = Field(..., min_length=1, description="Lista de nombres de roles a asignar")


class UserResponse(UserBase):
    id: uuid.UUID
    failed_login_attempts: int
    locked_until: datetime | None = None
    last_login_at: datetime | None = None
    created_at: datetime
    roles: list[RoleResponse] = []

    model_config = {"from_attributes": True}


# -----------------------------------------------------------------------------
# Esquemas de Autenticación
# -----------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Correo institucional")
    password: str = Field(..., description="Contraseña")


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="Access Token JWT")
    refresh_token: str = Field(..., description="Refresh Token JWT")
    token_type: str = Field(default="bearer", description="Tipo de token")
    expires_in_minutes: int = Field(..., description="Vigencia en minutos del access token")
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Token de refresco")


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., description="Contraseña actual")
    new_password: str = Field(..., min_length=12, description="Nueva contraseña cumpliendo política")
