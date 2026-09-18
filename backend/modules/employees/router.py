"""
Routers para Directorio de Funcionarios, Estructura Organizacional y Cargos — GAMEA Social Monitor
"""

import uuid

from core.pagination import PageResponse
from core.security.auth import get_current_user
from core.security.encryption import decrypt_field
from core.security.rbac import require_roles
from database import get_async_db
from dependencies import PaginationDep
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from modules.employees.importer import EmployeePayrollImporter
from modules.employees.models import Employee, OrganizationalUnit, Position
from modules.employees.schemas import (
    EmployeeCreate,
    EmployeeDetailResponse,
    EmployeeHistoryResponse,
    EmployeeImportReport,
    EmployeeResponse,
    EmployeeUpdate,
    OrganizationalUnitCreate,
    OrganizationalUnitResponse,
    OrganizationalUnitTreeNode,
    OrganizationalUnitUpdate,
    PositionCreate,
    PositionResponse,
)
from modules.employees.service import EmployeeService
from modules.iam.models import User
from modules.shared.enums import UserRole
from modules.shared.exceptions import EntityNotFoundException, ValidationException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

org_units_router = APIRouter()
positions_router = APIRouter()
employees_router = APIRouter()


# -----------------------------------------------------------------------------
# Endpoints de Unidades Organizacionales (/api/v1/org-units)
# -----------------------------------------------------------------------------

