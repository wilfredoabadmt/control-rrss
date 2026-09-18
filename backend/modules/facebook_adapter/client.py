"""
Cliente de Facebook Graph API v26.0 / v20.0 — GAMEA Social Monitor
Principio XII: Principio Abierto/Cerrado para Plataformas
Principio XIV: Resiliencia del Sistema
Principio V: No Inventar Datos
REQ-FBI-001, REQ-FBI-002, REQ-FBI-003, REQ-FBI-004
"""

from typing import Any

import httpx
from config import settings
from modules.shared.exceptions import AuthenticationException, RateLimitExceededException


class FacebookGraphClient:
    """
    Cliente asincrónico para la API Graph de Meta.
    Maneja rigurosamente la privacidad de usuarios (campo 'from' opcional) y cuotas de tasa.
    """

    def __init__(
        self,
        api_version: str | None = None,
        base_url: str | None = None,
        client: httpx.AsyncClient | None = None,
    ):
        self.api_version = api_version or settings.FACEBOOK_GRAPH_VERSION
        self.base_url = base_url or f"https://graph.facebook.com/{self.api_version}"
        self._client = client

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=30.0)

    async def fetch_post_metadata(
        self,
        post_id: str,
        access_token: str,
    ) -> dict[str, Any]:
        """
        Obtiene metadatos de una publicación institucional (REQ-FBI-001).
        """
        client = await self._get_client()
        url = f"{self.base_url}/{post_id}"
        params = {
            "fields": "id,message,created_time,permalink_url,shares,attachments{media_type,url}",
            "access_token": access_token,
        }
        resp = await client.get(url, params=params)

        if resp.status_code == 429:
            raise RateLimitExceededException(retry_after_seconds=60)
        if resp.status_code in (401, 403):
            raise AuthenticationException(f"Token de Meta inválido o sin permisos: {resp.text}")
        resp.raise_for_status()
        return resp.json()

    async def fetch_comments(
        self,
        post_id: str,
        access_token: str,
        cursor: str | None = None,
        limit: int = 50,
    ) -> tuple[list[dict[str, Any]], str | None]:
        """
        Obtiene comentarios de una publicación (REQ-FBI-002).
        Maneja el campo 'from' de forma segura: si Meta no suministra el autor (debido a
        restricciones de privacidad), se preserva None sin generar datos ficticios.
        """
        client = await self._get_client()
        url = f"{self.base_url}/{post_id}/comments"
        params = {
            "fields": "id,message,created_time,from{id,name},like_count",
            "limit": limit,
            "access_token": access_token,
        }
        if cursor:
            params["after"] = cursor

        resp = await client.get(url, params=params)

        if resp.status_code == 429:
            raise RateLimitExceededException(retry_after_seconds=60)
        if resp.status_code in (401, 403):
            raise AuthenticationException(f"Token de Meta inválido o revocado: {resp.text}")
        resp.raise_for_status()

        data = resp.json()
        raw_items = data.get("data", [])
        normalized_comments = []

        for item in raw_items:
            author_info = item.get("from") or {}
            author_id = author_info.get("id")
            author_name = author_info.get("name")

            normalized_comments.append({
                "external_interaction_id": item.get("id"),
                "content_text": item.get("message"),
                "external_created_at": item.get("created_time"),
                "external_author_id": author_id,
                "external_author_name": author_name,
                "like_count": item.get("like_count", 0),
                "raw": item,
            })

        next_cursor = None
        paging = data.get("paging", {})
        cursors = paging.get("cursors", {})
        if paging.get("next") and cursors.get("after"):
            next_cursor = cursors.get("after")

        return normalized_comments, next_cursor

    async def fetch_reactions(
        self,
        post_id: str,
        access_token: str,
        cursor: str | None = None,
        limit: int = 100,
    ) -> tuple[list[dict[str, Any]], str | None]:
        """
        Obtiene reacciones de una publicación (REQ-FBI-003).
        """
        client = await self._get_client()
        url = f"{self.base_url}/{post_id}/reactions"
        params = {
            "fields": "id,name,type",
            "limit": limit,
            "access_token": access_token,
        }
        if cursor:
            params["after"] = cursor

        resp = await client.get(url, params=params)

        if resp.status_code == 429:
            raise RateLimitExceededException(retry_after_seconds=60)
        if resp.status_code in (401, 403):
            raise AuthenticationException(f"Token de Meta inválido: {resp.text}")
        resp.raise_for_status()

        data = resp.json()
        raw_items = data.get("data", [])
        normalized_reactions = []

        for item in raw_items:
            normalized_reactions.append({
                "external_interaction_id": f"{post_id}_{item.get('id')}_{item.get('type')}",
                "external_author_id": item.get("id"),
                "external_author_name": item.get("name"),
                "reaction_type": item.get("type", "LIKE"),
                "raw": item,
            })

        next_cursor = None
        paging = data.get("paging", {})
        cursors = paging.get("cursors", {})
        if paging.get("next") and cursors.get("after"):
            next_cursor = cursors.get("after")

        return normalized_reactions, next_cursor
