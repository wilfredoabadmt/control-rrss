"""
Inyección de Dependencias — GAMEA Social Monitor
"""

from typing import Annotated

from config import Settings, get_settings
from database import get_async_db
from fastapi import Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

# Dependencia de Sesión de Base de Datos
DatabaseDep = Annotated[AsyncSession, Depends(get_async_db)]

# Dependencia de Configuración
SettingsDep = Annotated[Settings, Depends(get_settings)]


class PaginationParams:
    """Parámetros estándar de paginación según especificación."""
    def __init__(
        self,
        page: int = Query(default=1, ge=1, description="Número de página (1-indexado)"),
        page_size: int = Query(default=20, ge=1, le=100, description="Registros por página (máximo 100)"),
    ):
        self.page = page
        self.page_size = page_size
        self.offset = (page - 1) * page_size
        self.limit = page_size


PaginationDep = Annotated[PaginationParams, Depends()]
