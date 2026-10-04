"""
Esquemas Pydantic para el Centro de Ingesta, Monitoreo y Matriz de Fiscalización
GAMEA Social Monitor — Cumplimiento SDD v1.0.0
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ConnectorConfigItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform_name: str = Field(..., description="FACEBOOK o TIKTOK")
    target_account_id: str = Field(default="", description="ID o handle oficial de la página/canal")
    display_name: str = Field(default="", description="Nombre institucional descriptivo")
    access_token: str | None = Field(default=None, description="Token o clave (solo para actualización)")
    api_secret: str | None = Field(default=None, description="Secret o clave de sesión (solo para actualización)")
    has_token: bool = Field(default=False, description="Indica si existe un token configurado")
    has_secret: bool = Field(default=False, description="Indica si existe un secret configurado")
    api_version: str = Field(default="v20.0")
    extraction_mode: str = Field(default="OFFICIAL_API", description="OFFICIAL_API, HYBRID_SCRAPER, MANUAL_ASSISTED")
    rate_limit_per_minute: int = Field(default=60)
    max_posts_per_sync: int = Field(default=25)
    max_comments_per_post: int = Field(default=200)
    is_active: bool = Field(default=True)
    last_sync_at: datetime | None = None
    last_status: str = Field(default="CONFIGURED")
    status_message: str | None = None


class ConnectorConfigsResponse(BaseModel):
    configs: list[ConnectorConfigItem]


class ConnectorConfigUpdateRequest(BaseModel):
    configs: list[ConnectorConfigItem]


class TestConnectionRequest(BaseModel):
    __test__ = False
    platform_name: str
    target_account_id: str | None = None
    access_token: str | None = None
    api_secret: str | None = None
    extraction_mode: str = "OFFICIAL_API"


class TestConnectionResponse(BaseModel):
    __test__ = False
    platform_name: str
    success: bool
    status: str
    message: str
    account_info: dict[str, Any] | None = None



class MonitoredPersonCreate(BaseModel):
    ci: str = Field(..., min_length=4, max_length=50, description="Cédula de Identidad / ID Funcionario")
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: str = Field(..., min_length=2, max_length=100)
    department: str = Field(default="Secretaría Municipal Central", max_length=150)
    position: str = Field(default="Funcionario Municipal", max_length=150)
    email: str | None = Field(default=None, max_length=150)
    facebook_account: str | None = Field(default=None, max_length=100, description="@handle, username o ID de Facebook")
    facebook_profile_url: str | None = Field(default=None, max_length=255)
    tiktok_account: str | None = Field(default=None, max_length=100, description="@handle o username de TikTok")
    tiktok_profile_url: str | None = Field(default=None, max_length=255)


class MonitoredPersonBulkImportRequest(BaseModel):
    raw_text: str = Field(..., description="Texto con formato CSV o JSON de personas a monitorear")
    delimiter: str = Field(default=",", description="Delimitador para CSV (coma, punto y coma o tab)")


class MonitoredPersonBulkImportResponse(BaseModel):
    total_parsed: int
    created_count: int
    updated_count: int
    failed_count: int
    errors: list[str]


class MonitoredPersonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ci: str
    first_name: str
    last_name: str
    full_name: str
    department: str
    position: str
    email: str | None
    facebook_account: str | None
    facebook_profile_url: str | None
    tiktok_account: str | None
    tiktok_profile_url: str | None
    status: str
    created_at: datetime


class RunSyncRequest(BaseModel):
    platform: str = Field(default="ALL", description="ALL, FACEBOOK, TIKTOK")
    publication_ids: list[uuid.UUID] | None = Field(default=None, description="Publicaciones específicas a evaluar")
    fetch_new_posts: bool = Field(default=True, description="Buscar publicaciones recientes en las cuentas oficiales")
    max_posts: int = Field(default=10, ge=1, le=50)


class RunSyncResponse(BaseModel):
    job_id: uuid.UUID
    status: str
    platform: str
    posts_processed: int
    interactions_extracted: int
    matched_interactions: int
    new_interactions_created: int
    execution_time_seconds: float
    details: str


class ActivityMatrixPersonPost(BaseModel):
    publication_id: uuid.UUID
    platform: str
    external_post_id: str
    post_url: str | None
    post_title: str
    published_at: datetime | None
    reaction_type: str | None = Field(default=None, description="LIKE, LOVE, CARE, HAHA, WOW, SAD, ANGRY o None")
    comment_text: str | None = None
    comment_created_at: datetime | None = None
    verification_status: str = Field(default="NOT_FOUND", description="CONFIRMED, OBSERVED, API_RESTRICTED, NOT_FOUND")
    epistemic_status_display: str


class ActivityMatrixRow(BaseModel):
    employee_id: str
    full_name: str
    department: str
    position: str
    facebook_handle: str | None
    tiktok_handle: str | None
    total_reactions: int
    total_comments: int
    has_participated: bool
    posts: list[ActivityMatrixPersonPost]


class ActivityMatrixSummary(BaseModel):
    total_monitored_persons: int
    total_participated: int
    participation_percentage: float
    total_reactions: int
    total_comments: int
    reactions_by_type: dict[str, int]
    total_publications_evaluated: int


class ActivityMatrixResponse(BaseModel):
    summary: ActivityMatrixSummary
    rows: list[ActivityMatrixRow]


class ConnectorVariableDetail(BaseModel):
    key: str = Field(..., description="Nombre de la variable en el sistema, ej. FACEBOOK_APP_ID")
    label: str = Field(..., description="Nombre legible del parámetro")
    configured: bool = Field(..., description="Indica si existe un valor real")
    is_mock: bool = Field(default=False, description="Indica si el valor configurado es solo una plantilla/mock")
    masked_value: str = Field(..., description="Valor con máscara de seguridad o indicación de faltante")
    status_badge: str = Field(..., description="CONFIGURADO, MOCK_DEMO, o FALTANTE")
    source: str = Field(default="ENV", description="ENV, DATABASE, o NONE")
    required: bool = Field(default=True)
    description: str = Field(default="")


class MissingDataNotice(BaseModel):
    variable_name: str
    impact: str
    instructions: str


class ConnectorDiagnosticDetail(BaseModel):
    platform_name: str
    display_name: str
    icon_type: str
    api_version: str
    overall_status: str  # "OPERATIONAL", "PARTIAL", "NOT_CONFIGURED"
    status_label: str  # "CONECTADO / OPERATIVO", "CONFIGURACIÓN INCOMPLETA", "FALTA DE DATOS"
    target_account: str
    rate_limit_display: str
    variables: list[ConnectorVariableDetail]
    missing_variables: list[MissingDataNotice]
    has_missing_data: bool
    diagnostic_summary: str
    last_checked_at: str


class ConnectorsDiagnosticResponse(BaseModel):
    connectors: list[ConnectorDiagnosticDetail]
    system_env: str
    all_operational: bool
    total_missing_variables: int
