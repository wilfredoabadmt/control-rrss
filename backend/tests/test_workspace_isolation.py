"""
Pruebas de Aislamiento y Partición Multi-Tenant de Espacios de Trabajo (SDD T-1000)
REQ-IAM-005, REQ-EMP-005, BR-IAM-014, BR-IAM-015, BR-EMP-012, BR-EMP-013, BR-EMP-014
"""

import io
import uuid
import pytest
import pytest_asyncio
import pandas as pd
from database import Base
from modules.employees.models import Employee
from modules.employees.schemas import EmployeeCreate, EmployeeUpdate
from modules.employees.service import EmployeeService
from modules.employees.importer import EmployeePayrollImporter
from modules.iam.models import User, Role
from modules.shared.enums import UserRole
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
def user_unit_prensa():
    """Usuario asignado a la Unidad de Prensa (Dirección de Comunicación)."""
    return User(
        id=uuid.uuid4(),
        email="prensa@elalto.gob.bo",
        full_name="Operador Prensa",
        password_hash="hash",
        workspace_type="UNIT",
        assigned_direction="Dirección de Comunicación",
        assigned_unit="Unidad de Prensa",
        roles=[Role(id=uuid.uuid4(), name=UserRole.OPERATOR.value, description="Operador")],
    )


@pytest.fixture
def user_unit_imagen():
    """Usuario asignado a la Unidad de Imagen Corporativa (Dirección de Comunicación)."""
    return User(
        id=uuid.uuid4(),
        email="imagen@elalto.gob.bo",
        full_name="Operador Imagen",
        password_hash="hash",
        workspace_type="UNIT",
        assigned_direction="Dirección de Comunicación",
        assigned_unit="Unidad de Imagen Corporativa",
        roles=[Role(id=uuid.uuid4(), name=UserRole.OPERATOR.value, description="Operador")],
    )


@pytest.fixture
def user_unit_planificacion():
    """Usuario asignado a la Unidad de Planificación Estratégica (Dirección de Planificación)."""
    return User(
        id=uuid.uuid4(),
        email="plan@elalto.gob.bo",
        full_name="Operador Planificación",
        password_hash="hash",
        workspace_type="UNIT",
        assigned_direction="Dirección de Planificación",
        assigned_unit="Unidad de Planificación Estratégica",
        roles=[Role(id=uuid.uuid4(), name=UserRole.OPERATOR.value, description="Operador")],
    )


@pytest.fixture
def user_director_comunicacion():
    """Director asignado a toda la Dirección de Comunicación (nivel DIRECTION)."""
    return User(
        id=uuid.uuid4(),
        email="director.comms@elalto.gob.bo",
        full_name="Director Comunicación",
        password_hash="hash",
        workspace_type="DIRECTION",
        assigned_direction="Dirección de Comunicación",
        assigned_unit=None,
        roles=[Role(id=uuid.uuid4(), name=UserRole.DIRECTOR.value, description="Director")],
    )


@pytest.fixture
def user_superadmin():
    """Super Administrador con alcance GLOBAL sobre todo el GAMEA."""
    return User(
        id=uuid.uuid4(),
        email="superadmin@elalto.gob.bo",
        full_name="Super Admin Central",
        password_hash="hash",
        workspace_type="GLOBAL",
        assigned_direction=None,
        assigned_unit=None,
        roles=[Role(id=uuid.uuid4(), name=UserRole.SUPER_ADMIN.value, description="Super Admin")],
    )


