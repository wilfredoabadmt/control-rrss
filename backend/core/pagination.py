"""
Modelo Estándar de Paginación — GAMEA Social Monitor
"""

import math

from pydantic import BaseModel, Field


class PageResponse[T](BaseModel):
    items: list[T] = Field(..., description="Lista de elementos de la página actual")
    total: int = Field(..., ge=0, description="Total general de elementos")
    page: int = Field(..., ge=1, description="Número de página actual")
    page_size: int = Field(..., ge=1, description="Tamaño de la página")
    pages: int = Field(..., ge=0, description="Total de páginas disponibles")

    @classmethod
    def create(cls, items: list[T], total: int, page: int, page_size: int) -> "PageResponse[T]":
        pages = math.ceil(total / page_size) if page_size > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
        )
