"""
Fakes y Simuladores de Facebook Graph API para Pruebas Automatizadas — GAMEA Social Monitor
Principio XIX: Pruebas Exhaustivas y Fakes
"""

from typing import Any

from modules.shared.exceptions import AuthenticationException, RateLimitExceededException


class FakeFacebookGraphClient:
    """
    Simulador determinista de Facebook Graph API para pruebas unitarias e integración.
    Permite simular respuestas normales, respuestas con campo 'from' ausente, errores 429 y auth.
    """

    def __init__(
        self,
        simulate_rate_limit: bool = False,
        simulate_auth_error: bool = False,
        simulate_empty_from: bool = False,
    ):
        self.simulate_rate_limit = simulate_rate_limit
        self.simulate_auth_error = simulate_auth_error
        self.simulate_empty_from = simulate_empty_from

    async def fetch_post_metadata(self, post_id: str, _access_token: str) -> dict[str, Any]:
        if self.simulate_rate_limit:
            raise RateLimitExceededException(retry_after_seconds=60)
        if self.simulate_auth_error:
            raise AuthenticationException("Simulated OAuthException: token expired")

        return {
            "id": post_id,
            "message": "Publicación de prueba institucional",
            "created_time": "2026-03-15T12:00:00+0000",
            "permalink_url": f"https://facebook.com/gamea/posts/{post_id}",
            "shares": {"count": 42},
        }

    async def fetch_comments(
        self,
        post_id: str,
        _access_token: str,
        _cursor: str | None = None,
        _limit: int = 50,
    ) -> tuple[list[dict[str, Any]], str | None]:
        if self.simulate_rate_limit:
            raise RateLimitExceededException(retry_after_seconds=60)
        if self.simulate_auth_error:
            raise AuthenticationException("Simulated OAuthException: invalid token")

        if self.simulate_empty_from:
            # Meta omite 'from' por privacidad
            comments = [
                {
                    "external_interaction_id": f"{post_id}_comm_01",
                    "content_text": "Comentario con autor privado por Meta",
                    "external_created_at": "2026-03-15T13:00:00+0000",
                    "external_author_id": None,
                    "external_author_name": None,
                    "like_count": 5,
                    "raw": {"id": f"{post_id}_comm_01", "message": "Comentario privado"},
                }
            ]
        else:
            comments = [
                {
                    "external_interaction_id": f"{post_id}_comm_01",
                    "content_text": "Felicidades alcaldesa, adelante El Alto",
                    "external_created_at": "2026-03-15T13:00:00+0000",
                    "external_author_id": "fb_user_112233",
                    "external_author_name": "Funcionario Municipal",
                    "like_count": 12,
                    "raw": {
                        "id": f"{post_id}_comm_01",
                        "message": "Felicidades alcaldesa",
                        "from": {"id": "fb_user_112233", "name": "Funcionario Municipal"},
                    },
                }
            ]

        return comments, None

    async def fetch_reactions(
        self,
        post_id: str,
        _access_token: str,
        _cursor: str | None = None,
        _limit: int = 100,
    ) -> tuple[list[dict[str, Any]], str | None]:
        if self.simulate_rate_limit:
            raise RateLimitExceededException(retry_after_seconds=60)
        if self.simulate_auth_error:
            raise AuthenticationException("Simulated OAuthException")

        reactions = [
            {
                "external_interaction_id": f"{post_id}_reac_01_LIKE",
                "external_author_id": "fb_user_112233",
                "external_author_name": "Funcionario Municipal",
                "reaction_type": "LIKE",
                "raw": {"id": "fb_user_112233", "name": "Funcionario Municipal", "type": "LIKE"},
            }
        ]
        return reactions, None
