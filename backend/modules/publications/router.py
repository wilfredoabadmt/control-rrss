"""
Routers para Publicaciones y Campañas de Monitoreo — GAMEA Social Monitor
"""

import uuid

from core.pagination import PageResponse
from core.security.auth import get_current_user
from core.security.rbac import require_roles
from database import get_async_db
from dependencies import PaginationDep
from fastapi import APIRouter, Depends, HTTPException, Query, status
from modules.iam.models import User
from modules.publications.models import MonitoringCampaign, Publication
from modules.publications.schemas import (
    AddPublicationsToCampaignRequest,
    MonitoringCampaignCreate,
    MonitoringCampaignDetailResponse,
    MonitoringCampaignResponse,
    MonitoringTargetCreate,
    MonitoringTargetResponse,
    PublicationCreate,
    PublicationResponse,
)
from modules.publications.service import PublicationService
from modules.shared.enums import UserRole
from modules.shared.exceptions import EntityNotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

publications_router = APIRouter()
campaigns_router = APIRouter()


# -----------------------------------------------------------------------------
# Endpoints de Publicaciones (/api/v1/publications)
# -----------------------------------------------------------------------------

@publications_router.get("/", response_model=PageResponse[PublicationResponse])
async def list_publications(
    pagination: PaginationDep,
    platform_id: uuid.UUID | None = Query(None, description="Filtrar por plataforma"),
    campaign_id: uuid.UUID | None = Query(None, description="Filtrar por campaña asociada"),
    is_monitored: bool | None = Query(None, description="Filtrar por estado de monitoreo"),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Consulta paginada de publicaciones institucionales sujetas a monitoreo."""
    pubs, total = await PublicationService.list_publications(
        db=db,
        platform_id=platform_id,
        campaign_id=campaign_id,
        is_monitored=is_monitored,
        offset=pagination.offset,
        limit=pagination.limit,
    )
    items = [PublicationResponse.model_validate(p) for p in pubs]
    return PageResponse.create(items=items, total=total, page=pagination.page, page_size=pagination.page_size)


@publications_router.post("/", response_model=PublicationResponse, status_code=status.HTTP_201_CREATED)
async def create_publication(
    pub_in: PublicationCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD, UserRole.OPERATOR)),
):
    """
    Registra una publicación institucional para monitoreo (REQ-PUB-002).
    Operación idempotente (Principio XI): Si el post_id ya existe, retorna el registro existente.
    """
    try:
        pub = await PublicationService.create_publication(db, pub_in, current_user)
        return PublicationResponse.model_validate(pub)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@publications_router.get("/{publication_id}", response_model=PublicationResponse)
async def get_publication(
    publication_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Consulta el detalle de una publicación monitoreada."""
    stmt = (
        select(Publication)
        .where(Publication.id == publication_id)
        .options(selectinload(Publication.platform))
    )
    pub = (await db.execute(stmt)).scalar_one_or_none()
    if not pub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicación no encontrada.")
    return PublicationResponse.model_validate(pub)


# -----------------------------------------------------------------------------
# Endpoints de Campañas de Monitoreo (/api/v1/campaigns)
# -----------------------------------------------------------------------------

@campaigns_router.get("/", response_model=list[MonitoringCampaignResponse])
async def list_campaigns(
    is_active: bool | None = Query(None, description="Filtrar por estado activo/inactivo"),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna el listado de campañas de monitoreo institucional."""
    stmt = select(MonitoringCampaign).order_by(MonitoringCampaign.start_date.desc())
    if is_active is not None:
        stmt = stmt.where(MonitoringCampaign.is_active == is_active)
    campaigns = list((await db.execute(stmt)).scalars().all())
    return [MonitoringCampaignResponse.model_validate(c) for c in campaigns]


@campaigns_router.post("/", response_model=MonitoringCampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    camp_in: MonitoringCampaignCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD)),
):
    """Crea una nueva campaña de monitoreo institucional (REQ-PUB-003)."""
    camp = await PublicationService.create_campaign(db, camp_in, current_user)
    return MonitoringCampaignResponse.model_validate(camp)


@campaigns_router.get("/{campaign_id}", response_model=MonitoringCampaignDetailResponse)
async def get_campaign_detail(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna el detalle completo de una campaña con sus publicaciones y metas."""
    camp = await PublicationService.get_campaign_detail(db, campaign_id)
    if not camp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaña no encontrada.")
    return MonitoringCampaignDetailResponse.model_validate(camp)


@campaigns_router.post("/{campaign_id}/publications", response_model=MonitoringCampaignDetailResponse)
async def add_publications_to_campaign(
    campaign_id: uuid.UUID,
    req: AddPublicationsToCampaignRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD)),
):
    """Vincula publicaciones a una campaña de monitoreo."""
    try:
        camp = await PublicationService.add_publications_to_campaign(db, campaign_id, req.publication_ids, current_user)
        return MonitoringCampaignDetailResponse.model_validate(camp)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@campaigns_router.post("/{campaign_id}/targets", response_model=MonitoringTargetResponse)
async def set_campaign_target(
    campaign_id: uuid.UUID,
    target_in: MonitoringTargetCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD)),
):
    """Define o actualiza la meta porcentual de interacción por unidad (REQ-PUB-004)."""
    try:
        target = await PublicationService.set_campaign_target(db, campaign_id, target_in, current_user)
        return MonitoringTargetResponse.model_validate(target)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