@org_units_router.get("/tree", response_model=list[OrganizationalUnitTreeNode])
async def get_org_units_tree(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna la jerarquía completa en árbol de las unidades del GAMEA."""
    return await EmployeeService.get_org_units_tree(db)


@org_units_router.get("/", response_model=list[OrganizationalUnitResponse])
async def list_org_units(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna la lista plana de unidades organizacionales."""
    stmt = select(OrganizationalUnit).order_by(OrganizationalUnit.name)
    units = list((await db.execute(stmt)).scalars().all())
    return [OrganizationalUnitResponse.model_validate(u) for u in units]


@org_units_router.post("/", response_model=OrganizationalUnitResponse, status_code=status.HTTP_201_CREATED)
async def create_org_unit(
    org_in: OrganizationalUnitCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    """Crea una nueva unidad organizacional."""
    try:
        unit = await EmployeeService.create_org_unit(db, org_in, current_user)
        return OrganizationalUnitResponse.model_validate(unit)
    except ValidationException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@org_units_router.patch("/{unit_id}", response_model=OrganizationalUnitResponse)
async def update_org_unit(
    unit_id: uuid.UUID,
    org_in: OrganizationalUnitUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    """Actualiza una unidad organizacional existente."""
    try:
        unit = await EmployeeService.update_org_unit(db, unit_id, org_in, current_user)
        return OrganizationalUnitResponse.model_validate(unit)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
    except ValidationException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


# -----------------------------------------------------------------------------
# Endpoints de Cargos (/api/v1/positions)
# -----------------------------------------------------------------------------

@positions_router.get("/", response_model=list[PositionResponse])
async def list_positions(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna el catálogo institucional de cargos."""
    stmt = select(Position).order_by(Position.title)
    positions = list((await db.execute(stmt)).scalars().all())
    return [PositionResponse.model_validate(p) for p in positions]


@positions_router.post("/", response_model=PositionResponse, status_code=status.HTTP_201_CREATED)
async def create_position(
    pos_in: PositionCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    """Crea un nuevo cargo institucional."""
    pos = await EmployeeService.create_position(db, pos_in, current_user)
    return PositionResponse.model_validate(pos)


# -----------------------------------------------------------------------------
# Endpoints de Funcionarios (/api/v1/employees)
# -----------------------------------------------------------------------------

def _format_employee_response(emp: Employee, current_user: User) -> EmployeeResponse:
    """Aplica protección PII: Oculta CI si el usuario no tiene permisos suficientes."""
    user_roles = {r.name for r in current_user.roles}
    privileged_roles = {UserRole.SUPER_ADMIN.value, UserRole.AUDITOR.value, UserRole.DIRECTOR.value}

    # Si es privilegiado, descifra la cédula; si es visor o analista, la oculta/enmascara
    doc_number = None
    if user_roles.intersection(privileged_roles):
        doc_number = decrypt_field(emp.document_number_encrypted)
    else:
        doc_number = "••••••"

    return EmployeeResponse(
        employee_id=emp.employee_id,
        first_name=emp.first_name,
        last_name=emp.last_name,
        document_number=doc_number,
        organizational_unit_id=emp.organizational_unit_id,
        position_id=emp.position_id,
        status=emp.status,
        hire_date=emp.hire_date,
        termination_date=emp.termination_date,
        created_at=emp.created_at,
        updated_at=emp.updated_at,
    )


@employees_router.get("/", response_model=PageResponse[EmployeeResponse])
async def list_employees(
    pagination: PaginationDep,
    unit_id: uuid.UUID | None = Query(None, description="Filtrar por unidad organizacional"),
    status: str | None = Query(None, description="Filtrar por estado"),
    search: str | None = Query(None, description="Búsqueda por nombre o ID"),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Consulta paginada del directorio de funcionarios."""
    employees, total = await EmployeeService.list_employees(
        db=db,
        unit_id=unit_id,
        status=status,
        search=search,
        offset=pagination.offset,
        limit=pagination.limit,
    )
    items = [_format_employee_response(e, current_user) for e in employees]
    return PageResponse.create(items=items, total=total, page=pagination.page, page_size=pagination.page_size)


@employees_router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    emp_in: EmployeeCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    """Crea un funcionario institucional."""
    try:
        emp = await EmployeeService.create_employee(db, emp_in, current_user)
        return _format_employee_response(emp, current_user)
    except ValidationException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@employees_router.post("/import", response_model=EmployeeImportReport)
async def import_employees_payroll(
    file: UploadFile = File(..., description="Archivo Excel (.xlsx) o CSV de nómina"),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    """
    Importación y sincronización de nómina institucional (REQ-EMP-003).
    Idempotente: Detecta altas, bajas y transferencias organizacionales.
    """
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nombre de archivo inválido.")

    contents = await file.read()
    report = await EmployeePayrollImporter.import_payroll_file(
        db=db,
        file_content=contents,
        filename=file.filename,
        current_user=current_user,
    )
    return report


@employees_router.get("/{employee_id}", response_model=EmployeeDetailResponse)
async def get_employee(
    employee_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Consulta la ficha completa de un funcionario."""
    emp = await EmployeeService.get_employee_by_id(db, employee_id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionario no encontrado.")

    base_resp = _format_employee_response(emp, current_user)
    history_items = [EmployeeHistoryResponse.model_validate(h) for h in emp.history]

    return EmployeeDetailResponse(
        **base_resp.model_dump(),
        organizational_unit=OrganizationalUnitResponse.model_validate(emp.organizational_unit) if emp.organizational_unit else None,
        position=PositionResponse.model_validate(emp.position) if emp.position else None,
        history=history_items,
    )


@employees_router.get("/{employee_id}/history", response_model=list[EmployeeHistoryResponse])
async def get_employee_history(
    employee_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna la línea temporal de transferencias y cambios organizacionales del funcionario (T-204).
    """
    emp = await EmployeeService.get_employee_by_id(db, employee_id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionario no encontrado.")
    return [EmployeeHistoryResponse.model_validate(h) for h in emp.history]


@employees_router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: str,
    emp_in: EmployeeUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    """
    Actualiza datos de un funcionario. Si cambia de unidad o cargo, registra en el historial (T-204).
    """
    try:
        emp = await EmployeeService.update_employee(db, employee_id, emp_in, current_user)
        return _format_employee_response(emp, current_user)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
    except ValidationException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@employees_router.delete("/{employee_id}", status_code=status.HTTP_200_OK)
async def deactivate_employee(
    employee_id: str,
    reason: str | None = Query("Desvinculación institucional", description="Motivo de la baja"),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR)),
):
    """
    Baja lógica de funcionario (BR-EMP-004). Preserva íntegro su historial.
    """
    try:
        await EmployeeService.deactivate_employee(db, employee_id, current_user, reason=reason)
        return {"detail": "Funcionario dado de baja lógica correctamente."}
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
