"""
Pruebas de Publicaciones Institucionales, Campañas y Metas de Cumplimiento — GAMEA Social Monitor
Principio IX: Modelo Normalizado
Principio XI: Ingesta Idempotente
REQ-PUB-002, REQ-PUB-003, REQ-PUB-004
"""

import uuid
from datetime import UTC, datetime

import pytest
import pytest_asyncio
from database import Base
from modules.employees.models import OrganizationalUnit
from modules.iam.models import User
from modules.publications.schemas import (
    MonitoringCampaignCreate,
    MonitoringTargetCreate,
    PublicationCreate,
)
from modules.publications.service import PublicationService
from modules.shared.enums import SocialPlatformType
from modules.social_accounts.models import SocialPlatform
from modules.social_accounts.seed import seed_social_platforms
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        await seed_social_platforms(session)

        # Crear unidad organizacional base para metas
        unit = OrganizationalUnit(
            id=uuid.uuid4(),
            name="Dirección de Comunicación Social",
            code="DIR-COM-01",
            status="ACTIVE",
        )
        session.add(unit)
        await session.commit()
        yield session

    await engine.dispose()


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email="operador.redes@elalto.gob.bo",
        full_name="Operador Publicaciones",
        password_hash="hash",
    )


@pytest.mark.asyncio
async def test_publication_creation_and_idempotency(async_db: AsyncSession, mock_user: User):
    """
    REQ-PUB-002 & Principio XI: Registro de publicación e ingesta estrictamente idempotente.
    Insertar dos veces el mismo (platform_id, external_post_id) debe retornar el registro existente.
    """
    plat = (await async_db.execute(
        SocialPlatform.__table__.select().where(SocialPlatform.name == SocialPlatformType.FACEBOOK.value)
    )).first()

    pub_in = PublicationCreate(
        platform_id=plat.id,
        external_post_id="fb_post_999888777",
        post_url="https://facebook.com/gamea/posts/999888777",
        published_at=datetime(2026, 3, 15, 14, 30, tzinfo=UTC),
        content_text="Entrega de nuevo distribuidor vial en la Ceja de El Alto #GAMEA",
        media_type="POST",
        is_monitored=True,
    )

    # 1. Primera creación
    pub1 = await PublicationService.create_publication(async_db, pub_in, mock_user)
    assert pub1.id is not None
    assert pub1.external_post_id == "fb_post_999888777"
    assert pub1.is_monitored is True

    # 2. Segunda creación (idéntica) -> Idempotencia
    pub2 = await PublicationService.create_publication(async_db, pub_in, mock_user)
    assert pub2.id == pub1.id
    assert pub2.external_post_id == pub1.external_post_id

    # Verificar que solo hay 1 registro en la base de datos
    pubs, total = await PublicationService.list_publications(async_db, platform_id=plat.id)
    assert total == 1
    assert len(pubs) == 1


@pytest.mark.asyncio
async def test_campaign_creation_and_publication_association(async_db: AsyncSession, mock_user: User):
    """
    REQ-PUB-003: Creación de Campañas de Monitoreo y vinculación de publicaciones (M:N).
    """
    plat = (await async_db.execute(
        SocialPlatform.__table__.select().where(SocialPlatform.name == SocialPlatformType.TIKTOK.value)
    )).first()

    # Crear dos publicaciones
    pub1 = await PublicationService.create_publication(
        async_db,
        PublicationCreate(
            platform_id=plat.id,
            external_post_id="tt_video_001",
            content_text="TikTok 1: Inicio de obras viales",
            media_type="VIDEO",
        ),
        mock_user,
    )

    pub2 = await PublicationService.create_publication(
        async_db,
        PublicationCreate(
            platform_id=plat.id,
            external_post_id="tt_video_002",
            content_text="TikTok 2: Avance de luminarias El Alto",
            media_type="VIDEO",
        ),
        mock_user,
    )

    # Crear Campaña asociando pub1
    camp_in = MonitoringCampaignCreate(
        title="Campaña Obras El Alto Adelante 2026",
        description="Monitoreo de impacto institucional de obras de infraestructura",
        start_date=datetime(2026, 1, 1, tzinfo=UTC),
        is_active=True,
        publication_ids=[pub1.id],
    )
    campaign = await PublicationService.create_campaign(async_db, camp_in, mock_user)
    assert campaign.id is not None
    assert campaign.title == "Campaña Obras El Alto Adelante 2026"

    # Obtener detalle con publicaciones
    camp_detail = await PublicationService.get_campaign_detail(async_db, campaign.id)
    assert camp_detail is not None
    assert len(camp_detail.publications) == 1
    assert camp_detail.publications[0].id == pub1.id

    # Asociar pub2 a la campaña
    camp_updated = await PublicationService.add_publications_to_campaign(
        async_db,
        campaign.id,
        [pub2.id],
        mock_user,
    )
    assert len(camp_updated.publications) == 2


@pytest.mark.asyncio
async def test_campaign_monitoring_targets(async_db: AsyncSession, mock_user: User):
    """
    REQ-PUB-004: Metas Institucionales por Unidad Organizacional dentro de una campaña.
    """
    # Obtener la unidad creada en la fixture
    unit = (await async_db.execute(
        OrganizationalUnit.__table__.select().where(OrganizationalUnit.code == "DIR-COM-01")
    )).first()

    # Crear campaña
    camp_in = MonitoringCampaignCreate(
        title="Campaña Campaña Salud 2026",
        description="Meta de difusión para Dirección de Comunicación",
        start_date=datetime(2026, 3, 1, tzinfo=UTC),
    )
    campaign = await PublicationService.create_campaign(async_db, camp_in, mock_user)

    # 1. Establecer meta de 85% para DIR-COM-01
    target_in = MonitoringTargetCreate(
        organizational_unit_id=unit.id,
        target_percentage=85.0,
        target_count=150,
        description="Meta mínima de interacciones compartidas",
    )
    target = await PublicationService.set_campaign_target(async_db, campaign.id, target_in, mock_user)
    assert target.campaign_id == campaign.id
    assert target.organizational_unit_id == unit.id
    assert target.target_percentage == 85.0
    assert target.target_count == 150

    # 2. Actualizar la misma meta al 95%
    target_update = MonitoringTargetCreate(
        organizational_unit_id=unit.id,
        target_percentage=95.0,
        target_count=200,
        description="Meta ajustada tras reestructuración",
    )
    target_updated = await PublicationService.set_campaign_target(async_db, campaign.id, target_update, mock_user)
    assert target_updated.target_percentage == 95.0
    assert target_updated.target_count == 200

    # Verificar en detalle de campaña
    camp_detail = await PublicationService.get_campaign_detail(async_db, campaign.id)
    assert len(camp_detail.targets) == 1
    assert camp_detail.targets[0].target_percentage == 95.0
