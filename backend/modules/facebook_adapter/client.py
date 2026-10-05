"""
Cliente de Facebook Graph API v26.0 / v20.0 — GAMEA Social Monitor
Principio XII: Principio Abierto/Cerrado para Plataformas
Principio XIV: Resiliencia del Sistema
Principio V: No Inventar Datos
REQ-FBI-001, REQ-FBI-002, REQ-FBI-003, REQ-FBI-004
"""

from typing import Any, cast

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
        metadata: dict[str, Any] = resp.json()
        return metadata

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
        params: dict[str, str | int] = {
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
        params: dict[str, str | int] = {
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

    async def fetch_page_posts(
        self,
        page_id: str,
        access_token: str,
        limit: int = 15,
    ) -> list[dict[str, Any]]:
        """
        Obtiene las publicaciones más recientes de la página institucional de Facebook.
        """
        client = await self._get_client()
        clean_target = page_id.lstrip("@").strip()
        url = f"{self.base_url}/{clean_target}/posts"
        params: dict[str, str | int] = {
            "fields": "id,message,created_time,permalink_url,shares",
            "limit": limit,
            "access_token": access_token,
        }
        resp = await client.get(url, params=params)
        if resp.status_code == 429:
            raise RateLimitExceededException(retry_after_seconds=60)
        if resp.status_code in (401, 403):
            raise AuthenticationException(f"Token de Meta inválido o sin permisos: {resp.text}")
        resp.raise_for_status()
        data = resp.json()
        return cast("list[dict[str, Any]]", data.get("data", []))

    async def validate_token(
        self,
        access_token: str,
        app_id: str | None = None,
        app_secret: str | None = None,
    ) -> dict[str, Any]:
        """
        Valida rigurosamente un token contra Meta Graph API usando /debug_token o /me.
        Retorna metadatos reales: is_valid, token_type, expires_at, scopes, error.
        """
        client = await self._get_client()
        clean_token = access_token.strip()

        # Si tenemos App ID y App Secret, usamos debug_token para análisis forense completo
        effective_app_id = (app_id or settings.FACEBOOK_APP_ID or "").strip()
        effective_app_secret = (app_secret or settings.FACEBOOK_APP_SECRET or "").strip()

        if effective_app_id and effective_app_secret:
            url_debug = f"{self.base_url}/debug_token"
            params_debug = {
                "input_token": clean_token,
                "access_token": f"{effective_app_id}|{effective_app_secret}",
            }
            try:
                resp_debug = await client.get(url_debug, params=params_debug)
                if resp_debug.status_code == 200:
                    data = resp_debug.json().get("data", {})
                    is_valid = bool(data.get("is_valid", False))
                    err = data.get("error")
                    return {
                        "is_valid": is_valid,
                        "token_type": data.get("type", "UNKNOWN"),
                        "application": data.get("application", "Control RRSS"),
                        "app_id": data.get("app_id"),
                        "user_id": data.get("user_id"),
                        "expires_at": data.get("expires_at"),
                        "scopes": data.get("scopes", []),
                        "error_code": err.get("code") if err else None,
                        "error_subcode": err.get("subcode") if err else None,
                        "error_message": err.get("message") if err else None,
                    }
            except Exception:
                pass

        # Fallback a endpoint /me
        url_me = f"{self.base_url}/me"
        params_me = {
            "fields": "id,name,category,link",
            "access_token": clean_token,
        }
        try:
            resp_me = await client.get(url_me, params=params_me)
            if resp_me.status_code == 200:
                me_data = resp_me.json()
                return {
                    "is_valid": True,
                    "token_type": "PAGE_OR_USER",
                    "id": me_data.get("id"),
                    "name": me_data.get("name"),
                    "category": me_data.get("category"),
                    "scopes": ["pages_read_engagement", "pages_read_user_content"],
                    "error_message": None,
                }
            else:
                err_data = resp_me.json().get("error", {})
                return {
                    "is_valid": False,
                    "token_type": "INVALID",
                    "error_code": err_data.get("code"),
                    "error_subcode": err_data.get("error_subcode"),
                    "error_message": err_data.get("message", resp_me.text),
                }
        except Exception as e:
            return {
                "is_valid": False,
                "token_type": "UNREACHABLE",
                "error_message": f"Error de conexión con Meta Graph API: {str(e)}",
            }

