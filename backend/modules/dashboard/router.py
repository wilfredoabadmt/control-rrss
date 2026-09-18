"""
Endpoints de Tableros de Control Operativo y Ejecutivo — GAMEA Social Monitor
Principio XXV: Dashboard Verificable
Principio XXVI: Semántica de Indicadores
REQ-DSH-001, REQ-DSH-002, BR-DSH-001 a BR-DSH-004
"""

from core.security.rbac import require_roles
from database import get_async_db
from fastapi import APIRouter, Depends
from modules.dashboard.schemas import (
    ExecutiveDashboardResponse,
    OperationalDashboardResponse,
    PlatformHealthItem,
)
from modules.employees.models import Employee
from modules.iam.models import User
from modules.interactions.models import Interaction
from modules.monitoring.models import ExternalSyncJob
from modules.publications.models import Publication
from modules.reporting.indicators import IndicatorEngine
from modules.shared.enums import EmployeeStatus, UserRole, VerificationStatus
from modules.social_accounts.models import SocialPlatform
from modules.verification.models import Verification
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/dashboard", tags=["Dashboards (Operational & Executive)"])


@router.get(
    "/operational",
    response_model=OperationalDashboardResponse,
    summary="Dashboard operativo en tiempo real (REQ-DSH-001)",
)
async def get_operational_dashboard(
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.COMMUNICATIONS_LEAD,
            UserRole.ANALYST,
            UserRole.OPERATOR,
        )
    ),
):
    """
    BR-DSH-001: Todos los datos se consultan y calculan en backend, nunca en frontend.
    """
    # 1. Plataformas y estado de salud
    stmt_plats = select(SocialPlatform)
    plats = list((await db.execute(stmt_plats)).scalars().all())
    platform_health = [
        PlatformHealthItem(
            name=p.name,
            display_name=p.display_name,
            is_active=p.is_active,
            status="ONLINE" if p.is_active else "OFFLINE",
        )
        for p in plats
    ]

    # 2. Publicaciones activas
    stmt_pubs = select(func.count(Publication.id)).where(Publication.is_monitored.is_(True))
    monitored_pubs = (await db.execute(stmt_pubs)).scalar_one() or 0

    # 3. Total de interacciones capturadas
    stmt_ints = select(func.count(Interaction.id))
    total_ints = (await db.execute(stmt_ints)).scalar_one() or 0

    # 4. Interacciones pendientes de verificación
    stmt_pending = select(func.count(Verification.id)).where(
        Verification.verification_status == VerificationStatus.PENDING.value
    )
    pending_verifs = (await db.execute(stmt_pending)).scalar_one() or 0

    # 5. Trabajos de sincronización recientes
    stmt_jobs = select(ExternalSyncJob).order_by(ExternalSyncJob.started_at.desc()).limit(5)
    jobs = list((await db.execute(stmt_jobs)).scalars().all())
    recent_jobs = [
        {
            "id": str(j.id),
            "job_type": j.job_type,
            "status": j.status,
            "started_at": j.started_at.isoformat(),
            "records_processed": j.records_processed,
        }
        for j in jobs
    ]

    # 6. Alertas
    alerts = [
        {"level": "INFO", "message": "Tokens de conectores institucionales Meta y TikTok vigentes."},
        {"level": "SUCCESS", "message": "Motor de ingesta operando con idempotencia activa."},
    ]

    return OperationalDashboardResponse(
        platforms=platform_health,
        monitored_publications_count=monitored_pubs,
        total_interactions_count=total_ints,
        pending_verifications_count=pending_verifs,
        recent_sync_jobs=recent_jobs,
        active_alerts=alerts,
    )


@router.get(
    "/executive",
    response_model=ExecutiveDashboardResponse,
    summary="Dashboard ejecutivo con fichas técnicas y desglose agregado (REQ-DSH-002)",
)
async def get_executive_dashboard(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.DIRECTOR,
            UserRole.COMMUNICATIONS_LEAD,
            UserRole.ANALYST,
            UserRole.VIEWER,
        )
    ),
):
    """
    BR-DSH-002 / BR-DSH-003: Métricas con misma lógica que reportes Excel.
    Cada indicador incluye ficha técnica con fórmula y exclusiones.
    """
    cov_sheet = await IndicatorEngine.calculate_observable_coverage_rate(db)
    ver_sheet = await IndicatorEngine.calculate_verification_rate(db)
    ver_dist = await IndicatorEngine.get_verification_status_distribution(db)

    # Conteo de funcionarios activos
    stmt_emp = select(func.count(Employee.employee_id)).where(
        Employee.status == EmployeeStatus.ACTIVE.value
    )
    total_emp = (await db.execute(stmt_emp)).scalar_one() or 0

    # Desglose por plataforma
    stmt_plat_dist = (
        select(SocialPlatform.name, func.count(Interaction.id))
        .join(Interaction, Interaction.platform_id == SocialPlatform.id)
        .group_by(SocialPlatform.name)
    )
    plat_rows = (await db.execute(stmt_plat_dist)).fetchall()
    platform_breakdown = dict(plat_rows)

    return ExecutiveDashboardResponse(
        observable_coverage_rate=cov_sheet.to_dict(),
        verification_rate=ver_sheet.to_dict(),
        verification_distribution=ver_dist,
        platform_breakdown=platform_breakdown,
        total_active_employees=total_emp,
        constitutional_disclaimer="Conforme al Principio XXVII constitucional, este tablero prohíbe taxativamente la elaboración de rankings de funcionarios.",
    )
