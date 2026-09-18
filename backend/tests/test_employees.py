"""
Pruebas de Integración de Funcionarios y Organización — GAMEA Social Monitor
Principio VII: Identidad Única e Inmutable
Principio VIII: Fuente Maestra de RR.HH.
Principio IX: Modelo Normalizado
"""

import uuid

import pytest
import pytest_asyncio
from database import Base
from modules.employees.schemas import (
    EmployeeCreate,
    EmployeeUpdate,
    OrganizationalUnitCreate,
    PositionCreate,
)
from modules.employees.service import EmployeeService
from modules.iam.models import User
from modules.shared.enums import EmployeeStatus
from modules.shared.exceptions import ValidationException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.fixture
def mock_admin():
    return User(
        id=uuid.uuid4(),
        email="admin@elalto.gob.bo",
        full_name="Super Admin Test",
        password_hash="hash",
    )


@pytest.mark.asyncio
async def test_org_unit_creation_and_tree_hierarchy(async_db, mock_admin):
    """Valida creación jerárquica de unidades y construcción del árbol."""
    # 1. Crear unidad raíz
    root_in = OrganizationalUnitCreate(
        name="Secretaría Municipal de Comunicación",
        code="SMCS",
        status="ACTIVE",
    )
    root_unit = await EmployeeService.create_org_unit(async_db, root_in, mock_admin)
    assert root_unit.id is not None
    assert root_unit.code == "SMCS"

    # 2. Crear sub-unidad hija
    child_in = OrganizationalUnitCreate(
        name="Dirección de Redes Sociales y Monitoreo",
        code="DRSM",
        parent_id=root_unit.id,
        status="ACTIVE",
    )
    child_unit = await EmployeeService.create_org_unit(async_db, child_in, mock_admin)
    assert child_unit.parent_id == root_unit.id

    # 3. Obtener árbol
    tree = await EmployeeService.get_org_units_tree(async_db)
    assert len(tree) == 1
    assert tree[0].code == "SMCS"
    assert len(tree[0].children) == 1
    assert tree[0].children[0].code == "DRSM"


@pytest.mark.asyncio
async def test_employee_creation_and_immutability(async_db, mock_admin):
    """
    Principio VII: El employee_id es la clave primaria inmutable y no reutilizable.
    """
    pos = await EmployeeService.create_position(
        async_db,
        PositionCreate(title="Especialista en Monitoreo Digital", code="POS-01"),
        mock_admin,
    )

    emp_in = EmployeeCreate(
        employee_id="GAMEA-2026-001",
        first_name="Rodrigo",
        last_name="Quispe",
        document_number="5849201",
        position_id=pos.id,
        status=EmployeeStatus.ACTIVE.value,
    )
    emp = await EmployeeService.create_employee(async_db, emp_in, mock_admin)

    assert emp.employee_id == "GAMEA-2026-001"
    assert emp.first_name == "Rodrigo"
    assert emp.document_hash is not None
    assert emp.document_number_encrypted != "5849201"

    # Intentar registrar otro funcionario con el mismo employee_id (Debe fallar)
    with pytest.raises(ValidationException):
        await EmployeeService.create_employee(async_db, emp_in, mock_admin)


@pytest.mark.asyncio
async def test_employee_transfer_and_history_audit(async_db, mock_admin):
    """
    T-204 / REQ-EMP-004: Cambios organizacionales deben registrarse automáticamente
    en employee_history.
    """
    u1 = await EmployeeService.create_org_unit(
        async_db,
        OrganizationalUnitCreate(name="Dirección A", code="DIR-A"),
        mock_admin,
    )
    u2 = await EmployeeService.create_org_unit(
        async_db,
        OrganizationalUnitCreate(name="Dirección B", code="DIR-B"),
        mock_admin,
    )

    emp_in = EmployeeCreate(
        employee_id="GAMEA-2026-002",
        first_name="Elena",
        last_name="Flores",
        document_number="7890123",
        organizational_unit_id=u1.id,
        status=EmployeeStatus.ACTIVE.value,
    )
    emp = await EmployeeService.create_employee(async_db, emp_in, mock_admin)

    # Transferir funcionario a Dirección B
    emp_update = EmployeeUpdate(
        organizational_unit_id=u2.id,
        change_reason="Transferencia por reestructuración operativa",
    )
    updated = await EmployeeService.update_employee(
        async_db,
        emp.employee_id,
        emp_update,
        mock_admin,
    )
    assert updated.organizational_unit_id == u2.id

    # Consultar historial (T-204)
    emp_with_history = await EmployeeService.get_employee_by_id(async_db, emp.employee_id)
    assert len(emp_with_history.history) == 1
    h_entry = emp_with_history.history[0]
    assert h_entry.previous_organizational_unit_id == u1.id
    assert h_entry.new_organizational_unit_id == u2.id
    assert "Transferencia" in h_entry.change_reason


@pytest.mark.asyncio
async def test_employee_deactivation_soft_delete(async_db, mock_admin):
    """
    BR-EMP-004: Los funcionarios no se eliminan físicamente sino que se desactivan
    registrando motivo en el historial.
    """
    emp_in = EmployeeCreate(
        employee_id="GAMEA-2026-003",
        first_name="Javier",
        last_name="Ticona",
        document_number="3456789",
        status=EmployeeStatus.ACTIVE.value,
    )
    emp = await EmployeeService.create_employee(async_db, emp_in, mock_admin)

    # Dar de baja lógica
    deactivated = await EmployeeService.deactivate_employee(
        async_db,
        emp.employee_id,
        mock_admin,
        reason="Fin de contrato temporal",
    )
    assert deactivated.status == EmployeeStatus.TERMINATED.value

    # Verificar registro en historial
    emp_reloaded = await EmployeeService.get_employee_by_id(async_db, emp.employee_id)
    assert len(emp_reloaded.history) == 1
    assert emp_reloaded.history[0].new_status == EmployeeStatus.TERMINATED.value
    assert "Fin de contrato" in emp_reloaded.history[0].change_reason
