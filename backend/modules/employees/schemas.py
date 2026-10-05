"""
Esquemas Pydantic para Directorio de Funcionarios y Organización — GAMEA Social Monitor
"""

import uuid
from datetime import date, datetime

from modules.shared.enums import EmployeeStatus
from pydantic import BaseModel, Field, computed_field

# -----------------------------------------------------------------------------
# Esquemas de Cargos (Positions)
# -----------------------------------------------------------------------------

class PositionBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150, description="Denominación del cargo")
    code: str | None = Field(None, max_length=50, description="Código de cargo")
    status: str = Field(default="ACTIVE", description="Estado: ACTIVE / INACTIVE")


class PositionCreate(PositionBase):
    pass


class PositionUpdate(BaseModel):
    title: str | None = Field(None, min_length=2, max_length=150)
    code: str | None = None
    status: str | None = None


class PositionResponse(PositionBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# -----------------------------------------------------------------------------
# Esquemas de Unidades Organizacionales (Organizational Units)
# -----------------------------------------------------------------------------

class OrganizationalUnitBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200, description="Nombre de la unidad")
    code: str = Field(..., min_length=2, max_length=50, description="Código identificador institucional")
    parent_id: uuid.UUID | None = Field(None, description="ID de unidad padre")
    status: str = Field(default="ACTIVE", description="Estado de la unidad")


class OrganizationalUnitCreate(OrganizationalUnitBase):
    pass


class OrganizationalUnitUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=200)
    code: str | None = Field(None, min_length=2, max_length=50)
    parent_id: uuid.UUID | None = None
    status: str | None = None


class OrganizationalUnitResponse(OrganizationalUnitBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrganizationalUnitTreeNode(OrganizationalUnitResponse):
    children: list["OrganizationalUnitTreeNode"] = []

    model_config = {"from_attributes": True}


# -----------------------------------------------------------------------------
# Esquemas de Funcionarios (Employees)
# -----------------------------------------------------------------------------

class EmployeeBase(BaseModel):
    employee_id: str | None = Field(None, max_length=50, description="Identificador único institucional (inmutable)")
    first_name: str = Field(..., min_length=1, max_length=100, description="Nombres")
    last_name: str = Field(..., min_length=1, max_length=100, description="Apellidos")
    organizational_unit_id: uuid.UUID | None = Field(None, description="ID de la unidad organizacional")
    org_unit_name: str | None = Field(None, description="Nombre de la unidad institucional")
    parent_unit_name: str | None = Field(None, description="Dirección superior")
    position_id: uuid.UUID | None = Field(None, description="ID del cargo institucional")
    position_title: str | None = Field(None, description="Cargo o puesto institucional")
    email: str | None = Field(None, description="Correo electrónico institucional")
    facebook_account: str | None = Field(None, description="Cuenta o URL de Facebook")
    tiktok_account: str | None = Field(None, description="Cuenta o URL de TikTok")
    status: str = Field(default=EmployeeStatus.ACTIVE.value, description="Estado del funcionario")
    hire_date: date | None = Field(None, description="Fecha de ingreso")
    termination_date: date | None = Field(None, description="Fecha de desvinculación")


class EmployeeCreate(EmployeeBase):
    document_number: str | None = Field(None, min_length=3, max_length=30, description="Número de cédula de identidad")
    id_document: str | None = Field(None, description="Alias para documento de identidad")


class EmployeeUpdate(BaseModel):
    # Nota: employee_id NO puede ser actualizado (Principio VII)
    document_number: str | None = Field(None, min_length=3, max_length=30)
    id_document: str | None = None
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    organizational_unit_id: uuid.UUID | None = None
    org_unit_name: str | None = None
    parent_unit_name: str | None = None
    position_id: uuid.UUID | None = None
    position_title: str | None = None
    email: str | None = None
    facebook_account: str | None = None
    tiktok_account: str | None = None
    status: str | None = None
    is_active: bool | None = None
    hire_date: date | None = None
    termination_date: date | None = None
    change_reason: str | None = Field(None, max_length=255, description="Motivo del cambio")


class EmployeeHistoryResponse(BaseModel):
    id: uuid.UUID
    employee_id: str
    previous_organizational_unit_id: uuid.UUID | None = None
    new_organizational_unit_id: uuid.UUID | None = None
    previous_position_id: uuid.UUID | None = None
    new_position_id: uuid.UUID | None = None
    previous_status: str | None = None
    new_status: str | None = None
    effective_date: datetime
    change_reason: str | None = None
    correlation_id: str

    model_config = {"from_attributes": True}


class EmployeeResponse(BaseModel):
    id: str | None = None  # Compatible con frontend emp.id
    employee_id: str
    first_name: str
    last_name: str
    document_number: str | None = None  # Se descifra o se oculta según rol
    id_document: str | None = None
    email: str | None = None
    organizational_unit_id: uuid.UUID | None = None
    org_unit_name: str | None = None
    parent_unit_name: str | None = None
    position_id: uuid.UUID | None = None
    position_title: str | None = None
    facebook_account: str | None = None
    tiktok_account: str | None = None
    status: str
    is_active: bool = True
    hire_date: date | None = None
    termination_date: date | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmployeeDetailResponse(EmployeeResponse):
    organizational_unit: OrganizationalUnitResponse | None = None
    position: PositionResponse | None = None
    history: list[EmployeeHistoryResponse] = []

    model_config = {"from_attributes": True}


# -----------------------------------------------------------------------------
# Esquemas de Sincronización e Importación de Nómina
# -----------------------------------------------------------------------------

class EmployeeImportReport(BaseModel):
    total_records: int = Field(..., description="Total de registros procesados")
    created_count: int = Field(..., description="Nuevos funcionarios creados (Altas)")
    updated_count: int = Field(..., description="Funcionarios modificados / transferidos")
    unchanged_count: int = Field(..., description="Registros sin cambios (Idempotencia)")
    deactivated_count: int = Field(..., description="Funcionarios marcados como inactivos (Bajas)")
    errors: list[str] = Field(default=[], description="Errores encontrados en filas específicas")
    correlation_id: str

    @computed_field
    @property
    def total_processed(self) -> int:
        return self.total_records

    @computed_field
    @property
    def created(self) -> int:
        return self.created_count

    @computed_field
    @property
    def updated(self) -> int:
        return self.updated_count

    @computed_field
    @property
    def unchanged(self) -> int:
        return self.unchanged_count


# -----------------------------------------------------------------------------
# Esquemas de Eliminación Masiva / en Lote
# -----------------------------------------------------------------------------

class EmployeeBulkDeleteRequest(BaseModel):
    employee_ids: list[str] = Field(..., min_length=1, description="Lista de IDs o identificadores de funcionarios a procesar")
    permanent: bool = Field(default=False, description="Si es True, purga física definitiva; si es False, baja lógica institucional")
    reason: str | None = Field(default="Eliminación administrativa en lote", description="Motivo de la acción")


class EmployeeBulkDeleteResponse(BaseModel):
    total_requested: int
    deleted_count: int
    failed_count: int = 0
    permanent: bool = False
    errors: list[str] = []
    detail: str

