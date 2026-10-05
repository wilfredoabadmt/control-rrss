"""
Importador Idempotente de Nómina de Funcionarios — GAMEA Social Monitor
Principio VIII: Fuente Maestra de Recursos Humanos
Principio IX: Modelo de Datos Normalizado
"""

import io
import re
import uuid

import pandas as pd
from core.audit.service import record_audit_event
from core.logging_config import get_correlation_id
from core.security.encryption import decrypt_field, encrypt_field, hash_blind_index
from modules.employees.models import Employee, EmployeeHistory, OrganizationalUnit, Position
from modules.employees.schemas import EmployeeImportReport
from modules.iam.models import User
from modules.shared.enums import AuditAction, BindingStatus, EmployeeStatus
from modules.social_accounts.models import SocialAccount, SocialPlatform
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
            "nombres_y_apellidos": "full_name",
            "apellidos": "last_name",
            "apellido": "last_name",
            "unidad": "org_unit_code",
            "unidad_organizacional": "org_unit_code",
            "secretaria": "org_unit_code",
            "direccion": "parent_unit_name",
            "cargo": "position_title",
            "puesto": "position_title",
            "estado": "status",
            "cuenta_facebook": "facebook_account",
            "cuenta_de_facebook": "facebook_account",
            "facebook": "facebook_account",
            "cuenta_tiktok": "tiktok_account",
            "cuenta_de_tik_tok": "tiktok_account",
            "cuenta_de_tiktok": "tiktok_account",
            "tiktok": "tiktok_account",
            "tik_tok": "tiktok_account",
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

        # Si se recibió "full_name" (nombres_y_apellidos) sin first_name/last_name separados, dividir
        if "full_name" in df.columns and "first_name" not in df.columns:
            df[["first_name", "last_name"]] = df["full_name"].str.split(" ", n=1, expand=True)
            df["last_name"] = df["last_name"].fillna("")

        # Plantilla simplificada: si no hay employee_id ni document_number, generarlos automáticamente
        is_simplified_template = "employee_id" not in df.columns and "document_number" not in df.columns
        if is_simplified_template:
            # Auto-generar IDs para la plantilla simplificada de funcionarios
            df["employee_id"] = [f"EMP-{i+1:04d}" for i in range(len(df))]
            df["document_number"] = [f"AUTO-{i+1:06d}" for i in range(len(df))]

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
        units_by_code: dict[str, OrganizationalUnit] = {u.code.strip().upper(): u for u in all_units}
        units_by_name: dict[str, OrganizationalUnit] = {u.name.strip().upper(): u for u in all_units}
        for u in all_units:
            units_by_name[u.name.strip().lower()] = u

        # Cargar plataformas sociales para vincular cuentas de Facebook y TikTok
        stmt_platforms = select(SocialPlatform)
        all_platforms = list((await db.execute(stmt_platforms)).scalars().all())
        platforms_by_name: dict[str, SocialPlatform] = {p.name.upper(): p for p in all_platforms}

        has_social_cols = "facebook_account" in df.columns or "tiktok_account" in df.columns

        stmt_pos = select(Position)
        all_positions = list((await db.execute(stmt_pos)).scalars().all())
        positions_by_title: dict[str, Position] = {p.title.strip().upper(): p for p in all_positions}
        for p in all_positions:
            positions_by_title[p.title.strip().lower()] = p

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
            raw_parent_unit = str(row.get("parent_unit_name", "")).strip().upper()
            raw_pos = str(row.get("position_title", "")).strip().upper()
            raw_status = str(row.get("status", EmployeeStatus.ACTIVE.value)).strip().upper() or EmployeeStatus.ACTIVE.value
            raw_facebook = str(row.get("facebook_account", "")).strip()
            raw_tiktok = str(row.get("tiktok_account", "")).strip()

            if not emp_id or not doc_num or not first_name or not last_name:
                errors.append(f"Fila {row_num}: Datos obligatorios incompletos.")
                continue

            # Resolver o crear la Dirección padre si se proporcionó
            parent_unit: OrganizationalUnit | None = None
            if raw_parent_unit:
                parent_unit = (
                    units_by_code.get(raw_parent_unit)
                    or units_by_name.get(raw_parent_unit)
                    or units_by_name.get(raw_parent_unit.lower())
                )
                if not parent_unit:
                    code_cand = re.sub(r"[^A-Za-z0-9]", "", raw_parent_unit)[:8].upper() or "DIR"
                    parent_code = f"{code_cand}-{uuid.uuid4().hex[:6].upper()}"
                    parent_unit = OrganizationalUnit(
                        name=raw_parent_unit.title(),
                        code=parent_code,
                        status="ACTIVE",
                    )
                    db.add(parent_unit)
                    await db.flush()  # Ensure parent_unit gets an ID
                    units_by_code[parent_code.upper()] = parent_unit
                    units_by_name[raw_parent_unit] = parent_unit
                    units_by_name[raw_parent_unit.lower()] = parent_unit
                    units_by_name[parent_unit.name.upper()] = parent_unit
                    units_by_name[parent_unit.name.lower()] = parent_unit

            # Resolver o crear Unidad Organizacional si no existe
            target_unit: OrganizationalUnit | None = None
            if raw_unit:
                target_unit = (
                    units_by_code.get(raw_unit)
                    or units_by_name.get(raw_unit)
                    or units_by_name.get(raw_unit.lower())
                )
                if not target_unit:
                    code_cand = re.sub(r"[^A-Za-z0-9]", "", raw_unit)[:8].upper() or "UND"
                    unit_code = f"{code_cand}-{uuid.uuid4().hex[:6].upper()}"
                    target_unit = OrganizationalUnit(
                        name=raw_unit.title(),
                        code=unit_code,
                        status="ACTIVE",
                        parent_id=parent_unit.id if parent_unit else None,
                    )
                    db.add(target_unit)
                    await db.flush()
                    units_by_code[unit_code.upper()] = target_unit
                    units_by_name[raw_unit] = target_unit
                    units_by_name[raw_unit.lower()] = target_unit
                    units_by_name[target_unit.name.upper()] = target_unit
                    units_by_name[target_unit.name.lower()] = target_unit
                elif parent_unit and target_unit.parent_id is None:
                    # Vincular unidad existente a su dirección padre si no estaba asignada
                    target_unit.parent_id = parent_unit.id

            # Resolver o crear Cargo si no existe
            target_pos: Position | None = None
            if raw_pos:
                target_pos = (
                    positions_by_title.get(raw_pos)
                    or positions_by_title.get(raw_pos.lower())
                )
                if not target_pos:
                    target_pos = Position(
                        title=raw_pos.title(),
                        status="ACTIVE",
                    )
                    db.add(target_pos)
                    await db.flush()
                    positions_by_title[raw_pos] = target_pos
                    positions_by_title[raw_pos.lower()] = target_pos
                    positions_by_title[target_pos.title.upper()] = target_pos
                    positions_by_title[target_pos.title.lower()] = target_pos

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

            # Vincular cuentas sociales (Facebook / TikTok) si se proporcionaron
            if has_social_cols:
                current_emp_id = emp_id
                await cls._link_social_account(
                    db, current_emp_id, "FACEBOOK", raw_facebook,
                    platforms_by_name,
                )
                await cls._link_social_account(
                    db, current_emp_id, "TIKTOK", raw_tiktok,
                    platforms_by_name,
                )

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

        await db.commit()

        return EmployeeImportReport(
            total_records=len(df),
            created_count=created_count,
            updated_count=updated_count,
            unchanged_count=unchanged_count,
            deactivated_count=deactivated_count,
            errors=errors,
            correlation_id=correlation_id,
        )

    @staticmethod
    async def _link_social_account(
        db: AsyncSession,
        employee_id: str,
        platform_name: str,
        account_value: str,
        platforms_by_name: dict[str, SocialPlatform],
    ) -> None:
        """Vincula o actualiza una cuenta social para un funcionario importado."""
        if not account_value:
            return

        platform = platforms_by_name.get(platform_name.upper())
        if not platform:
            # Crear la plataforma si no existe en el catálogo
            platform = SocialPlatform(
                name=platform_name.upper(),
                display_name=platform_name.title(),
                is_active=True,
                api_version="v1.0",
            )
            db.add(platform)
            await db.flush()
            platforms_by_name[platform.name.upper()] = platform

        # Verificar si ya existe una cuenta para este funcionario en esta plataforma
        stmt = select(SocialAccount).where(
            SocialAccount.employee_id == employee_id,
            SocialAccount.platform_id == platform.id,
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()

        # Normalizar username: extraer handle de URL o texto directo
        username = account_value.strip()
        if "/" in username:
            # Extraer la última parte de una URL tipo facebook.com/usuario
            username = username.rstrip("/").split("/")[-1]
        username = username.lstrip("@")

        if existing:
            if existing.current_username != username:
                existing.current_username = username
                if "facebook.com" in account_value or "fb.com" in account_value or "tiktok.com" in account_value:
                    existing.profile_url = account_value if account_value.startswith("http") else f"https://{account_value}"
        else:
            # Construir URL de perfil
            profile_url = None
            if platform_name.upper() == "FACEBOOK":
                profile_url = f"https://facebook.com/{username}"
            elif platform_name.upper() == "TIKTOK":
                profile_url = f"https://tiktok.com/@{username}"

            new_account = SocialAccount(
                employee_id=employee_id,
                platform_id=platform.id,
                current_username=username,
                profile_url=profile_url,
                binding_status=BindingStatus.ACTIVE.value,
            )
            db.add(new_account)
