"""
Esquemas Pydantic para el Módulo 16: Analítica de Reacciones y Fiscalización Interactiva (SDD)
RF-ANL-001 a RF-ANL-007 — GAMEA Social Monitor
"""

import uuid
from datetime import UTC, date, datetime
from pydantic import BaseModel, Field


class AnalyticsKPIs(BaseModel):
    """Métricas e Indicadores Clave de Rendimiento Globales."""
    total_employees: int = Field(description="Total de funcionarios en el alcance del usuario")
    observable_employees: int = Field(description="Funcionarios con al menos una red social observable")
    total_publications: int = Field(description="Total de publicaciones evaluadas en el período")
    total_reactions: int = Field(description="Total acumulado de reacciones detectadas")
    total_comments: int = Field(description="Total acumulado de comentarios detectados")
    total_shares: int = Field(description="Total acumulado de compartidos detectados")
    participating_employees: int = Field(description="Funcionarios que registraron al menos una interacción")
    participation_rate: float = Field(description="Porcentaje de funcionarios que interactuaron (0 - 100)")
    average_reactions_per_post: float = Field(description="Promedio de reacciones institucionales por publicación")


class ReactionTypeCount(BaseModel):
    """Conteo y proporción por tipo canónico de reacción."""
    type: str = Field(description="Tipo de reacción: LIKE, LOVE, CARE, HAHA, WOW, SAD, ANGRY, COMMENT, SHARE")
    label: str = Field(description="Etiqueta legible en español")
    count: int = Field(description="Cantidad absoluta de reacciones de este tipo")
    percentage: float = Field(description="Porcentaje del total de reacciones")
    color: str = Field(description="Color hexadecimal para renderizado en gráficos")


class DirectionRankingItem(BaseModel):
    """Métricas agregadas por Dirección o Secretaría Municipal."""
    direction: str = Field(description="Nombre de la Dirección o Secretaría")
    total_employees: int = Field(description="Total de funcionarios en esta dirección")
    participating_employees: int = Field(description="Funcionarios que interactuaron al menos una vez")
    total_reactions: int = Field(description="Total de reacciones emitidas por funcionarios de esta dirección")
    participation_rate: float = Field(description="Porcentaje de participación de la dirección (0 - 100)")


class TimelinePoint(BaseModel):
    """Punto en la serie temporal de actividad cronológica."""
    date: str = Field(description="Fecha en formato YYYY-MM-DD")
    reactions: int = Field(description="Total de reacciones en esta fecha")
    comments: int = Field(description="Total de comentarios en esta fecha")
    shares: int = Field(description="Total de compartidos en esta fecha")


class PlatformComparisonItem(BaseModel):
    """Volumen y proporción por red social."""
    total_reactions: int = Field(description="Total de reacciones capturadas en esta plataforma")
    percentage: float = Field(description="Porcentaje respecto al total global")
    total_comments: int = Field(default=0, description="Total de comentarios")
    total_shares: int = Field(default=0, description="Total de compartidos")


class PlatformComparison(BaseModel):
    """Comparativa bilateral de redes sociales."""
    facebook: PlatformComparisonItem
    tiktok: PlatformComparisonItem


class AnalyticsOverviewResponse(BaseModel):
    """Respuesta consolidada del endpoint de resumen analítico."""
    kpis: AnalyticsKPIs
    reactions_breakdown: list[ReactionTypeCount]
    direction_rankings: list[DirectionRankingItem]
    timeline_series: list[TimelinePoint]
    platform_comparison: PlatformComparison
    available_directions: list[str] = Field(default_factory=list, description="Lista de direcciones para el filtro")
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class EmployeeAnalyticsItem(BaseModel):
    """Detalle analítico individual por funcionario."""
    employee_id: str
    full_name: str
    document_number: str
    direction: str
    unit: str
    position: str
    facebook_account: str | None = None
    tiktok_account: str | None = None
    total_reactions: int = Field(default=0)
    total_comments: int = Field(default=0)
    total_shares: int = Field(default=0)
    reactions_by_type: dict[str, int] = Field(default_factory=dict)
    participated_posts_count: int = Field(default=0)
    total_available_posts: int = Field(default=0)
    participation_rate: float = Field(default=0.0)
    has_participated: bool = Field(default=False)
    last_interaction_at: str | None = None


class AnalyticsEmployeesPageResponse(BaseModel):
    """Respuesta paginada del detalle de funcionarios."""
    items: list[EmployeeAnalyticsItem]
    total: int
    page: int
    page_size: int
    total_pages: int
