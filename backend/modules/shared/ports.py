"""
Puertos del Sistema (Interfaces Hexagonales) — GAMEA Social Monitor
Principio XII: Principio Abierto/Cerrado para Plataformas
"""

from abc import ABC, abstractmethod
from typing import Any

from modules.shared.enums import SocialPlatformType


class SocialPlatformPort(ABC):
    """
    Puerto canónico para adaptadores de plataformas de redes sociales (Facebook, TikTok).
    Los adaptadores DEBEN implementar esta interfaz sin acoplar el núcleo del dominio.
    """

    @property
    @abstractmethod
    def platform_name(self) -> SocialPlatformType:
        """Nombre de la plataforma implementada."""
        pass

    @abstractmethod
    async def fetch_post_metadata(self, external_post_id: str) -> dict[str, Any]:
        """Obtiene metadatos de una publicación específica."""
        pass

    @abstractmethod
    async def fetch_comments(
        self,
        external_post_id: str,
        cursor: str | None = None,
        limit: int = 50,
    ) -> tuple[list[dict[str, Any]], str | None]:
        """
        Obtiene comentarios paginados de una publicación.
        Retorna (lista_de_comentarios_normalizados, siguiente_cursor).
        """
        pass

    @abstractmethod
    async def fetch_reactions(
        self,
        external_post_id: str,
        cursor: str | None = None,
        limit: int = 100,
    ) -> tuple[list[dict[str, Any]], str | None]:
        """
        Obtiene reacciones de una publicación con cursor de paginación.
        """
        pass

    @abstractmethod
    def verify_webhook_signature(
        self,
        payload: bytes,
        signature_header: str,
        secret: str,
    ) -> bool:
        """Verifica la firma criptográfica del webhook entrante."""
        pass

    @abstractmethod
    def parse_webhook_payload(self, raw_payload: dict[str, Any]) -> list[dict[str, Any]]:
        """
        Normaliza los eventos de un webhook crudo a estructuras estándar del dominio.
        """
        pass
