"""
Endpoints del Módulo de Reportes Institucionales — GAMEA Social Monitor
Principio XXIV: Reportes Reproducibles
Principio XXVI: Semántica de Indicadores
REQ-RPT-001, BR-RPT-004, BR-RPT-005
"""


from core.security.limiter import limiter
from core.security.rbac import require_roles
from database import get_async_db
from fastapi import APIRouter, Depends, Request, Response, status
from modules.iam.models import User
from modules.reporting.generator import ExcelReportGenerator
from modules.reporting.models import ReportExecution
from modules.reporting.schemas import ReportExecutionResponse, ReportGenerateRequest
from modules.shared.enums import UserRole
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/reports", tags=["Reporting & Analytics Engine"])


@router.post(
    "/export-excel",
    status_code=status.HTTP_200_OK,
    summary="Generar y descargar reporte oficial en formato Excel (.xlsx) (REQ-RPT-001)",
)
@router.post(
    "/generate",
    status_code=status.HTTP_200_OK,
    summary="Generar reporte oficial .xlsx (alias de export-excel)",
)
@limiter.limit("10/minute")
async def generate_excel_report(
    request: Request,
    req: ReportGenerateRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.COMMUNICATIONS_LEAD,
            UserRole.ANALYST,
            UserRole.DIRECTOR,
        )
    ),
):
    """
    BR-RPT-004: Solo roles autorizados pueden generar reportes.
    Calcula indicadores, genera hash SHA-256 inmutable y retorna el archivo .xlsx.
    """
    excel_bytes, file_hash, execution = await ExcelReportGenerator.generate_verification_report(
        db=db,
        current_user=current_user,
        campaign_title=req.campaign_title,
    )

    filename = f"reporte_gamea_{execution.report_type.lower()}_{execution.id}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Report-ID": str(execution.id),
            "X-Report-SHA256": file_hash,
        },
    )


@router.get(
    "/executions",
    response_model=list[ReportExecutionResponse],
    summary="Listar historial inmutable de reportes generados",
)
async def list_report_executions(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.AUDITOR,
            UserRole.COMMUNICATIONS_LEAD,
            UserRole.ANALYST,
            UserRole.DIRECTOR,
        )
    ),
):
    stmt = select(ReportExecution).order_by(ReportExecution.generated_at.desc()).limit(100)
    items = list((await db.execute(stmt)).scalars().all())
    return items
