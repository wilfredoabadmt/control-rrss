"""
Seed de Plataformas de Redes Sociales — GAMEA Social Monitor
"""


from config import settings
from modules.shared.enums import SocialPlatformType
from modules.social_accounts.models import SocialPlatform
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

INITIAL_PLATFORMS = [
    {
        "name": SocialPlatformType.FACEBOOK.value,
        "display_name": "Facebook / Meta",
        "api_version": settings.FACEBOOK_GRAPH_VERSION,
        "is_active": True,
    },
    {
        "name": SocialPlatformType.TIKTOK.value,
        "display_name": "TikTok",
        "api_version": "v2",
        "is_active": True,
    },
]


async def seed_social_platforms(session: AsyncSession) -> list[SocialPlatform]:
    """Crea o actualiza las plataformas de redes sociales iniciales (incluye versión de API vigente)."""
    seeded = []
    for p_data in INITIAL_PLATFORMS:
        stmt = select(SocialPlatform).where(SocialPlatform.name == p_data["name"])
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if not existing:
            platform = SocialPlatform(**p_data)
            session.add(platform)
            await session.flush()
            seeded.append(platform)
        else:
            # Actualizar la versión de API registrada (v20.0 fue retirada por Meta el 24/09/2026)
            if p_data.get("api_version") and existing.api_version != p_data["api_version"]:
                existing.api_version = p_data["api_version"]
                session.add(existing)
            seeded.append(existing)

    await session.commit()
    return seeded
