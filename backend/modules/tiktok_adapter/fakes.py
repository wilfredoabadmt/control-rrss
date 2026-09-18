"""
Fakes y Simuladores de TikTok API para Pruebas Automatizadas — GAMEA Social Monitor
Principio XIX: Pruebas Exhaustivas y Fakes
"""

from typing import Any

from modules.shared.exceptions import AuthenticationException, RateLimitExceededException


class FakeTikTokClient:
    """
    Simulador determinista de TikTok Display API para pruebas unitarias e integración.
    """

    def __init__(
        self,
        simulate_rate_limit: bool = False,
        simulate_auth_error: bool = False,
    ):
        self.simulate_rate_limit = simulate_rate_limit
        self.simulate_auth_error = simulate_auth_error

    async def fetch_videos(
        self,
        _access_token: str,
        _cursor: int | None = None,
        _max_count: int = 20,
    ) -> tuple[list[dict[str, Any]], int | None, bool]:
        if self.simulate_rate_limit:
            raise RateLimitExceededException(retry_after_seconds=60)
        if self.simulate_auth_error:
            raise AuthenticationException("Simulated TikTok Auth Error: invalid_token")

        videos = [
            {
                "external_post_id": "tt_video_778899",
                "post_url": "https://www.tiktok.com/@gamea_oficial/video/778899",
                "content_text": "Avance de obras del nuevo paso a desnivel en la Ceja",
                "published_at": 1773576000,
                "metrics": {
                    "views": 25400,
                    "likes": 3200,
                    "comments": 410,
                    "shares": 180,
                },
                "raw": {"id": "tt_video_778899"},
            }
        ]
        return videos, None, False
