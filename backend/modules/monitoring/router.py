"""
Router del Centro de Ingesta, Monitoreo y Matriz de Fiscalización — GAMEA Social Monitor
Endpoints institucionales de gestión de conectores, audiencia, scrapeo y matriz de auditoría.
"""

import uuid
from datetime import UTC, datetime

from core.security.auth import get_current_user
from core.security.rbac import require_roles
from database import get_async_db
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from modules.iam.models import User
from modules.monitoring.schemas import (
    ActivityMatrixResponse,
    ConnectorConfigsResponse,
    ConnectorConfigUpdateRequest,
    ConnectorsDiagnosticResponse,
    EmployeeActivityVerifyRequest,
    EmployeeActivityVerifyResponse,
    ImportReactionsBatchRequest,
    ImportReactionsBatchResponse,
    MonitoredPersonBulkImportRequest,
    MonitoredPersonBulkImportResponse,
    MonitoredPersonCreate,
    MonitoredPersonResponse,
    RunSyncRequest,
    RunSyncResponse,
    TestConnectionRequest,
    TestConnectionResponse,
)
from modules.monitoring.service import MonitoringHubService
from modules.shared.enums import UserRole
from sqlalchemy.ext.asyncio import AsyncSession

monitoring_router = APIRouter(prefix="/monitoring", tags=["Monitoring & Social Scraper Hub"])


# -----------------------------------------------------------------------------
# 1. Configuración de Conectores (Facebook & TikTok)
# -----------------------------------------------------------------------------

@monitoring_router.get(
    "/hub/config",
    response_model=ConnectorConfigsResponse,
    summary="Obtener configuración de conectores de redes sociales (Facebook & TikTok)",
)
async def get_connector_configs(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    configs = await MonitoringHubService.get_connector_configs(db)
    return ConnectorConfigsResponse(configs=configs)


@monitoring_router.post(
    "/hub/config",
    response_model=ConnectorConfigsResponse,
    summary="Actualizar credenciales y parámetros de extracción de Facebook y TikTok",
)
async def update_connector_configs(
    req: ConnectorConfigUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD, UserRole.OPERATOR)),
):
    configs = await MonitoringHubService.update_connector_configs(db, req, current_user)
    return ConnectorConfigsResponse(configs=configs)


@monitoring_router.post(
    "/hub/test-connection",
    response_model=TestConnectionResponse,
    summary="Probar conectividad y validar credenciales de Facebook o TikTok",
)
async def test_connection(
    req: TestConnectionRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    return await MonitoringHubService.test_connection(req, db)


@monitoring_router.get(
    "/hub/diagnostics",
    response_model=ConnectorsDiagnosticResponse,
    summary="Diagnóstico exhaustivo de variables de entorno y estado de conectores API",
)
async def get_connectors_diagnostics(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    return await MonitoringHubService.get_connectors_diagnostics(db)


# -----------------------------------------------------------------------------
# 2. Gestión de Audiencia Monitoreada (Lista de Personas)
# -----------------------------------------------------------------------------

@monitoring_router.get(
    "/hub/audience",
    response_model=list[MonitoredPersonResponse],
    summary="Listar personas en monitoreo con sus perfiles de Facebook y TikTok",
)
async def get_audience(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    return await MonitoringHubService.get_audience(db, current_user=current_user)


@monitoring_router.post(
    "/hub/audience",
    response_model=MonitoredPersonResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar o actualizar una persona en la lista de monitoreo",
)
async def add_monitored_person(
    person_in: MonitoredPersonCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD, UserRole.OPERATOR)),
):
    return await MonitoringHubService.add_monitored_person(db, person_in, current_user)


@monitoring_router.post(
    "/hub/audience/bulk",
    response_model=MonitoredPersonBulkImportResponse,
    summary="Importación masiva de personas a monitorear (CSV o JSON)",
)
async def bulk_import_audience(
    req: MonitoredPersonBulkImportRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD, UserRole.OPERATOR)),
):
    return await MonitoringHubService.bulk_import_audience(db, req, current_user)


