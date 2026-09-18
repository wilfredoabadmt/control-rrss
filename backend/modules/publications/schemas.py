"""
Esquemas Pydantic para Publicaciones y Campañas de Monitoreo — GAMEA Social Monitor
"""

import uuid
from datetime import datetime

from modules.employees.schemas import OrganizationalUnitResponse
from modules.social_accounts.schemas import SocialPlatformResponse
from pydantic import BaseModel, Field


class PublicationBase(BaseModel):
    platform_id: uuid.UUID | str
    institutional_account_id: uuid.UUID | None = None
    external_post_id: str = Field(..., min_length=1, max_length=100, description="ID del post en Facebook/TikTok")
    post_url: str | None = Field(None, max_length=500)
    published_at: datetime = Field(default_factory=datetime.utcnow)
    content_text: str | None = None
    media_type: str = Field(default="POST")
    is_monitored: bool = Field(default=True)


class PublicationCreate(PublicationBase):
    campaign_ids: list[uuid.UUID | str] = Field(default=[], description="Campañas a las que se asocia")


class PublicationUpdate(BaseModel):
    is_monitored: bool | None = None
    content_text: str | None = None
    media_type: str | None = None


class PublicationResponse(PublicationBase):
    id: uuid.UUID
    last_sync_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    platform: SocialPlatformResponse | None = None

    model_config = {"from_attributes": True}


class MonitoringTargetBase(BaseModel):
    organizational_unit_id: uuid.UUID
    target_percentage: float = Field(default=80.0, ge=0.0, le=100.0, description="Meta porcentual de cumplimiento")
    target_count: int | None = Field(None, ge=0, description="Meta en cantidad absoluta de funcionarios")
    description: str | None = Field(None, max_length=255)


class MonitoringTargetCreate(MonitoringTargetBase):
    pass


class MonitoringTargetResponse(MonitoringTargetBase):
    id: uuid.UUID
    campaign_id: uuid.UUID
    created_at: datetime
    organizational_unit: OrganizationalUnitResponse | None = None

    model_config = {"from_attributes": True}


class MonitoringCampaignBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200, description="Título de la campaña")
    description: str | None = None
    start_date: datetime = Field(default_factory=datetime.utcnow)
    end_date: datetime | None = None
    is_active: bool = Field(default=True)


class MonitoringCampaignCreate(MonitoringCampaignBase):
    publication_ids: list[uuid.UUID] = Field(default=[])


class MonitoringCampaignUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=200)
    description: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool | None = None


class MonitoringCampaignResponse(MonitoringCampaignBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MonitoringCampaignDetailResponse(MonitoringCampaignResponse):
    publications: list[PublicationResponse] = []
    targets: list[MonitoringTargetResponse] = []

    model_config = {"from_attributes": True}


class AddPublicationsToCampaignRequest(BaseModel):
    publication_ids: list[uuid.UUID] = Field(..., min_length=1, description="Lista de IDs de publicaciones a vincular")