@pytest.mark.asyncio
async def test_workspace_unit_isolation_on_employee_crud(
    async_db,
    user_unit_prensa,
    user_unit_imagen,
    user_unit_planificacion,
    user_director_comunicacion,
    user_superadmin,
):
    """
    Verifica que cada unidad crea funcionarios en su espacio estrictamente aislado:
    - Unidad de Prensa no es visible para Unidad de Imagen ni Unidad de Planificación.
    - Modificaciones y bajas cruzadas son bloqueadas por política de seguridad (BR-EMP-014).
    - Director de Comunicación supervisa solo las unidades de su dirección.
    - Superadmin supervisa todo el municipio.
    """
    # 1. Unidad de Prensa crea su funcionario
    emp_prensa = await EmployeeService.create_employee(
        async_db,
        EmployeeCreate(
            first_name="Carlos",
            last_name="Prensa",
            document_number="7890123 LP",
            id_document="7890123 LP",
            email="cprensa@elalto.gob.bo",
            org_unit_name="Unidad de Prensa",
            parent_unit_name="Dirección de Comunicación",
            position_title="Redactor",
        ),
        user_unit_prensa,
    )
    assert emp_prensa.employee_id is not None
    assert emp_prensa.created_by_user_id == user_unit_prensa.id

    # 2. Unidad de Imagen crea su propio funcionario
    emp_imagen = await EmployeeService.create_employee(
        async_db,
        EmployeeCreate(
            first_name="Laura",
            last_name="Diseño",
            document_number="8901234 LP",
            id_document="8901234 LP",
            email="ldiseno@elalto.gob.bo",
            org_unit_name="Unidad de Imagen Corporativa",
            parent_unit_name="Dirección de Comunicación",
            position_title="Diseñadora Gráfica",
        ),
        user_unit_imagen,
    )
    assert emp_imagen.employee_id is not None

    # 3. Listado por Unidad de Prensa: solo ve su funcionario (Carlos Prensa)
    list_prensa, total_prensa = await EmployeeService.list_employees(
        db=async_db, current_user=user_unit_prensa
    )
    assert total_prensa == 1
    assert list_prensa[0].employee_id == emp_prensa.employee_id
    assert list_prensa[0].first_name == "Carlos"

    # 4. Listado por Unidad de Imagen: solo ve su funcionario (Laura Diseño)
    list_imagen, total_imagen = await EmployeeService.list_employees(
        db=async_db, current_user=user_unit_imagen
    )
    assert total_imagen == 1
    assert list_imagen[0].employee_id == emp_imagen.employee_id
    assert list_imagen[0].first_name == "Laura"

    # 5. Listado por Unidad de Planificación: lista vacía (0 funcionarios)
    list_plan, total_plan = await EmployeeService.list_employees(
        db=async_db, current_user=user_unit_planificacion
    )
    assert total_plan == 0

    # 6. Violación de aislamiento: Operador de Imagen intenta modificar funcionario de Prensa
    with pytest.raises(ValidationException) as exc_info:
        await EmployeeService.update_employee(
            async_db,
            emp_prensa.employee_id,
            EmployeeUpdate(position_title="Intento de Modificación Ilegítima"),
            user_unit_imagen,
        )
    assert "fuera de su espacio de trabajo" in str(exc_info.value)

    # 7. Violación de aislamiento: Operador de Imagen intenta eliminar funcionario de Prensa
    with pytest.raises(ValidationException) as exc_delete:
        await EmployeeService.delete_employee(
            async_db,
            emp_prensa.employee_id,
            user_unit_imagen,
            permanent=False,
            reason="Prueba ilegítima",
        )
    assert "fuera de su espacio de trabajo" in str(exc_delete.value)

    # 8. Visibilidad consolidada de Director de Comunicación:
    # Ve tanto emp_prensa como emp_imagen porque pertenecen a su Dirección
    list_dir, total_dir = await EmployeeService.list_employees(
        db=async_db, current_user=user_director_comunicacion
    )
    assert total_dir == 2
    dir_emp_ids = {e.employee_id for e in list_dir}
    assert emp_prensa.employee_id in dir_emp_ids
    assert emp_imagen.employee_id in dir_emp_ids

    # 9. Super Administrador con alcance GLOBAL:
    list_global, total_global = await EmployeeService.list_employees(
        db=async_db, current_user=user_superadmin
    )
    assert total_global == 2


