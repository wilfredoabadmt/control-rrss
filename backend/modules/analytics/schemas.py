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
    total_employee_comments: int = Field(default=0, description="Comentarios de servidores públicos confirmados")
    total_citizen_comments: int = Field(default=0, description="Comentarios de ciudadanos externos")
    employees_with_comments: int = Field(default=0, description="Funcionarios que comentaron al menos una vez")
    employees_with_both: int = Field(default=0, description="Funcionarios que reaccionaron y comentaron")
    comment_participation_rate: float = Field(default=0.0, description="Porcentaje de funcionarios que comentaron (0 - 100)")
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
    available_secretarias: list[str] = Field(default_factory=list, description="Lista de secretarías municipales para el filtro jerárquico")
    available_directions: list[str] = Field(default_factory=list, description="Lista de direcciones para el filtro")
    available_units: list[str] = Field(default_factory=list, description="Lista de unidades organizacionales para el filtro jerárquico")
    ranking_dimension: str = Field(default="DIRECCION", description="Nivel jerárquico del ranking: DIRECCION, UNIDAD o FUNCIONARIO")
    ranking_title: str = Field(default="Ranking de Participación por Dirección", description="Título descriptivo del ranking actual")
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class EmployeeCommentDetail(BaseModel):
    """Detalle de un comentario emitido por un funcionario en un post evaluado."""
    interaction_id: str
    publication_id: str
    post_title: str
    post_url: str | None = None
    comment_text: str
    created_at: str | None = None
    associated_reaction: str | None = None


class EmployeeAnalyticsItem(BaseModel):
    """Detalle analítico individual por funcionario."""
    employee_id: str
    full_name: str
    document_number: str
    secretaria: str = Field(default="", description="Secretaría Municipal o Despacho al que pertenece")
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
    has_commented: bool = Field(default=False)
    has_both: bool = Field(default=False, description="Registró reacción y comentario en publicaciones evaluadas")
    comments: list[EmployeeCommentDetail] = Field(default_factory=list, description="Lista de comentarios emitidos por el funcionario")
    last_interaction_at: str | None = None


class AnalyticsEmployeesPageResponse(BaseModel):
    """Respuesta paginada del detalle de funcionarios."""
    items: list[EmployeeAnalyticsItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class PostCommentAuthorDetail(BaseModel):
    """Detalle de autoría del comentario (cruce institucional)."""
    author_id: str | None = None
    author_name: str
    is_employee: bool = False
    employee_id: str | None = None
    full_name: str | None = None
    document_number: str | None = None
    secretaria: str | None = None
    direction: str | None = None
    unit: str | None = None
    position: str | None = None


class PostCommentItem(BaseModel):
    """Comentario individual auditado con contexto del post y cruce."""
    id: str
    publication_id: str
    post_title: str | None = None
    post_url: str | None = None
    content_text: str
    created_at: str | None = None
    author: PostCommentAuthorDetail
    associated_reaction: str | None = None
    epistemic_status: str = "CONFIRMED"
    epistemic_display: str = "Dato Confirmado"


class PostCommentsPageResponse(BaseModel):
    """Respuesta paginada para la auditoría de comentarios de posts evaluados."""
    items: list[PostCommentItem]
    total: int
    total_employee_comments: int
    total_citizen_comments: int
    page: int
    page_size: int
    total_pages: int
