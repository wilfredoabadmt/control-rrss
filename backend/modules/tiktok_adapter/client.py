"""
Cliente de TikTok Display API / Research API — GAMEA Social Monitor
Principio XII: Principio Abierto/Cerrado para Plataformas
Principio V: No Inventar Datos
REQ-TKI-001, REQ-TKI-002, REQ-TKI-003
"""

from typing import Any

import httpx
from modules.shared.enums import VerificationStatus
from modules.shared.exceptions import AuthenticationException, RateLimitExceededException


class TikTokClient:
    """
    Cliente asincrónico para la API oficial de TikTok.
    Captura publicaciones propias y métricas agregadas. Cumple con la restricción
    de API que no permite listar identidades individuales de usuarios (API_RESTRICTED).
    """

    def __init__(
        self,
        base_url: str = "https://open.tiktokapis.com/v2",
        client: httpx.AsyncClient | None = None,
    ):
        self.base_url = base_url
        self._client = client

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=30.0)

    async def fetch_videos(
        self,
        access_token: str,
        cursor: int | None = None,
        max_count: int = 20,
    ) -> tuple[list[dict[str, Any]], int | None, bool]:
        """
        Obtiene la lista de videos publicados por la cuenta institucional del GAMEA (REQ-TKI-001).
        Retorna (videos_normalizados, next_cursor, has_more).
        """
        client = await self._get_client()
        url = f"{self.base_url}/video/list/"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        params: dict[str, Any] = {
            "fields": "id,title,video_description,create_time,share_url,view_count,like_count,comment_count,share_count",
        }
        body: dict[str, Any] = {"max_count": max_count}
        if cursor is not None:
            body["cursor"] = cursor

        resp = await client.post(url, headers=headers, params=params, json=body)

        if resp.status_code == 429:
            raise RateLimitExceededException(retry_after_seconds=60)
        if resp.status_code in (401, 403):
            raise AuthenticationException(f"Token de TikTok inválido o expirado: {resp.text}")
        resp.raise_for_status()

        data = resp.json()
        error_code = data.get("error", {}).get("code")
        if error_code and error_code != "ok":
            raise AuthenticationException(f"Error de TikTok API: {data.get('error')}")

        data_payload = data.get("data", {})
        raw_videos = data_payload.get("videos", [])
        has_more = data_payload.get("has_more", False)
        next_cursor = data_payload.get("cursor") if has_more else None

        normalized = []
        for v in raw_videos:
            normalized.append({
                "external_post_id": v.get("id"),
                "post_url": v.get("share_url"),
                "content_text": v.get("title") or v.get("video_description"),
                "published_at": v.get("create_time"),
                "metrics": {
                    "views": v.get("view_count", 0),
                    "likes": v.get("like_count", 0),
                    "comments": v.get("comment_count", 0),
                    "shares": v.get("share_count", 0),
                },
                "raw": v,
            })

        return normalized, next_cursor, has_more

    @staticmethod
    def get_comment_epistemic_restriction_status() -> str:
        """
        Retorna el estado de restricción epistémica aplicable a interacciones individuales en TikTok.
        Conforme a REQ-TKI-002 y Principio V, la API no expone identidad de autores de comentarios/likes.
        """
        return VerificationStatus.API_RESTRICTED.value
