"""
Seed de Plataformas de Redes Sociales — GAMEA Social Monitor
"""


from modules.shared.enums import SocialPlatformType
from modules.social_accounts.models import SocialPlatform
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

INITIAL_PLATFORMS = [
    {
        "name": SocialPlatformType.FACEBOOK.value,
        "display_name": "Facebook / Meta",
        "api_version": "v20.0",
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
    """Crea las plataformas de redes sociales iniciales si no existen."""
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
            seeded.append(existing)

    await session.commit()
    return seeded
