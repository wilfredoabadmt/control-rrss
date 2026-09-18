"""
Esquemas Pydantic para Interacciones y Evidencias — GAMEA Social Monitor
"""

import uuid
from datetime import datetime

from modules.shared.enums import CaptureMethod, DataOriginType
from pydantic import BaseModel, ConfigDict, Field


class InteractionCreate(BaseModel):
    publication_id: uuid.UUID
    platform_id: uuid.UUID
    interaction_type: str = Field(..., description="COMMENT, LIKE, SHARE, REPLY")
    external_interaction_id: str | None = Field(None, description="ID único externo del comentario o reacción")
    external_post_id: str | None = None
    external_author_id: str | None = Field(None, description="ID social del autor (Graph API / TikTok API)")
    external_author_name: str | None = None
    content_text: str | None = None
    reaction_type: str | None = None
    external_created_at: datetime | None = None
    capture_method: str = CaptureMethod.POLLING.value
    api_version: str | None = "v26.0"
    data_origin_type: str = DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value
    source_platform: str | None = None
    source_account_id: uuid.UUID | None = None
    raw_payload: str | None = Field(None, description="Payload JSON crudo para generación de evidencia criptográfica")


class InteractionEvidenceResponse(BaseModel):
    id: uuid.UUID
    interaction_id: uuid.UUID
    evidence_type: str
    content_hash: str | None = None
    created_at: datetime
    created_by_user_id: str | None = None

    model_config = ConfigDict(from_attributes=True)


class InteractionResponse(BaseModel):
    id: uuid.UUID
    publication_id: uuid.UUID
    platform_id: uuid.UUID
    interaction_type: str
    external_interaction_id: str | None = None
    external_post_id: str | None = None
    external_author_id: str | None = None
    external_author_name: str | None = None
    content_text: str | None = None
    reaction_type: str | None = None
    external_created_at: datetime | None = None
    captured_at: datetime
    capture_method: str
    api_version: str | None = None
    data_origin_type: str
    source_platform: str | None = None
    source_account_id: uuid.UUID | None = None
    raw_payload_ref: str | None = None
    correlation_id: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InteractionUserItem(BaseModel):
    """Usuario único que interactuó en redes sociales (comentario o reacción)."""
    external_author_id: str | None = None
    external_author_name: str | None = None
    total_interactions: int = 0
    comments_count: int = 0
    reactions_count: int = 0
    shares_count: int = 0
    platforms: list[str] = []
    first_interaction_at: datetime | None = None
    last_interaction_at: datetime | None = None
