"""
Endpoints de Interacciones y Evidencia — GAMEA Social Monitor
Principio V: No Inventar Datos
Principio XV: Ingesta Idempotente
REQ-INT-001, REQ-INT-002
"""

import uuid

from core.pagination import PageResponse
from core.security.auth import get_current_user
from core.security.rbac import require_roles
from database import get_async_db
from dependencies import PaginationDep
from fastapi import APIRouter, Depends, Query, status
from modules.iam.models import User
from modules.interactions.models import Interaction
from modules.interactions.processor import InteractionProcessor
from modules.interactions.schemas import InteractionCreate, InteractionResponse
from modules.shared.enums import UserRole
from modules.shared.exceptions import EntityNotFoundException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/interactions", tags=["Interactions & Evidence"])


@router.post(
    "/",
    response_model=InteractionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar o ingerir interacción de forma idempotente (REQ-INT-001)",
)
async def ingest_interaction(
    item_in: InteractionCreate,
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
    interaction = await InteractionProcessor.process_interaction(
        db=db,
        item=item_in,
        current_user_id=str(current_user.id),
    )
    return interaction


@router.get(
    "/",
    response_model=PageResponse[InteractionResponse],
    summary="Listar interacciones observadas con filtros",
)
async def list_interactions(
    pagination: PaginationDep,
    publication_id: uuid.UUID | None = Query(None),
    platform_id: uuid.UUID | None = Query(None),
    interaction_type: str | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(get_current_user),
):
    query = select(Interaction)
    count_query = select(func.count()).select_from(Interaction)

    if publication_id:
        query = query.where(Interaction.publication_id == publication_id)
        count_query = count_query.where(Interaction.publication_id == publication_id)
    if platform_id:
        query = query.where(Interaction.platform_id == platform_id)
        count_query = count_query.where(Interaction.platform_id == platform_id)
    if interaction_type:
        query = query.where(Interaction.interaction_type == interaction_type)
        count_query = count_query.where(Interaction.interaction_type == interaction_type)

    total = (await db.execute(count_query)).scalar_one()
    query = query.order_by(Interaction.captured_at.desc()).offset(pagination.offset).limit(pagination.limit)
    items = list((await db.execute(query)).scalars().all())

    return PageResponse.create(
        items=[InteractionResponse.model_validate(it) for it in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get(
    "/{interaction_id}",
    response_model=InteractionResponse,
    summary="Obtener detalle de una interacción",
)
async def get_interaction(
    interaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Interaction).where(Interaction.id == interaction_id)
    interaction = (await db.execute(stmt)).scalar_one_or_none()
    if not interaction:
        raise EntityNotFoundException("Interaction", str(interaction_id))
    return interaction
