"""
Esquemas Pydantic para Reportes Institucionales — GAMEA Social Monitor
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReportGenerateRequest(BaseModel):
    report_type: str = Field("VERIFICATION_STATUS", description="Tipo de reporte institucional")
    campaign_title: str | None = Field(None, description="Filtrar por título o contexto de campaña")


class ReportExecutionResponse(BaseModel):
    id: uuid.UUID
    report_type: str
    report_version: str
    generated_at: datetime
    file_hash: str | None = None
    file_path: str | None = None
    row_count: int
    status: str

    model_config = ConfigDict(from_attributes=True)