# -----------------------------------------------------------------------------
# 3. Disparo de Extracción y Sincronización
# -----------------------------------------------------------------------------

@monitoring_router.post(
    "/hub/sync-now",
    response_model=RunSyncResponse,
    summary="Ejecutar extracción/scrapeo y cruce de interacciones en Facebook y TikTok",
)
async def run_social_sync(
    req: RunSyncRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD, UserRole.OPERATOR, UserRole.DIRECTOR, UserRole.ANALYST)),
):
    return await MonitoringHubService.run_social_sync(db, req, current_user)


# -----------------------------------------------------------------------------
# 4. Matriz de Auditoría y Verificación de Actividades
# -----------------------------------------------------------------------------

@monitoring_router.get(
    "/hub/activity-matrix",
    response_model=ActivityMatrixResponse,
    summary="Consultar matriz cruzada de reacciones y actividades de la audiencia",
)
async def get_activity_matrix(
    publication_id: uuid.UUID | None = Query(None, description="Filtrar por publicación específica"),
    platform: str | None = Query(None, description="Filtrar por plataforma (ALL, FACEBOOK, TIKTOK)"),
    department: str | None = Query(None, description="Filtrar por unidad organizacional"),
    search: str | None = Query(None, description="Búsqueda por nombre, CI o usuario"),
    participation_status: str | None = Query("ALL", description="ALL, PARTICIPATED, NO_ACTIVITY"),
    max_posts: int = Query(
        15,
        ge=1,
        le=100,
        description="Ventana de publicaciones recientes a evaluar (las verificadas siempre se incluyen)",
    ),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    return await MonitoringHubService.get_activity_matrix(
        db=db,
        publication_id=publication_id,
        platform_name=platform,
        department=department,
        search=search,
        participation_status=participation_status,
        current_user=current_user,
        max_posts=max_posts,
    )


# -----------------------------------------------------------------------------
# 5. Verificación Manual de Actividad de Funcionario (Auditoría Asistida)
# -----------------------------------------------------------------------------

@monitoring_router.post(
    "/hub/verify-employee-activity",
    response_model=EmployeeActivityVerifyResponse,
    summary="Registrar o auditar manualmente la interacción de un funcionario",
)
async def verify_employee_activity(
    req: EmployeeActivityVerifyRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.COMMUNICATIONS_LEAD,
            UserRole.OPERATOR,
            UserRole.DIRECTOR,
            UserRole.ANALYST,
        )
    ),
):
    return await MonitoringHubService.verify_employee_activity(db, req, current_user)


@monitoring_router.post(
    "/hub/import-reactions",
    response_model=ImportReactionsBatchResponse,
    summary="Importación y cruce masivo de reacciones de Facebook contra el padrón municipal",
)
async def import_reactions_batch(
    req: ImportReactionsBatchRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.COMMUNICATIONS_LEAD,
            UserRole.OPERATOR,
            UserRole.DIRECTOR,
            UserRole.ANALYST,
        )
    ),
):
    return await MonitoringHubService.import_reactions_batch(db, req, current_user)



# -----------------------------------------------------------------------------
# 6. Exportación en Excel (.xlsx) para Autoridades
# -----------------------------------------------------------------------------

@monitoring_router.get(
    "/hub/export-matrix",
    summary="Descargar informe oficial de fiscalización en formato Excel (.xlsx)",
)
async def export_matrix_excel(
    publication_id: uuid.UUID | None = Query(None),
    platform: str | None = Query(None),
    department: str | None = Query(None),
    search: str | None = Query(None),
    participation_status: str | None = Query("ALL"),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    excel_buf = await MonitoringHubService.export_matrix_excel(
        db=db,
        publication_id=publication_id,
        platform_name=platform,
        department=department,
        search=search,
        participation_status=participation_status,
        current_user=current_user,
    )
    timestamp_str = datetime.now(UTC).strftime("%Y%m%d_%H%M")
    filename = f"GAMEA_Informe_Fiscalizacion_Redes_{timestamp_str}.xlsx"

    return StreamingResponse(
        excel_buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
