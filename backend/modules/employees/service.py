"""
Capa de Servicios de Directorio de Funcionarios y Organización — GAMEA Social Monitor
Principio VII: Identidad Única e Inmutable de Funcionarios
Principio VIII: Fuente Maestra de Recursos Humanos
Principio XX: Protección de Datos Personales
"""

import uuid

from core.audit.service import record_audit_event
from core.logging_config import get_correlation_id
from core.security.encryption import encrypt_field, hash_blind_index
from modules.employees.models import Employee, EmployeeHistory, OrganizationalUnit, Position
from modules.employees.schemas import (
    EmployeeCreate,
    EmployeeUpdate,
    OrganizationalUnitCreate,
    OrganizationalUnitTreeNode,
    OrganizationalUnitUpdate,
    PositionCreate,
)
from modules.iam.models import User
from modules.shared.enums import AuditAction, EmployeeStatus
from modules.shared.exceptions import EntityNotFoundException, ValidationException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class EmployeeService:

    # -------------------------------------------------------------------------
    # Unidades Organizacionales
    # -------------------------------------------------------------------------

    @staticmethod
    async def create_org_unit(db: AsyncSession, org_in: OrganizationalUnitCreate, current_user: User) -> OrganizationalUnit:
        # Validar unicidad del código
        stmt = select(OrganizationalUnit).where(OrganizationalUnit.code == org_in.code.upper().strip())
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            raise ValidationException(f"Ya existe una unidad con el código '{org_in.code}'.")

        unit = OrganizationalUnit(
            name=org_in.name.strip(),
            code=org_in.code.upper().strip(),
            parent_id=org_in.parent_id,
            status=org_in.status,
        )
        db.add(unit)

        await record_audit_event(
            db=db,
            action=AuditAction.CREATE,
            entity_name="OrganizationalUnit",
            entity_id=str(unit.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            new_state={"name": unit.name, "code": unit.code, "parent_id": str(unit.parent_id) if unit.parent_id else None},
        )
        await db.refresh(unit)
        return unit

    @staticmethod
    async def update_org_unit(
        db: AsyncSession,
        unit_id: uuid.UUID,
        org_in: OrganizationalUnitUpdate,
        current_user: User,
    ) -> OrganizationalUnit:
        stmt = select(OrganizationalUnit).where(OrganizationalUnit.id == unit_id)
        unit = (await db.execute(stmt)).scalar_one_or_none()
        if not unit:
            raise EntityNotFoundException("OrganizationalUnit", str(unit_id))

        prev_state = {"name": unit.name, "code": unit.code, "parent_id": str(unit.parent_id) if unit.parent_id else None}

        if org_in.name is not None:
            unit.name = org_in.name.strip()
        if org_in.code is not None:
            unit.code = org_in.code.upper().strip()
        if org_in.parent_id is not None:
            # Evitar ciclos jerárquicos simples
            if org_in.parent_id == unit.id:
                raise ValidationException("Una unidad no puede ser su propio padre.")
            unit.parent_id = org_in.parent_id
        if org_in.status is not None:
            unit.status = org_in.status

        await record_audit_event(
            db=db,
            action=AuditAction.UPDATE,
            entity_name="OrganizationalUnit",
            entity_id=str(unit.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            previous_state=prev_state,
            new_state={"name": unit.name, "code": unit.code, "parent_id": str(unit.parent_id) if unit.parent_id else None},
        )
        await db.refresh(unit)
        return unit

    @staticmethod
    async def get_org_units_tree(db: AsyncSession) -> list[OrganizationalUnitTreeNode]:
        """Construye el árbol jerárquico de unidades organizacionales."""
        stmt = select(OrganizationalUnit).order_by(OrganizationalUnit.name)
        result = await db.execute(stmt)
        all_units = list(result.scalars().all())

        nodes_map: dict[uuid.UUID, OrganizationalUnitTreeNode] = {}
        for u in all_units:
            nodes_map[u.id] = OrganizationalUnitTreeNode(
                id=u.id,
                name=u.name,
                code=u.code,
                parent_id=u.parent_id,
                status=u.status,
                created_at=u.created_at,
                updated_at=u.updated_at,
                children=[],
            )

        root_nodes: list[OrganizationalUnitTreeNode] = []
        for node in nodes_map.values():
            if node.parent_id and node.parent_id in nodes_map:
                nodes_map[node.parent_id].children.append(node)
            else:
                root_nodes.append(node)

        return root_nodes

    # -------------------------------------------------------------------------
    # Cargos (Positions)
    # -------------------------------------------------------------------------

    @staticmethod
    async def create_position(db: AsyncSession, pos_in: PositionCreate, current_user: User) -> Position:
        pos = Position(
            title=pos_in.title.strip(),
            code=pos_in.code.upper().strip() if pos_in.code else None,
            status=pos_in.status,
        )
        db.add(pos)

        await record_audit_event(
            db=db,
            action=AuditAction.CREATE,
            entity_name="Position",
            entity_id=str(pos.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            new_state={"title": pos.title, "code": pos.code},
        )
        await db.refresh(pos)
        return pos

    # -------------------------------------------------------------------------
    # Funcionarios (Employees)
    # -------------------------------------------------------------------------

    @staticmethod
    async def get_employee_by_id(db: AsyncSession, employee_id: str) -> Employee | None:
        stmt = (
            select(Employee)
            .where(Employee.employee_id == employee_id.strip())
            .options(
                selectinload(Employee.organizational_unit),
                selectinload(Employee.position),
                selectinload(Employee.history),
            )
        )
        return (await db.execute(stmt)).scalar_one_or_none()

    @staticmethod
    async def create_employee(
        db: AsyncSession,
        emp_in: EmployeeCreate,
        current_user: User | None = None,
        correlation_id: str | None = None,
    ) -> Employee:
        """Crea un funcionario institucional respetando inmutabilidad y cifrado."""
        emp_id = emp_in.employee_id.strip()

        # Validar inmutabilidad y no reutilización (Principio VII)
        existing = await EmployeeService.get_employee_by_id(db, emp_id)
        if existing:
            raise ValidationException(f"El identificador institucional '{emp_id}' ya se encuentra registrado.")

        # Cifrar PII (Principio XX)
        encrypted_doc = encrypt_field(emp_in.document_number)
        doc_hash = hash_blind_index(emp_in.document_number)

        emp = Employee(
            employee_id=emp_id,
            document_number_encrypted=encrypted_doc,
            document_hash=doc_hash,
            first_name=emp_in.first_name.strip(),
            last_name=emp_in.last_name.strip(),
            organizational_unit_id=emp_in.organizational_unit_id,
            position_id=emp_in.position_id,
            status=emp_in.status,
            hire_date=emp_in.hire_date,
            termination_date=emp_in.termination_date,
        )
        db.add(emp)

        cid = correlation_id or get_correlation_id()
        await record_audit_event(
            db=db,
            action=AuditAction.CREATE,
            entity_name="Employee",
            entity_id=emp.employee_id,
            user_id=str(current_user.id) if current_user else None,
            user_email=current_user.email if current_user else None,
            new_state={
                "employee_id": emp.employee_id,
                "status": emp.status,
                "organizational_unit_id": str(emp.organizational_unit_id) if emp.organizational_unit_id else None,
            },
            correlation_id=cid,
        )
        return emp

    @staticmethod
    async def update_employee(
        db: AsyncSession,
        employee_id: str,
        emp_in: EmployeeUpdate,
        current_user: User,
        correlation_id: str | None = None,
    ) -> Employee:
        """Actualiza un funcionario y registra cambios en employee_history (T-204)."""
        emp = await EmployeeService.get_employee_by_id(db, employee_id)
        if not emp:
            raise EntityNotFoundException("Employee", employee_id)

        cid = correlation_id or get_correlation_id()

        # Detectar si hay cambios organizacionales o de cargo/estado
        unit_changed = emp_in.organizational_unit_id is not None and emp_in.organizational_unit_id != emp.organizational_unit_id
        pos_changed = emp_in.position_id is not None and emp_in.position_id != emp.position_id
        status_changed = emp_in.status is not None and emp_in.status != emp.status

        prev_unit_id = emp.organizational_unit_id
        prev_pos_id = emp.position_id
        prev_status = emp.status

        # Aplicar actualizaciones
        if emp_in.first_name is not None:
            emp.first_name = emp_in.first_name.strip()
        if emp_in.last_name is not None:
            emp.last_name = emp_in.last_name.strip()
        if emp_in.document_number is not None:
            emp.document_number_encrypted = encrypt_field(emp_in.document_number)
            emp.document_hash = hash_blind_index(emp_in.document_number)
        if unit_changed:
            emp.organizational_unit_id = emp_in.organizational_unit_id
        if pos_changed:
            emp.position_id = emp_in.position_id
        if status_changed:
            emp.status = emp_in.status or emp.status
        if emp_in.hire_date is not None:
            emp.hire_date = emp_in.hire_date
        if emp_in.termination_date is not None:
            emp.termination_date = emp_in.termination_date

        # T-204: Si hubo cambio organizacional, registrar en EmployeeHistory
        if unit_changed or pos_changed or status_changed:
            history_entry = EmployeeHistory(
                employee_id=emp.employee_id,
                previous_organizational_unit_id=prev_unit_id,
                new_organizational_unit_id=emp.organizational_unit_id,
                previous_position_id=prev_pos_id,
                new_position_id=emp.position_id,
                previous_status=prev_status,
                new_status=emp.status,
                change_reason=emp_in.change_reason or "Actualización de ficha de funcionario",
                recorded_by_user_id=str(current_user.id),
                correlation_id=cid,
            )
            db.add(history_entry)

        await record_audit_event(
            db=db,
            action=AuditAction.UPDATE,
            entity_name="Employee",
            entity_id=emp.employee_id,
            user_id=str(current_user.id),
            user_email=current_user.email,
            previous_state={"unit": str(prev_unit_id), "position": str(prev_pos_id), "status": prev_status},
            new_state={"unit": str(emp.organizational_unit_id), "position": str(emp.position_id), "status": emp.status},
            correlation_id=cid,
        )
        await db.refresh(emp)
        return emp

    @staticmethod
    async def deactivate_employee(
        db: AsyncSession,
        employee_id: str,
        current_user: User,
        reason: str | None = "Desvinculación institucional",
    ) -> Employee:
        """Baja lógica de funcionario (BR-EMP-004)."""
        emp = await EmployeeService.get_employee_by_id(db, employee_id)
        if not emp:
            raise EntityNotFoundException("Employee", employee_id)

        prev_status = emp.status
        emp.status = EmployeeStatus.TERMINATED.value
        cid = get_correlation_id()

        history_entry = EmployeeHistory(
            employee_id=emp.employee_id,
            previous_organizational_unit_id=emp.organizational_unit_id,
            new_organizational_unit_id=emp.organizational_unit_id,
            previous_position_id=emp.position_id,
            new_position_id=emp.position_id,
            previous_status=prev_status,
            new_status=EmployeeStatus.TERMINATED.value,
            change_reason=reason,
            recorded_by_user_id=str(current_user.id),
            correlation_id=cid,
        )
        db.add(history_entry)

        await record_audit_event(
            db=db,
            action=AuditAction.DELETE,
            entity_name="Employee",
            entity_id=emp.employee_id,
            user_id=str(current_user.id),
            user_email=current_user.email,
            details={"operation": "TERMINATE_EMPLOYEE", "reason": reason},
            correlation_id=cid,
        )
        await db.refresh(emp)
        return emp

    @staticmethod
    async def list_employees(
        db: AsyncSession,
        unit_id: uuid.UUID | None = None,
        status: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Employee], int]:
        """Consulta paginada con filtros organizacionales y búsqueda."""
        query = select(Employee)
        count_query = select(func.count()).select_from(Employee)

        if unit_id:
            query = query.where(Employee.organizational_unit_id == unit_id)
            count_query = count_query.where(Employee.organizational_unit_id == unit_id)
        if status:
            query = query.where(Employee.status == status.upper())
            count_query = count_query.where(Employee.status == status.upper())
        if search:
            search_term = f"%{search.strip()}%"
            filter_expr = or_(
                Employee.first_name.ilike(search_term),
                Employee.last_name.ilike(search_term),
                Employee.employee_id.ilike(search_term),
            )
            query = query.where(filter_expr)
            count_query = count_query.where(filter_expr)

        total = (await db.execute(count_query)).scalar_one()

        query = (
            query.order_by(Employee.last_name, Employee.first_name)
            .offset(offset)
            .limit(limit)
            .options(
                selectinload(Employee.organizational_unit),
                selectinload(Employee.position),
            )
        )
        employees = list((await db.execute(query)).scalars().all())
        return employees, total
