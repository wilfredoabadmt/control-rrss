"""
Endpoints de Verificación Epistémica — GAMEA Social Monitor
Principio V: No Inventar Datos
Principio XXVII: No Rankings
Principio XXVIII: Explicabilidad
REQ-VER-001, REQ-VER-002, REQ-VER-003
"""

import uuid

from core.security.auth import get_current_user
from core.security.rbac import require_roles
from database import get_async_db
from fastapi import APIRouter, Depends, Query, status
from modules.iam.models import User
from modules.interactions.models import Interaction
from modules.shared.enums import UserRole
from modules.shared.exceptions import EntityNotFoundException
from modules.verification.engine import VerificationEngine
from modules.verification.models import Verification
from modules.verification.schemas import (
    ConsolidatedStatusResponse,
    ManualVerificationRequest,
    VerificationResponse,
)
from modules.verification.service import VerificationService
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/verifications", tags=["Verification & Business Rules"])


@router.post(
    "/manual",
    response_model=VerificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Verificación manual asistida por operador (REQ-VER-002)",
)
async def manual_verification(
    req: ManualVerificationRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.COMMUNICATIONS_LEAD,
            UserRole.ANALYST,
        )
    ),
):
    """
    BR-VER-005: Solo ANALYST, COMMUNICATIONS_LEAD y SUPER_ADMIN pueden verificar manualmente.
    Asigna estado DECLARED_CONFIRMED o DECLARED_NOT_FOUND con justificación obligatoria.
    """
    verification = await VerificationService.manual_verification(
        db=db,
        req=req,
        current_user=current_user,
    )
    return verification


@router.post(
    "/auto/{interaction_id}",
    response_model=VerificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Ejecutar motor de verificación automática sobre una interacción (REQ-VER-001)",
)
async def trigger_auto_verification(
    interaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.COMMUNICATIONS_LEAD,
            UserRole.ANALYST,
            UserRole.OPERATOR,
        )
    ),
):
    stmt = (
        select(Interaction)
        .where(Interaction.id == interaction_id)
        .options(
            selectinload(Interaction.platform),
            selectinload(Interaction.publication),
        )
    )
    interaction = (await db.execute(stmt)).scalar_one_or_none()
    if not interaction:
        raise EntityNotFoundException("Interaction", str(interaction_id))

    verification = await VerificationEngine.verify_interaction(
        db=db,
        interaction=interaction,
        system_user_id=str(current_user.id),
    )
    return verification


@router.get(
    "/consolidated",
    response_model=ConsolidatedStatusResponse,
    summary="Consultar estado consolidado (funcionario x publicación x tipo) (REQ-VER-003)",
)
async def get_consolidated_status(
    employee_id: str = Query(..., description="ID del funcionario"),
    publication_id: uuid.UUID = Query(..., description="ID de la publicación"),
    interaction_type: str = Query(..., description="Tipo de interacción: COMMENT, LIKE, etc."),
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(get_current_user),
):
    return await VerificationService.get_consolidated_status(
        db=db,
        employee_id=employee_id,
        publication_id=publication_id,
        interaction_type=interaction_type,
    )


@router.get(
    "/{verification_id}",
    response_model=VerificationResponse,
    summary="Obtener detalle de una verificación con explicación completa (Principio XXVIII)",
)
async def get_verification_detail(
    verification_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Verification).where(Verification.id == verification_id)
    v = (await db.execute(stmt)).scalar_one_or_none()
    if not v:
        raise EntityNotFoundException("Verification", str(verification_id))
    return v
