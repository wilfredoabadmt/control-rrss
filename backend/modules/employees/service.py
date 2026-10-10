"""
Capa de Servicios de Directorio de Funcionarios y Organización — GAMEA Social Monitor
Principio VII: Identidad Única e Inmutable de Funcionarios
Principio VIII: Fuente Maestra de Recursos Humanos
Principio XX: Protección de Datos Personales
"""

import re
import uuid

from config import settings
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
from modules.shared.enums import AuditAction, BindingStatus, EmployeeStatus, UserRole
from modules.shared.exceptions import EntityNotFoundException, ValidationException
from modules.social_accounts.models import SocialAccount, SocialPlatform
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
        await db.commit()
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
        await db.commit()
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
        await db.commit()
        return pos

    # -------------------------------------------------------------------------
    # Funcionarios (Employees)
    # -------------------------------------------------------------------------

    @staticmethod
    async def _resolve_or_create_unit(db: AsyncSession, unit_name: str, parent_name: str | None = None) -> OrganizationalUnit:
        clean_name = unit_name.strip()
        clean_name = re.sub(r'(?i)alcaldesa', 'Alcalde', clean_name)

        parent_id = None
        if parent_name and parent_name.strip():
            clean_parent = parent_name.strip()
            clean_parent = re.sub(r'(?i)alcaldesa', 'Alcalde', clean_parent)
            stmt_p = select(OrganizationalUnit).where(func.lower(OrganizationalUnit.name) == clean_parent.lower())
            p_unit = (await db.execute(stmt_p)).scalar_one_or_none()
            if not p_unit:
                code_cand = "".join(c for c in clean_parent[:6] if c.isalnum()).upper() or "DIR"
                p_unit = OrganizationalUnit(
                    name=clean_parent,
                    code=f"{code_cand}-{uuid.uuid4().hex[:4].upper()}",
                    parent_id=None,
                    status="ACTIVE",
                )
                db.add(p_unit)
                await db.flush()
            parent_id = p_unit.id

        stmt = select(OrganizationalUnit).where(func.lower(OrganizationalUnit.name) == clean_name.lower())
        unit = (await db.execute(stmt)).scalar_one_or_none()
        if unit:
            if parent_id and unit.parent_id != parent_id:
                unit.parent_id = parent_id
                await db.flush()
            return unit

        code_cand = "".join(c for c in clean_name[:6] if c.isalnum()).upper() or "OU"
        code = f"{code_cand}-{uuid.uuid4().hex[:4].upper()}"
        unit = OrganizationalUnit(
            name=clean_name,
            code=code,
            parent_id=parent_id,
            status="ACTIVE",
        )
        db.add(unit)
        await db.flush()
        return unit

    @staticmethod
    async def _resolve_or_create_position(db: AsyncSession, title: str) -> Position:
        clean_title = title.strip()
        stmt = select(Position).where(func.lower(Position.title) == clean_title.lower())
        pos = (await db.execute(stmt)).scalar_one_or_none()
        if pos:
            return pos
        code_cand = "".join(c for c in clean_title[:6] if c.isalnum()).upper() or "POS"
        code = f"{code_cand}-{uuid.uuid4().hex[:4].upper()}"
        pos = Position(
            title=clean_title,
            code=code,
            status="ACTIVE",
        )
        db.add(pos)
        await db.flush()
        return pos

    @staticmethod
    async def _link_or_update_social_account(
        db: AsyncSession,
        employee_id: str,
        platform_name: str,
        account_val: str | None,
    ) -> None:
        """Vincula, actualiza o desvincula una cuenta social institucional."""
        p_name = platform_name.upper().strip()
        stmt_p = select(SocialPlatform).where(SocialPlatform.name == p_name)
        platform = (await db.execute(stmt_p)).scalar_one_or_none()
        if not platform:
            platform = SocialPlatform(
                name=p_name,
                display_name=p_name.title(),
                is_active=True,
                api_version=settings.FACEBOOK_GRAPH_VERSION if p_name == "FACEBOOK" else "v2.0",
            )
            db.add(platform)
            await db.flush()

        stmt_acc = select(SocialAccount).where(
            SocialAccount.employee_id == employee_id,
            SocialAccount.platform_id == platform.id,
        )
        existing_acc = (await db.execute(stmt_acc)).scalar_one_or_none()

        clean_val = (account_val or "").strip()
        if not clean_val:
            if existing_acc:
                existing_acc.binding_status = BindingStatus.INACTIVE.value
            return

        username = clean_val
        if "/" in username:
            username = username.rstrip("/").split("/")[-1]
        username = username.lstrip("@")

        profile_url = clean_val if clean_val.startswith("http") else (
            f"https://facebook.com/{username}" if p_name == "FACEBOOK" else f"https://tiktok.com/@{username}"
        )

        if existing_acc:
            existing_acc.current_username = username
            existing_acc.profile_url = profile_url
            existing_acc.binding_status = BindingStatus.ACTIVE.value
        else:
            new_acc = SocialAccount(
                employee_id=employee_id,
                platform_id=platform.id,
                current_username=username,
                profile_url=profile_url,
                binding_status=BindingStatus.ACTIVE.value,
            )
            db.add(new_acc)
        await db.flush()

    @staticmethod
    async def get_employee_by_id(db: AsyncSession, employee_id: str) -> Employee | None:
        stmt = (
            select(Employee)
            .where(Employee.employee_id == employee_id.strip())
            .options(
                selectinload(Employee.organizational_unit).selectinload(OrganizationalUnit.parent),
                selectinload(Employee.position),
                selectinload(Employee.history),
            )
            .execution_options(populate_existing=True)
        )
        emp = (await db.execute(stmt)).scalar_one_or_none()
        if emp:
            stmt_acc = (
                select(SocialAccount)
                .where(SocialAccount.employee_id == emp.employee_id)
                .options(selectinload(SocialAccount.platform))
            )
            emp.social_accounts = list((await db.execute(stmt_acc)).scalars().all())
        return emp

    @staticmethod
    async def create_employee(
        db: AsyncSession,
        emp_in: EmployeeCreate,
        current_user: User | None = None,
        correlation_id: str | None = None,
    ) -> Employee:
        """Crea un funcionario institucional respetando inmutabilidad y cifrado."""
        doc_raw = (emp_in.document_number or emp_in.id_document or "").strip()
        emp_id = (emp_in.employee_id or "").strip()
        if not emp_id:
            emp_id = f"GAMEA-{doc_raw}" if doc_raw else f"EMP-{uuid.uuid4().hex[:6].upper()}"

        # Validar inmutabilidad y no reutilización (Principio VII)
        existing = await EmployeeService.get_employee_by_id(db, emp_id)
        if existing:
            raise ValidationException(f"El identificador institucional '{emp_id}' ya se encuentra registrado.")

        # Resolver unidad y cargo si se enviaron nombres
        ou_id = emp_in.organizational_unit_id
        if not ou_id and emp_in.org_unit_name:
            ou = await EmployeeService._resolve_or_create_unit(db, emp_in.org_unit_name, emp_in.parent_unit_name)
            ou_id = ou.id

        pos_id = emp_in.position_id
        if not pos_id and emp_in.position_title:
            pos = await EmployeeService._resolve_or_create_position(db, emp_in.position_title)
            pos_id = pos.id

        # Cifrar PII (Principio XX)
        encrypted_doc = encrypt_field(doc_raw) if doc_raw else encrypt_field(emp_id)
        doc_hash = hash_blind_index(doc_raw) if doc_raw else hash_blind_index(emp_id)

        norm_dir = None
        if emp_in.parent_unit_name and emp_in.parent_unit_name.strip():
            norm_dir = re.sub(r'(?i)alcaldesa', 'Alcalde', emp_in.parent_unit_name.strip())
        elif current_user and getattr(current_user, "assigned_direction", None):
            norm_dir = re.sub(r'(?i)alcaldesa', 'Alcalde', current_user.assigned_direction.strip())

        if not ou_id and current_user and getattr(current_user, "assigned_unit", None):
            ou = await EmployeeService._resolve_or_create_unit(db, current_user.assigned_unit, norm_dir)
            ou_id = ou.id

        emp = Employee(
            employee_id=emp_id,
            document_number_encrypted=encrypted_doc,
            document_hash=doc_hash,
            first_name=emp_in.first_name.strip(),
            last_name=emp_in.last_name.strip(),
            organizational_unit_id=ou_id,
            direction_name=norm_dir,
            position_id=pos_id,
            status=emp_in.status,
            hire_date=emp_in.hire_date,
            termination_date=emp_in.termination_date,
            created_by_user_id=current_user.id if current_user else None,
        )
        db.add(emp)
        await db.flush()

        # Vincular redes sociales para que interactúe de inmediato con publicaciones
        if emp_in.facebook_account:
            await EmployeeService._link_or_update_social_account(db, emp_id, "FACEBOOK", emp_in.facebook_account)
        if emp_in.tiktok_account:
            await EmployeeService._link_or_update_social_account(db, emp_id, "TIKTOK", emp_in.tiktok_account)

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
        await db.flush()
        await db.commit()
        loaded = await EmployeeService.get_employee_by_id(db, emp.employee_id)
        return loaded or emp

    @staticmethod
    def is_accessible_by_user(emp: Employee, current_user: User | None) -> bool:
        """Verifica si un funcionario pertenece al espacio de trabajo accesible por el usuario (REQ-EMP-005)."""
        if not current_user:
            return True
        user_roles = {r.name for r in current_user.roles}
        ws_type = getattr(current_user, "workspace_type", "UNIT") or "UNIT"
        is_superadmin = (
            UserRole.SUPER_ADMIN.value in user_roles or UserRole.AUDITOR.value in user_roles
        ) and (ws_type == "GLOBAL" or (not getattr(current_user, "assigned_direction", None) and not getattr(current_user, "assigned_unit", None)))

        if is_superadmin:
            return True

        if emp.created_by_user_id == current_user.id:
            return True

        user_unit = getattr(current_user, "assigned_unit", None)
        user_dir = getattr(current_user, "assigned_direction", None)

        if user_unit:
            u_clean = user_unit.strip().lower()
            if emp.organizational_unit and (emp.organizational_unit.name or "").strip().lower() == u_clean:
                return True
            return False

        if user_dir:
            dir_norm = re.sub(r'(?i)alcaldesa', 'Alcalde', user_dir.strip()).lower()
            emp_dir = (emp.direction_name or "").lower()
            parent_dir = ""
            if emp.organizational_unit and emp.organizational_unit.parent:
                parent_dir = (emp.organizational_unit.parent.name or "").lower()
            if emp_dir == dir_norm or parent_dir == dir_norm:
                return True
            return False

        return emp.created_by_user_id == current_user.id

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

        if current_user and not EmployeeService.is_accessible_by_user(emp, current_user):
            raise ValidationException("No cuenta con permisos para modificar funcionarios fuera de su espacio de trabajo.")

        cid = correlation_id or get_correlation_id()

        # Resolver unidad y cargo si se enviaron por nombre
        new_unit_id = emp_in.organizational_unit_id
        if not new_unit_id and emp_in.org_unit_name:
            ou = await EmployeeService._resolve_or_create_unit(db, emp_in.org_unit_name, emp_in.parent_unit_name)
            new_unit_id = ou.id

        new_pos_id = emp_in.position_id
        if not new_pos_id and emp_in.position_title:
            pos = await EmployeeService._resolve_or_create_position(db, emp_in.position_title)
            new_pos_id = pos.id

        target_status = emp_in.status
        if target_status is None and emp_in.is_active is not None:
            target_status = EmployeeStatus.ACTIVE.value if emp_in.is_active else EmployeeStatus.INACTIVE.value

        # Detectar si hay cambios organizacionales o de cargo/estado
        unit_changed = new_unit_id is not None and new_unit_id != emp.organizational_unit_id
        pos_changed = new_pos_id is not None and new_pos_id != emp.position_id
        status_changed = target_status is not None and target_status != emp.status

        prev_unit_id = emp.organizational_unit_id
        prev_pos_id = emp.position_id
        prev_status = emp.status

        # Aplicar actualizaciones
        if emp_in.first_name is not None:
            emp.first_name = emp_in.first_name.strip()
        if emp_in.last_name is not None:
            emp.last_name = emp_in.last_name.strip()

        doc_raw = emp_in.document_number or emp_in.id_document
        if doc_raw is not None and doc_raw.strip():
            emp.document_number_encrypted = encrypt_field(doc_raw.strip())
            emp.document_hash = hash_blind_index(doc_raw.strip())

        if emp_in.parent_unit_name is not None and emp_in.parent_unit_name.strip():
            emp.direction_name = re.sub(r'(?i)alcaldesa', 'Alcalde', emp_in.parent_unit_name.strip())
        if current_user and emp.created_by_user_id is None:
            emp.created_by_user_id = current_user.id

        if unit_changed:
            emp.organizational_unit_id = new_unit_id
        if pos_changed:
            emp.position_id = new_pos_id
        if status_changed and target_status:
            emp.status = target_status
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

        # Actualizar redes sociales si se enviaron
        if emp_in.facebook_account is not None:
            await EmployeeService._link_or_update_social_account(db, emp.employee_id, "FACEBOOK", emp_in.facebook_account)
        if emp_in.tiktok_account is not None:
            await EmployeeService._link_or_update_social_account(db, emp.employee_id, "TIKTOK", emp_in.tiktok_account)

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
        await db.flush()
        await db.commit()
        loaded = await EmployeeService.get_employee_by_id(db, emp.employee_id)
        return loaded or emp

    @staticmethod
    async def delete_employee(
        db: AsyncSession,
        employee_id: str,
        current_user: User,
        permanent: bool = False,
        reason: str | None = "Desvinculación institucional",
    ) -> None:
        """Elimina físicamente o da de baja lógica a un funcionario."""
        emp = await EmployeeService.get_employee_by_id(db, employee_id)
        if not emp:
            raise EntityNotFoundException("Employee", employee_id)

        if current_user and not EmployeeService.is_accessible_by_user(emp, current_user):
            raise ValidationException("No cuenta con permisos para eliminar funcionarios fuera de su espacio de trabajo.")

        cid = get_correlation_id()
        if permanent:
            stmt_acc = select(SocialAccount).where(SocialAccount.employee_id == employee_id)
            accounts = list((await db.execute(stmt_acc)).scalars().all())
            for sa in accounts:
                await db.delete(sa)
            for h in emp.history:
                await db.delete(h)
            await db.delete(emp)
            await record_audit_event(
                db=db,
                action=AuditAction.DELETE,
                entity_name="Employee",
                entity_id=employee_id,
                user_id=str(current_user.id),
                user_email=current_user.email,
                details={"operation": "PERMANENT_DELETE_EMPLOYEE", "reason": reason},
                correlation_id=cid,
            )
            await db.flush()
            await db.commit()
        else:
            await EmployeeService.deactivate_employee(db, employee_id, current_user, reason=reason)

    @staticmethod
    async def bulk_delete_employees(
        db: AsyncSession,
        employee_ids: list[str],
        current_user: User,
        permanent: bool = False,
        reason: str | None = "Eliminación administrativa en lote",
    ) -> dict:
        """
        Elimina o da de baja lógica a un lote de funcionarios.
        Soporta purga física definitiva o baja lógica institucional con auditoría.
        """
        clean_ids = [str(eid).strip() for eid in employee_ids if str(eid).strip()]
        if not clean_ids:
            return {
                "total_requested": 0,
                "deleted_count": 0,
                "failed_count": 0,
                "permanent": permanent,
                "errors": [],
                "detail": "No se proporcionaron identificadores de funcionarios.",
            }

        cid = get_correlation_id()
        stmt = (
            select(Employee)
            .where(Employee.employee_id.in_(clean_ids))
            .options(
                selectinload(Employee.history),
                selectinload(Employee.organizational_unit).selectinload(OrganizationalUnit.parent),
            )
        )
        found_employees = list((await db.execute(stmt)).scalars().all())

        allowed_employees: list[Employee] = []
        for emp in found_employees:
            if EmployeeService.is_accessible_by_user(emp, current_user):
                allowed_employees.append(emp)

        if not allowed_employees:
            return {
                "total_requested": len(clean_ids),
                "deleted_count": 0,
                "failed_count": len(clean_ids),
                "permanent": permanent,
                "errors": ["Ninguno de los funcionarios seleccionados fue encontrado o cuenta con permisos para gestionarlos."],
                "detail": "No se realizaron cambios en la base de datos.",
            }

        target_ids = [e.employee_id for e in allowed_employees]

        if permanent:
            try:
                from modules.verification.models import InteractionEvidence
                stmt_verif = select(InteractionEvidence).where(InteractionEvidence.employee_id.in_(target_ids))
                verifs = list((await db.execute(stmt_verif)).scalars().all())
                for v in verifs:
                    v.employee_id = None
            except Exception:
                pass

            stmt_acc = select(SocialAccount).where(SocialAccount.employee_id.in_(target_ids))
            accounts = list((await db.execute(stmt_acc)).scalars().all())
            for sa in accounts:
                await db.delete(sa)

            for emp in allowed_employees:
                for h in emp.history:
                    await db.delete(h)
                await db.delete(emp)

            await record_audit_event(
                db=db,
                action=AuditAction.DELETE,
                entity_name="Employee",
                entity_id=f"BULK_DELETE_{len(target_ids)}",
                user_id=str(current_user.id),
                user_email=current_user.email,
                details={
                    "operation": "BULK_PERMANENT_DELETE_EMPLOYEES",
                    "count": len(target_ids),
                    "employee_ids": target_ids,
                    "reason": reason,
                },
                correlation_id=cid,
            )
        else:
            for emp in allowed_employees:
                prev_status = emp.status
                emp.status = EmployeeStatus.TERMINATED.value
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
                entity_id=f"BULK_DEACTIVATE_{len(target_ids)}",
                user_id=str(current_user.id),
                user_email=current_user.email,
                details={
                    "operation": "BULK_DEACTIVATE_EMPLOYEES",
                    "count": len(target_ids),
                    "employee_ids": target_ids,
                    "reason": reason,
                },
                correlation_id=cid,
            )

        await db.flush()
        await db.commit()

        msg = (
            f"Se eliminaron permanentemente {len(target_ids)} funcionarios de la base de datos."
            if permanent
            else f"Se dieron de baja lógica {len(target_ids)} funcionarios correctamente."
        )

        return {
            "total_requested": len(clean_ids),
            "deleted_count": len(target_ids),
            "failed_count": len(clean_ids) - len(target_ids),
            "permanent": permanent,
            "errors": [],
            "detail": msg,
        }


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
        await db.flush()
        await db.commit()
        loaded = await EmployeeService.get_employee_by_id(db, emp.employee_id)
        return loaded or emp

    @staticmethod
    async def list_employees(
        db: AsyncSession,
        unit_id: uuid.UUID | None = None,
        direction: str | None = None,
        status: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 20,
        current_user: User | None = None,
    ) -> tuple[list[Employee], int]:
        """Consulta paginada con filtros organizacionales, búsqueda y aislamiento individual por usuario."""
        query = select(Employee)
        count_query = select(func.count()).select_from(Employee)

        # Aislamiento por espacio de trabajo (Workspaces & Tenancy Scoping - REQ-IAM-005, REQ-EMP-005)
        if current_user:
            user_roles = {r.name for r in current_user.roles}
            ws_type = getattr(current_user, "workspace_type", "UNIT") or "UNIT"
            is_superadmin = (
                UserRole.SUPER_ADMIN.value in user_roles or UserRole.AUDITOR.value in user_roles
            ) and (ws_type == "GLOBAL" or (not getattr(current_user, "assigned_direction", None) and not getattr(current_user, "assigned_unit", None)))

            if not is_superadmin:
                user_unit = getattr(current_user, "assigned_unit", None)
                user_dir = getattr(current_user, "assigned_direction", None)
                if user_unit:
                    u_norm = user_unit.strip().lower()
                    unit_filter = or_(
                        Employee.organizational_unit.has(func.lower(OrganizationalUnit.name) == u_norm),
                        Employee.created_by_user_id == current_user.id,
                    )
                    query = query.where(unit_filter)
                    count_query = count_query.where(unit_filter)
                elif user_dir:
                    dir_norm = re.sub(r'(?i)alcaldesa', 'Alcalde', user_dir.strip())
                    dir_filter = or_(
                        func.lower(Employee.direction_name) == dir_norm.lower(),
                        Employee.organizational_unit.has(
                            OrganizationalUnit.parent.has(func.lower(OrganizationalUnit.name) == dir_norm.lower())
                        ),
                        Employee.created_by_user_id == current_user.id,
                    )
                    query = query.where(dir_filter)
                    count_query = count_query.where(dir_filter)
                else:
                    # Usuario individual sin dirección asignada: panel 100% individual y vacío para nuevas cuentas
                    indiv_filter = (Employee.created_by_user_id == current_user.id)
                    query = query.where(indiv_filter)
                    count_query = count_query.where(indiv_filter)

        if direction and direction.strip():
            clean_dir = re.sub(r'(?i)alcaldesa', 'Alcalde', direction.strip())
            dir_cond = or_(
                func.lower(Employee.direction_name) == clean_dir.lower(),
                Employee.organizational_unit.has(
                    OrganizationalUnit.parent.has(func.lower(OrganizationalUnit.name) == clean_dir.lower())
                ),
            )
            query = query.where(dir_cond)
            count_query = count_query.where(dir_cond)

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
                selectinload(Employee.organizational_unit).selectinload(OrganizationalUnit.parent),
                selectinload(Employee.position),
            )
        )
        employees = list((await db.execute(query)).scalars().all())

        if employees:
            emp_ids = [e.employee_id for e in employees]
            stmt_acc = (
                select(SocialAccount)
                .where(SocialAccount.employee_id.in_(emp_ids))
                .options(selectinload(SocialAccount.platform))
            )
            accounts = list((await db.execute(stmt_acc)).scalars().all())
            acc_by_emp: dict[str, list[SocialAccount]] = {}
            for acc in accounts:
                acc_by_emp.setdefault(acc.employee_id, []).append(acc)
            for e in employees:
                e.social_accounts = acc_by_emp.get(e.employee_id, [])

        return employees, total
