"""
Capa de Servicios para Publicaciones y Campañas — GAMEA Social Monitor
Principio XI: Ingesta Idempotente
REQ-PUB-002, REQ-PUB-003, REQ-PUB-004
"""

import uuid

from core.audit.service import record_audit_event
from core.logging_config import get_correlation_id
from modules.employees.models import OrganizationalUnit
from modules.iam.models import User
from modules.publications.models import (
    MonitoringCampaign,
    MonitoringTarget,
    Publication,
)
from modules.publications.schemas import (
    MonitoringCampaignCreate,
    MonitoringTargetCreate,
    PublicationCreate,
)
from modules.shared.enums import AuditAction
from modules.shared.exceptions import EntityNotFoundException
from modules.social_accounts.models import SocialPlatform
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class PublicationService:

    # -------------------------------------------------------------------------
    # Publicaciones
    # -------------------------------------------------------------------------

    @staticmethod
    async def create_publication(
        db: AsyncSession,
        pub_in: PublicationCreate,
        current_user: User,
    ) -> Publication:
        """
        Registra una publicación institucional de forma estrictamente idempotente.
        Si la publicación ya existe en la misma plataforma, no la duplica.
        """
        cid = get_correlation_id()

        # 1. Validar plataforma (soporta UUID o nombre de plataforma como FACEBOOK/TIKTOK)
        plat = None
        plat_input = str(pub_in.platform_id).strip()
        try:
            plat_uuid = uuid.UUID(plat_input)
            stmt_plat = select(SocialPlatform).where(SocialPlatform.id == plat_uuid)
            plat = (await db.execute(stmt_plat)).scalar_one_or_none()
        except Exception:
            plat = None

        if not plat:
            stmt_plat_name = select(SocialPlatform).where(
                func.upper(SocialPlatform.name) == plat_input.upper()
            )
            plat = (await db.execute(stmt_plat_name)).scalar_one_or_none()

        if not plat:
            stmt_fallback = select(SocialPlatform).order_by(SocialPlatform.created_at.asc()).limit(1)
            plat = (await db.execute(stmt_fallback)).scalar_one_or_none()

        if not plat:
            raise EntityNotFoundException("SocialPlatform", plat_input)

        resolved_platform_id = plat.id

        # 2. Idempotencia: Verificar si el post_id ya existe en la plataforma (Principio XI)
        stmt_existing = select(Publication).where(
            Publication.platform_id == resolved_platform_id,
            Publication.external_post_id == pub_in.external_post_id.strip(),
        )
        existing = (await db.execute(stmt_existing)).scalar_one_or_none()
        if existing:
            return existing

        pub = Publication(
            platform_id=resolved_platform_id,
            institutional_account_id=pub_in.institutional_account_id,
            external_post_id=pub_in.external_post_id.strip(),
            post_url=pub_in.post_url,
            published_at=pub_in.published_at,
            content_text=pub_in.content_text,
            media_type=pub_in.media_type,
            is_monitored=pub_in.is_monitored,
        )
        db.add(pub)

        # Asociar a campañas si se indicaron
        if pub_in.campaign_ids:
            for c_id in pub_in.campaign_ids:
                c_uuid = uuid.UUID(str(c_id)) if not isinstance(c_id, uuid.UUID) else c_id
                stmt_c = select(MonitoringCampaign).where(MonitoringCampaign.id == c_uuid)
                camp = (await db.execute(stmt_c)).scalar_one_or_none()
                if camp:
                    pub.campaigns.append(camp)

        await record_audit_event(
            db=db,
            action=AuditAction.CREATE,
            entity_name="Publication",
            entity_id=str(pub.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            new_state={"external_post_id": pub.external_post_id, "platform": plat.name},
            correlation_id=cid,
        )
        await db.refresh(pub)
        return pub

    @staticmethod
    async def list_publications(
        db: AsyncSession,
        platform_id: uuid.UUID | None = None,
        campaign_id: uuid.UUID | None = None,
        is_monitored: bool | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Publication], int]:
        """Consulta paginada de publicaciones monitoreadas."""
        query = select(Publication)
        count_query = select(func.count()).select_from(Publication)

        if platform_id:
            query = query.where(Publication.platform_id == platform_id)
            count_query = count_query.where(Publication.platform_id == platform_id)
        if is_monitored is not None:
            query = query.where(Publication.is_monitored == is_monitored)
            count_query = count_query.where(Publication.is_monitored == is_monitored)
        if campaign_id:
            query = query.join(Publication.campaigns).where(MonitoringCampaign.id == campaign_id)
            count_query = count_query.join(Publication.campaigns).where(MonitoringCampaign.id == campaign_id)

        total = (await db.execute(count_query)).scalar_one()

        query = (
            query.order_by(Publication.published_at.desc())
            .offset(offset)
            .limit(limit)
            .options(selectinload(Publication.platform))
        )
        pubs = list((await db.execute(query)).scalars().all())
        return pubs, total

    # -------------------------------------------------------------------------
    # Campañas de Monitoreo
    # -------------------------------------------------------------------------

    @staticmethod
    async def create_campaign(
        db: AsyncSession,
        camp_in: MonitoringCampaignCreate,
        current_user: User,
    ) -> MonitoringCampaign:
        """Crea una campaña temática de monitoreo (REQ-PUB-003)."""
        cid = get_correlation_id()

        camp = MonitoringCampaign(
            title=camp_in.title.strip(),
            description=camp_in.description,
            start_date=camp_in.start_date,
            end_date=camp_in.end_date,
            is_active=camp_in.is_active,
        )

        if camp_in.publication_ids:
            stmt_pubs = select(Publication).where(Publication.id.in_(camp_in.publication_ids))
            pubs = list((await db.execute(stmt_pubs)).scalars().all())
            camp.publications = pubs

        db.add(camp)

        await record_audit_event(
            db=db,
            action=AuditAction.CREATE,
            entity_name="MonitoringCampaign",
            entity_id=str(camp.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            new_state={"title": camp.title, "start_date": camp.start_date.isoformat()},
            correlation_id=cid,
        )
        detailed = await PublicationService.get_campaign_detail(db, camp.id)
        return detailed or camp

    @staticmethod
    async def get_campaign_detail(db: AsyncSession, campaign_id: uuid.UUID) -> MonitoringCampaign | None:
        stmt = (
            select(MonitoringCampaign)
            .where(MonitoringCampaign.id == campaign_id)
            .options(
                selectinload(MonitoringCampaign.publications).selectinload(Publication.platform),
                selectinload(MonitoringCampaign.targets).selectinload(MonitoringTarget.organizational_unit),
            )
            .execution_options(populate_existing=True)
        )
        return (await db.execute(stmt)).scalar_one_or_none()

    @staticmethod
    async def add_publications_to_campaign(
        db: AsyncSession,
        campaign_id: uuid.UUID,
        publication_ids: list[uuid.UUID],
        current_user: User,
    ) -> MonitoringCampaign:
        """Asocia publicaciones a una campaña existente."""
        camp = await PublicationService.get_campaign_detail(db, campaign_id)
        if not camp:
            raise EntityNotFoundException("MonitoringCampaign", str(campaign_id))

        stmt_pubs = select(Publication).where(Publication.id.in_(publication_ids))
        new_pubs = list((await db.execute(stmt_pubs)).scalars().all())

        existing_ids = {p.id for p in camp.publications}
        added_count = 0
        for p in new_pubs:
            if p.id not in existing_ids:
                camp.publications.append(p)
                added_count += 1

        cid = get_correlation_id()
        await record_audit_event(
            db=db,
            action=AuditAction.UPDATE,
            entity_name="MonitoringCampaign",
            entity_id=str(camp.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            details={"operation": "ADD_PUBLICATIONS", "count": added_count},
            correlation_id=cid,
        )
        detailed = await PublicationService.get_campaign_detail(db, campaign_id)
        return detailed or camp

    @staticmethod
    async def set_campaign_target(
        db: AsyncSession,
        campaign_id: uuid.UUID,
        target_in: MonitoringTargetCreate,
        current_user: User,
    ) -> MonitoringTarget:
        """Define o actualiza la meta porcentual para una unidad organizacional (REQ-PUB-004)."""
        # Validar campaña
        stmt_camp = (
            select(MonitoringCampaign)
            .where(MonitoringCampaign.id == campaign_id)
            .options(selectinload(MonitoringCampaign.targets))
        )
        camp = (await db.execute(stmt_camp)).scalar_one_or_none()
        if not camp:
            raise EntityNotFoundException("MonitoringCampaign", str(campaign_id))

        # Validar unidad
        stmt_unit = select(OrganizationalUnit).where(OrganizationalUnit.id == target_in.organizational_unit_id)
        unit = (await db.execute(stmt_unit)).scalar_one_or_none()
        if not unit:
            raise EntityNotFoundException("OrganizationalUnit", str(target_in.organizational_unit_id))

        # Verificar si ya existe meta para esta unidad en esta campaña
        stmt_target = select(MonitoringTarget).where(
            MonitoringTarget.campaign_id == campaign_id,
            MonitoringTarget.organizational_unit_id == target_in.organizational_unit_id,
        )
        target = (await db.execute(stmt_target)).scalar_one_or_none()

        cid = get_correlation_id()
        if not target:
            target = MonitoringTarget(
                campaign_id=campaign_id,
                organizational_unit_id=target_in.organizational_unit_id,
                target_percentage=target_in.target_percentage,
                target_count=target_in.target_count,
                description=target_in.description,
            )
            camp.targets.append(target)
            db.add(target)
            action = AuditAction.CREATE
        else:
            target.target_percentage = target_in.target_percentage
            target.target_count = target_in.target_count
            target.description = target_in.description
            action = AuditAction.UPDATE

        await record_audit_event(
            db=db,
            action=action,
            entity_name="MonitoringTarget",
            entity_id=str(target.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            new_state={
                "campaign_id": str(campaign_id),
                "unit_id": str(unit.id),
                "target_percentage": target.target_percentage,
            },
            correlation_id=cid,
        )
        await db.refresh(target)
        return target
