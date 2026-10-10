"""
Router del Módulo 16: Analítica de Reacciones y Fiscalización Interactiva (SDD)
RF-ANL-001 a RF-ANL-007 — GAMEA Social Monitor
"""

import io
import uuid
from datetime import UTC, datetime

from core.security.auth import get_current_user
from database import get_async_db
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from modules.analytics.schemas import (
    AnalyticsEmployeesPageResponse,
    AnalyticsOverviewResponse,
)
from modules.analytics.service import AnalyticsService
from modules.iam.models import User
from sqlalchemy.ext.asyncio import AsyncSession

analytics_router = APIRouter(prefix="/analytics", tags=["Interactive Analytics & Metrics"])


@analytics_router.get(
    "/overview",
    response_model=AnalyticsOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener métricas consolidadas, KPIs y datos de gráficos interactivos",
    description="Retorna KPIs, desglose por tipo de reacción, ranking por dirección, serie temporal y comparativa de redes con aislamiento multi-inquilino.",
)
async def get_analytics_overview(
    days: int | None = Query(None, description="Ventana de tiempo relativa en días (ej. 7, 15, 30)"),
    date_from: datetime | None = Query(None, description="Fecha de inicio (ISO 8601)"),
    date_to: datetime | None = Query(None, description="Fecha de fin (ISO 8601)"),
    direction: str | None = Query(None, description="Filtrar por Dirección o Secretaría específica"),
    publication_id: uuid.UUID | None = Query(None, description="Filtrar por publicación específica"),
    platform_name: str | None = Query(None, description="Filtrar por plataforma: FACEBOOK o TIKTOK"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> AnalyticsOverviewResponse:
    return await AnalyticsService.get_overview(
        db=db,
        current_user=current_user,
        date_from=date_from,
        date_to=date_to,
        direction=direction,
        publication_id=publication_id,
        platform_name=platform_name,
        days=days,
    )


@analytics_router.get(
    "/employees",
    response_model=AnalyticsEmployeesPageResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener listado paginado de funcionarios con métricas de interacción",
    description="Permite buscar por nombre/CI, filtrar por dirección, publicación, plataforma y estado de participación.",
)
async def get_analytics_employees(
    search: str | None = Query(None, description="Término de búsqueda (Nombre o CI)"),
    direction: str | None = Query(None, description="Filtrar por Dirección o Secretaría específica"),
    publication_id: uuid.UUID | None = Query(None, description="Filtrar por publicación específica"),
    platform_name: str | None = Query(None, description="Filtrar por plataforma: FACEBOOK o TIKTOK"),
    participation_status: str | None = Query("ALL", description="ALL, PARTICIPATED, o NO_REACTION"),
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(20, ge=1, le=100, description="Tamaño de página"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> AnalyticsEmployeesPageResponse:
    return await AnalyticsService.get_employees_table(
        db=db,
        current_user=current_user,
        search=search,
        direction=direction,
        publication_id=publication_id,
        platform_name=platform_name,
        participation_status=participation_status,
        page=page,
        page_size=page_size,
    )


@analytics_router.get(
    "/export",
    summary="Exportar reporte analítico ejecutivo a Excel (.xlsx)",
    description="Genera y descarga un libro de trabajo Excel con carátula ejecutiva y tabla detallada de fiscalización.",
)
async def export_analytics_excel(
    direction: str | None = Query(None, description="Filtrar por Dirección"),
    publication_id: uuid.UUID | None = Query(None, description="Filtrar por Publicación"),
    platform_name: str | None = Query(None, description="Filtrar por Plataforma"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    excel_bytes = await AnalyticsService.export_excel(
        db=db,
        current_user=current_user,
        direction=direction,
        publication_id=publication_id,
        platform_name=platform_name,
    )
    timestamp_str = datetime.now(UTC).strftime("%Y%m%d_%H%M")
    filename = f"GAMEA_Analitica_Reacciones_{timestamp_str}.xlsx"

    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