@pytest.mark.asyncio
async def test_workspace_importer_isolation_and_no_collision(
    async_db,
    user_unit_prensa,
    user_unit_imagen,
):
    """
    Verifica que dos unidades importando un archivo Excel con funcionarios con nombres
    o apellidos idénticos ("Juan Perez") no colisionen ni se sobreescriban entre sí (BR-EMP-013).
    """
    # 1. Crear nómina para Unidad de Prensa con Juan Pérez
    csv_prensa = (
        "id;nombres;apellidos;ci;cargo;facebook;tiktok\n"
        "101;Juan;Perez;555111 LP;Periodista;fb_juan_prensa;tt_juan_prensa\n"
    ).encode("utf-8")

    report_prensa = await EmployeePayrollImporter.import_payroll_file(
        db=async_db,
        file_content=csv_prensa,
        filename="nomina_prensa.csv",
        current_user=user_unit_prensa,
    )
    assert report_prensa.created_count == 1
    assert report_prensa.total_records == 1

    # 2. Crear nómina para Unidad de Imagen con otro Juan Pérez homónimo
    csv_imagen = (
        "id;nombres;apellidos;ci;cargo;facebook;tiktok\n"
        "202;Juan;Perez;666222 LP;Fotografo;fb_juan_imagen;tt_juan_imagen\n"
    ).encode("utf-8")

    report_imagen = await EmployeePayrollImporter.import_payroll_file(
        db=async_db,
        file_content=csv_imagen,
        filename="nomina_imagen.csv",
        current_user=user_unit_imagen,
    )
    assert report_imagen.created_count == 1
    assert report_imagen.total_records == 1

    # 3. Comprobar que en la base de datos coexisten ambos empleados sin sobreescritura
    list_prensa, count_prensa = await EmployeeService.list_employees(
        db=async_db, current_user=user_unit_prensa
    )
    assert count_prensa == 1
    assert list_prensa[0].position.title == "Periodista"
    assert list_prensa[0].organizational_unit.name == "Unidad de Prensa"

    list_imagen, count_imagen = await EmployeeService.list_employees(
        db=async_db, current_user=user_unit_imagen
    )
    assert count_imagen == 1
    assert list_imagen[0].position.title == "Fotografo"
    assert list_imagen[0].organizational_unit.name == "Unidad de Imagen Corporativa"


