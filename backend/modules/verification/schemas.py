"""
Esquemas Pydantic para Verificación y Auditoría Epistémica — GAMEA Social Monitor
REQ-VER-001, REQ-VER-002, REQ-VER-003
"""

import uuid
from datetime import datetime

from modules.shared.enums import VerificationStatus
from pydantic import BaseModel, ConfigDict, Field


class ManualVerificationRequest(BaseModel):
    """
    Solicitud de verificación manual asistida efectuada por un operador o analista (REQ-VER-002).
    """
    interaction_id: uuid.UUID
    employee_id: str = Field(..., description="ID inmutable del funcionario (ej. FUNC-2026-001)")
    status: str = Field(
        VerificationStatus.DECLARED_CONFIRMED.value,
        description="Estado asignado: DECLARED_CONFIRMED o DECLARED_NOT_FOUND",
    )
    evidence_note: str = Field(
        ...,
        min_length=5,
        description="Justificación y referencia documental obligatoria de la evidencia revisada",
    )
    evidence_content: str | None = Field(
        None,
        description="Contenido textual o base64 de la captura si se adjunta directamente",
    )


class VerificationResponse(BaseModel):
    id: uuid.UUID
    interaction_id: uuid.UUID
    employee_id: str | None = None
    verification_status: str
    verification_method: str
    verified_at: datetime
    verified_by_user_id: str | None = None
    explanation: str
    evidence_id: uuid.UUID | None = None

    model_config = ConfigDict(from_attributes=True)


class ConsolidatedStatusResponse(BaseModel):
    employee_id: str
    publication_id: uuid.UUID
    interaction_type: str
    status: str
    explanation: str
    verified_at: datetime | None = None
