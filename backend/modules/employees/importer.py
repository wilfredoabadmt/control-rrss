"""
Importador Idempotente de Nómina de Funcionarios — GAMEA Social Monitor
Principio VIII: Fuente Maestra de Recursos Humanos
Principio IX: Modelo de Datos Normalizado
"""

import io

import pandas as pd
from core.audit.service import record_audit_event
from core.logging_config import get_correlation_id
from core.security.encryption import decrypt_field, encrypt_field, hash_blind_index
from modules.employees.models import Employee, EmployeeHistory, OrganizationalUnit, Position
from modules.employees.schemas import EmployeeImportReport
from modules.iam.models import User
from modules.shared.enums import AuditAction, EmployeeStatus
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class EmployeePayrollImporter:

    @staticmethod
    def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
        """Mapea encabezados comunes en archivos de nómina a campos estándar."""
        mapping = {
            "id": "employee_id",
            "codigo": "employee_id",
            "item": "employee_id",
            "matricula": "employee_id",
            "ci": "document_number",
            "cedula": "document_number",
            "documento": "document_number",
            "nombres": "first_name",
            "nombre": "first_name",
            "apellidos": "last_name",
            "apellido": "last_name",
            "unidad": "org_unit_code",
            "unidad_organizacional": "org_unit_code",
            "secretaria": "org_unit_code",
            "direccion": "org_unit_code",
            "cargo": "position_title",
            "puesto": "position_title",
            "estado": "status",
        }
        renamed = {}
        for col in df.columns:
            clean_col = str(col).lower().strip().replace(" ", "_")
            renamed[col] = mapping.get(clean_col, clean_col)
        return df.rename(columns=renamed)

    @classmethod
    async def import_payroll_file(
        cls,
        db: AsyncSession,
        file_content: bytes,
        filename: str,
        current_user: User,
    ) -> EmployeeImportReport:
        """
        Procesa e importa un archivo Excel (.xlsx) o CSV de forma estrictamente idempotente.
        """
        correlation_id = get_correlation_id()

        # 1. Cargar archivo con pandas
        try:
            if filename.lower().endswith(".csv"):
                df = pd.read_csv(io.BytesIO(file_content), dtype=str, keep_default_na=False)
            else:
                df = pd.read_excel(io.BytesIO(file_content), dtype=str, keep_default_na=False)
        except Exception as e:
            return EmployeeImportReport(
                total_records=0,
                created_count=0,
                updated_count=0,
                unchanged_count=0,
                deactivated_count=0,
                errors=[f"Error al leer el archivo: {str(e)}"],
                correlation_id=correlation_id,
            )

        df = cls._normalize_columns(df)

        required_cols = ["employee_id", "first_name", "last_name", "document_number"]
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            return EmployeeImportReport(
                total_records=len(df),
                created_count=0,
                updated_count=0,
                unchanged_count=0,
                deactivated_count=0,
                errors=[f"Faltan columnas requeridas en el archivo: {', '.join(missing)}"],
                correlation_id=correlation_id,
            )

        # 2. Cargar catálogos de Unidades y Cargos existentes
        stmt_units = select(OrganizationalUnit)
        all_units = list((await db.execute(stmt_units)).scalars().all())
        units_by_code: dict[str, OrganizationalUnit] = {u.code.upper(): u for u in all_units}
        units_by_name: dict[str, OrganizationalUnit] = {u.name.upper(): u for u in all_units}

        stmt_pos = select(Position)
        all_positions = list((await db.execute(stmt_pos)).scalars().all())
        positions_by_title: dict[str, Position] = {p.title.upper(): p for p in all_positions}

        # 3. Procesar cada registro
        created_count = 0
        updated_count = 0
        unchanged_count = 0
        deactivated_count = 0
        errors: list[str] = []

        for index, row in df.iterrows():
            row_num = int(index) + 2  # 1-indexed + header
            emp_id = str(row.get("employee_id", "")).strip()
            doc_num = str(row.get("document_number", "")).strip()
            first_name = str(row.get("first_name", "")).strip()
            last_name = str(row.get("last_name", "")).strip()
            raw_unit = str(row.get("org_unit_code", "")).strip().upper()
            raw_pos = str(row.get("position_title", "")).strip().upper()
            raw_status = str(row.get("status", EmployeeStatus.ACTIVE.value)).strip().upper() or EmployeeStatus.ACTIVE.value

            if not emp_id or not doc_num or not first_name or not last_name:
                errors.append(f"Fila {row_num}: Datos obligatorios incompletos.")
                continue

            # Resolver o crear Unidad Organizacional si no existe
            target_unit: OrganizationalUnit | None = None
            if raw_unit:
                target_unit = units_by_code.get(raw_unit) or units_by_name.get(raw_unit)
                if not target_unit:
                    target_unit = OrganizationalUnit(
                        name=raw_unit.title(),
                        code=raw_unit[:20],
                        status="ACTIVE",
                    )
                    db.add(target_unit)
                    units_by_code[target_unit.code.upper()] = target_unit
                    units_by_name[target_unit.name.upper()] = target_unit

            # Resolver o crear Cargo si no existe
            target_pos: Position | None = None
            if raw_pos:
                target_pos = positions_by_title.get(raw_pos)
                if not target_pos:
                    target_pos = Position(
                        title=raw_pos.title(),
                        status="ACTIVE",
                    )
                    db.add(target_pos)
                    positions_by_title[target_pos.title.upper()] = target_pos

            # Buscar funcionario existente por employee_id
            stmt_emp = select(Employee).where(Employee.employee_id == emp_id)
            existing_emp = (await db.execute(stmt_emp)).scalar_one_or_none()

            if not existing_emp:
                # ALTA: Nuevo funcionario
                new_emp = Employee(
                    employee_id=emp_id,
                    document_number_encrypted=encrypt_field(doc_num),
                    document_hash=hash_blind_index(doc_num),
                    first_name=first_name,
                    last_name=last_name,
                    organizational_unit_id=target_unit.id if target_unit else None,
                    position_id=target_pos.id if target_pos else None,
                    status=raw_status,
                )
                db.add(new_emp)
                created_count += 1
            else:
                # MODIFICACIÓN / IDEMPOTENCIA
                prev_unit_id = existing_emp.organizational_unit_id
                prev_pos_id = existing_emp.position_id
                prev_status = existing_emp.status

                new_unit_id = target_unit.id if target_unit else None
                new_pos_id = target_pos.id if target_pos else None

                unit_changed = new_unit_id is not None and new_unit_id != prev_unit_id
                pos_changed = new_pos_id is not None and new_pos_id != prev_pos_id
                status_changed = raw_status != prev_status
                name_changed = (first_name != existing_emp.first_name) or (last_name != existing_emp.last_name)

                # Verificar si el documento cambió
                current_doc = decrypt_field(existing_emp.document_number_encrypted)
                doc_changed = doc_num != current_doc

                if unit_changed or pos_changed or status_changed or name_changed or doc_changed:
                    existing_emp.first_name = first_name
                    existing_emp.last_name = last_name
                    if doc_changed:
                        existing_emp.document_number_encrypted = encrypt_field(doc_num)
                        existing_emp.document_hash = hash_blind_index(doc_num)
                    if new_unit_id:
                        existing_emp.organizational_unit_id = new_unit_id
                    if new_pos_id:
                        existing_emp.position_id = new_pos_id
                    existing_emp.status = raw_status

                    # Registrar cambio organizacional
                    if unit_changed or pos_changed or status_changed:
                        history_entry = EmployeeHistory(
                            employee_id=existing_emp.employee_id,
                            previous_organizational_unit_id=prev_unit_id,
                            new_organizational_unit_id=existing_emp.organizational_unit_id,
                            previous_position_id=prev_pos_id,
                            new_position_id=existing_emp.position_id,
                            previous_status=prev_status,
                            new_status=existing_emp.status,
                            change_reason=f"Sincronización de nómina: {filename}",
                            recorded_by_user_id=str(current_user.id),
                            correlation_id=correlation_id,
                        )
                        db.add(history_entry)

                    if raw_status in (EmployeeStatus.TERMINATED.value, EmployeeStatus.INACTIVE.value) and prev_status == EmployeeStatus.ACTIVE.value:
                        deactivated_count += 1
                    else:
                        updated_count += 1
                else:
                    unchanged_count += 1

        # Registrar auditoría del lote completo (Principio X y VIII)
        await record_audit_event(
            db=db,
            action=AuditAction.EXECUTE,
            entity_name="EmployeeImportBatch",
            entity_id=filename,
            user_id=str(current_user.id),
            user_email=current_user.email,
            details={
                "filename": filename,
                "total_records": len(df),
                "created": created_count,
                "updated": updated_count,
                "unchanged": unchanged_count,
                "deactivated": deactivated_count,
                "error_count": len(errors),
            },
            correlation_id=correlation_id,
        )

        return EmployeeImportReport(
            total_records=len(df),
            created_count=created_count,
            updated_count=updated_count,
            unchanged_count=unchanged_count,
            deactivated_count=deactivated_count,
            errors=errors,
            correlation_id=correlation_id,
        )
