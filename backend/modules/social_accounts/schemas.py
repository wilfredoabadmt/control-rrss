"""
Esquemas Pydantic para Cuentas Sociales e Institucionales — GAMEA Social Monitor
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SocialPlatformResponse(BaseModel):
    id: uuid.UUID
    name: str
    display_name: str
    is_active: bool
    api_version: str

    model_config = {"from_attributes": True}


class BindSocialAccountRequest(BaseModel):
    employee_id: str = Field(..., description="ID del funcionario a vincular")
    platform_id: uuid.UUID = Field(..., description="ID de la plataforma social")
    current_username: str = Field(..., min_length=2, max_length=100, description="Username o @handle")
    external_user_id: str | None = Field(None, max_length=100, description="ID permanente de la red social")
    profile_url: str | None = Field(None, max_length=255, description="URL del perfil social")


class UnbindSocialAccountRequest(BaseModel):
    reason: str | None = Field("Desvinculación solicitada por el usuario", max_length=255)


class UpdateUsernameRequest(BaseModel):
    new_username: str = Field(..., min_length=2, max_length=100, description="Nuevo username en la plataforma")


class UsernameHistoryResponse(BaseModel):
    id: uuid.UUID
    previous_username: str
    new_username: str
    changed_at: datetime
    correlation_id: str

    model_config = {"from_attributes": True}


class SocialAccountResponse(BaseModel):
    id: uuid.UUID
    employee_id: str
    platform_id: uuid.UUID
    external_user_id: str | None = None
    current_username: str
    profile_url: str | None = None
    binding_status: str
    verified_at: datetime | None = None
    created_at: datetime
    platform: SocialPlatformResponse | None = None

    model_config = {"from_attributes": True}


class InstitutionalAccountCreate(BaseModel):
    platform_id: uuid.UUID
    external_page_id: str = Field(..., min_length=1, max_length=100, description="Page ID oficial")
    account_name: str = Field(..., min_length=2, max_length=150, description="Nombre oficial")
    handle: str = Field(..., min_length=2, max_length=100, description="@handle oficial")
    access_token: str | None = Field(None, description="Token de acceso para APIs (será cifrado)")
    is_monitored: bool = Field(default=True)


class InstitutionalAccountResponse(BaseModel):
    id: uuid.UUID
    platform_id: uuid.UUID
    external_page_id: str
    account_name: str
    handle: str
    token_expires_at: datetime | None = None
    is_monitored: bool
    created_at: datetime
    platform: SocialPlatformResponse | None = None

    model_config = {"from_attributes": True}