@pytest.mark.asyncio
async def test_autonomous_users_full_independence_and_superadmin_oversight(async_db):
    """
    Verifica que cada usuario con panel individual/autónomo (incluso con roles como Auditor o Líder)
    es 100% independiente:
    - Lo que sube Usuario 1 NO aparece en la cuenta de Usuario 2.
    - Usuario 2 NO puede eliminar los funcionarios de Usuario 1.
    - Únicamente el Super Administrador Global puede ver las listas completas de todos los usuarios y direcciones.
    """
    role_auditor = Role(id=uuid.uuid4(), name=UserRole.AUDITOR.value, description="Auditor")
    role_super = Role(id=uuid.uuid4(), name=UserRole.SUPER_ADMIN.value, description="Super Admin")

    user_jose = User(
        id=uuid.uuid4(),
        email="jose@elalto.gob.bo",
        full_name="Jose Auditor",
        password_hash="hash",
        workspace_type="AUTONOMOUS",
        assigned_direction=None,
        assigned_unit=None,
        roles=[role_auditor],
    )

    user_wilfredo = User(
        id=uuid.uuid4(),
        email="wilfredo@elalto.gob.bo",
        full_name="Wilfredo Operador",
        password_hash="hash",
        workspace_type="AUTONOMOUS",
        assigned_direction=None,
        assigned_unit=None,
        roles=[Role(id=uuid.uuid4(), name=UserRole.OPERATOR.value, description="Operador")],
    )

    user_admin = User(
        id=uuid.uuid4(),
        email="admin@elalto.gob.bo",
        full_name="Super Administrador GAMEA",
        password_hash="hash",
        workspace_type="GLOBAL",
        assigned_direction=None,
        assigned_unit=None,
        roles=[role_super],
    )

    # 1. Jose sube una lista de 2 funcionarios a su cuenta
    csv_jose = (
        "nombres,apellidos,unidad,direccion,cuenta_facebook,cuenta_tiktok\n"
        "Sergio,Ramos,Prensa,Comunicacion,fb.com/sergio,@sergio\n"
        "Santos,Quispe,Prensa,Comunicacion,fb.com/santos,@santos\n"
    ).encode("utf-8")

    report_jose = await EmployeePayrollImporter.import_payroll_file(
        db=async_db,
        file_content=csv_jose,
        filename="nomina_jose.csv",
        current_user=user_jose,
    )
    assert report_jose.total_records == 2
    assert report_jose.created_count == 2

    # 2. Jose consulta su lista: ve exactamente sus 2 funcionarios
    list_jose, count_jose = await EmployeeService.list_employees(
        db=async_db, current_user=user_jose
    )
    assert count_jose == 2
    assert {e.first_name for e in list_jose} == {"Sergio", "Santos"}

    # 3. Wilfredo inicia sesión y consulta funcionarios: ve 0 funcionarios (completamente aislado)
    list_wilfredo, count_wilfredo = await EmployeeService.list_employees(
        db=async_db, current_user=user_wilfredo
    )
    assert count_wilfredo == 0
    assert len(list_wilfredo) == 0

    # 4. Wilfredo intenta eliminar un funcionario creado por Jose: es BLOQUEADO
    jose_emp_id = list_jose[0].employee_id
    with pytest.raises(ValidationException) as exc_del:
        await EmployeeService.delete_employee(
            async_db,
            jose_emp_id,
            user_wilfredo,
            permanent=True,
            reason="Intento de borrado cruzado",
        )
    assert "fuera de su espacio de trabajo" in str(exc_del.value)

    # 5. Wilfredo intenta eliminación en lote: no se elimina ningún registro de Jose
    bulk_res = await EmployeeService.bulk_delete_employees(
        db=async_db,
        employee_ids=[e.employee_id for e in list_jose],
        current_user=user_wilfredo,
        permanent=True,
    )
    assert bulk_res["deleted_count"] == 0
    assert bulk_res["failed_count"] == 2

    # 6. Jose sigue teniendo intactos sus 2 funcionarios
    list_jose_after, count_jose_after = await EmployeeService.list_employees(
        db=async_db, current_user=user_jose
    )
    assert count_jose_after == 2

    # 7. Super Administrador Central consulta funcionarios: ve los 2 funcionarios de Jose
    list_admin, count_admin = await EmployeeService.list_employees(
        db=async_db, current_user=user_admin
    )
    assert count_admin == 2
    assert {e.first_name for e in list_admin} == {"Sergio", "Santos"}

    # 8. Wilfredo sube sus propios funcionarios (1 funcionario)
    csv_wilfredo = (
        "nombres,apellidos,unidad,direccion,cuenta_facebook,cuenta_tiktok\n"
        "Mariela,Flores,Protocolo,Comunicacion,fb.com/mariela,@mariela\n"
    ).encode("utf-8")
    report_wilf = await EmployeePayrollImporter.import_payroll_file(
        db=async_db,
        file_content=csv_wilfredo,
        filename="nomina_wilf.csv",
        current_user=user_wilfredo,
    )
    assert report_wilf.created_count == 1

    # 9. Wilfredo ve SOLO su 1 funcionario
    list_w_now, count_w_now = await EmployeeService.list_employees(
        db=async_db, current_user=user_wilfredo
    )
    assert count_w_now == 1
    assert list_w_now[0].first_name == "Mariela"

    # 10. Jose sigue viendo SOLO sus 2 funcionarios (no ve el de Wilfredo)
    list_j_now, count_j_now = await EmployeeService.list_employees(
        db=async_db, current_user=user_jose
    )
    assert count_j_now == 2
    assert {e.first_name for e in list_j_now} == {"Sergio", "Santos"}

    # 11. Super Admin ve la consolidación total (3 funcionarios)
    list_admin_final, count_admin_final = await EmployeeService.list_employees(
        db=async_db, current_user=user_admin
    )
    assert count_admin_final == 3


