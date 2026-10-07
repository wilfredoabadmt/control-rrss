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
    FacebookRecentPostItem,
    ImportPostFromUrlRequest,
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


def _publication_response(pub: Publication, m: dict[str, int] | None = None) -> PublicationResponse:
    """Construye la respuesta canónica de una publicación con sus métricas calculadas."""
    counts = m or {}
    return PublicationResponse(
        id=pub.id,
        platform_id=pub.platform_id,
        institutional_account_id=pub.institutional_account_id,
        external_post_id=pub.external_post_id,
        post_url=pub.post_url,
        published_at=pub.published_at,
        content_text=pub.content_text,
        title=pub.content_text,
        platform_name=pub.platform.name if pub.platform else "FACEBOOK",
        media_type=pub.media_type,
        is_monitored=pub.is_monitored,
        last_sync_at=pub.last_sync_at,
        created_at=pub.created_at,
        updated_at=pub.updated_at,
        platform=pub.platform,
        total_reactions=counts.get("reactions", 0),
        total_comments=counts.get("comments", 0),
        total_shares=counts.get("shares", 0),
        meta_reactions_total=pub.meta_reactions_total or 0,
        meta_reactions_by_type=dict(pub.meta_reactions_by_type or {}),
        meta_metrics_synced_at=pub.meta_metrics_synced_at,
    )


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
    """Consulta paginada de publicaciones institucionales sujetas a monitoreo con métricas calculadas."""
    pubs, total = await PublicationService.list_publications(
        db=db,
        platform_id=platform_id,
        campaign_id=campaign_id,
        is_monitored=is_monitored,
        offset=pagination.offset,
        limit=pagination.limit,
    )
    metrics_by_pub = await PublicationService.get_publication_metrics(db, [p.id for p in pubs])
    items = [
        _publication_response(p, metrics_by_pub.get(p.id))
        for p in pubs
    ]
    return PageResponse.create(items=items, total=total, page=pagination.page, page_size=pagination.page_size)


@publications_router.get("/facebook/page-posts", response_model=list[FacebookRecentPostItem])
async def get_facebook_recent_posts(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna las publicaciones más recientes de la página oficial de Facebook GAMEA para importación rápida."""
    return await PublicationService.get_facebook_recent_posts(db)


@publications_router.post("/import-from-url", response_model=PublicationResponse)
async def import_publication_from_url(
    req: ImportPostFromUrlRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD, UserRole.OPERATOR)),
):
    """Extrae el ID y registra automáticamente un post desde un link de Facebook o TikTok para monitoreo."""
    pub = await PublicationService.import_from_url(db, req, current_user)
    return _publication_response(pub)


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
        return _publication_response(pub)
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
    metrics = await PublicationService.get_publication_metrics(db, [pub.id])
    return _publication_response(pub, metrics.get(pub.id))



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
