"""
Pruebas de Sincronización e Importación Idempotente de Nómina — GAMEA Social Monitor
Principio VIII: Fuente Maestra de Recursos Humanos (Sincronización Idempotente)
"""

import uuid

import pytest
import pytest_asyncio
from database import Base
from modules.employees.importer import EmployeePayrollImporter
from modules.employees.service import EmployeeService
from modules.iam.models import User
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
        email="rrhh_admin@elalto.gob.bo",
        full_name="Responsable RR.HH.",
        password_hash="hash",
    )


SAMPLE_CSV = """employee_id,document_number,first_name,last_name,org_unit_code,position_title,status
GAMEA-1001,4839201,Ramiro,Choque,SMCS,Analista de Medios,ACTIVE
GAMEA-1002,5930211,Sonia,Apaza,SMCS,Diseñadora Gráfica,ACTIVE
GAMEA-1003,6049281,Walter,Gutierrez,DTIC,Ingeniero de Software,ACTIVE
"""

UPDATED_CSV = """employee_id,document_number,first_name,last_name,org_unit_code,position_title,status
GAMEA-1001,4839201,Ramiro,Choque,DTIC,Analista de Medios,ACTIVE
GAMEA-1002,5930211,Sonia,Apaza,SMCS,Diseñadora Gráfica,ACTIVE
GAMEA-1003,6049281,Walter,Gutierrez,DTIC,Ingeniero de Software,ACTIVE
"""


@pytest.mark.asyncio
async def test_payroll_import_strict_idempotency(async_db, mock_admin):
    """
    Principio VIII: La importación duplicada de la misma nómina DEBE ser inocua
    (0 altas, 0 modificaciones, 100% unchanged).
    """
    csv_bytes = SAMPLE_CSV.encode("utf-8")

    # 1. Primera importación (Altas)
    report_1 = await EmployeePayrollImporter.import_payroll_file(
        db=async_db,
        file_content=csv_bytes,
        filename="nomina_septiembre_2026.csv",
        current_user=mock_admin,
    )

    assert report_1.total_records == 3
    assert report_1.created_count == 3
    assert report_1.updated_count == 0
    assert report_1.unchanged_count == 0
    assert len(report_1.errors) == 0

    # 2. Segunda importación con el MISMO archivo (Idempotencia pura)
    report_2 = await EmployeePayrollImporter.import_payroll_file(
        db=async_db,
        file_content=csv_bytes,
        filename="nomina_septiembre_2026_reintento.csv",
        current_user=mock_admin,
    )

    assert report_2.total_records == 3
    assert report_2.created_count == 0
    assert report_2.updated_count == 0
    assert report_2.unchanged_count == 3  # Todos sin cambios
    assert len(report_2.errors) == 0

    # 3. Tercera importación con cambio de unidad para Ramiro Choque
    updated_bytes = UPDATED_CSV.encode("utf-8")
    report_3 = await EmployeePayrollImporter.import_payroll_file(
        db=async_db,
        file_content=updated_bytes,
        filename="nomina_octubre_transferencia.csv",
        current_user=mock_admin,
    )

    assert report_3.total_records == 3
    assert report_3.created_count == 0
    assert report_3.updated_count == 1     # Ramiro transferido a DTIC
    assert report_3.unchanged_count == 2   # Sonia y Walter sin cambios

    # Verificar que se creó el historial de transferencia para Ramiro
    emp = await EmployeeService.get_employee_by_id(async_db, "GAMEA-1001")
    assert len(emp.history) == 1
    assert "Sincronización de nómina" in emp.history[0].change_reason
