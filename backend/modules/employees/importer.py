"""
Importador Idempotente de Nómina de Funcionarios — GAMEA Social Monitor
Principio VIII: Fuente Maestra de Recursos Humanos
Principio IX: Modelo de Datos Normalizado
"""

import hashlib
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
from modules.shared.enums import AuditAction, BindingStatus, EmployeeStatus, UserRole
from modules.social_accounts.models import SocialAccount, SocialPlatform
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class EmployeePayrollImporter:

    @staticmethod
    def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
        """Mapea encabezados comunes en archivos de nómina a campos estándar con eliminación de acentos."""
        import unicodedata

        mapping = {
            "id": "employee_id",
            "codigo": "employee_id",
            "cod": "employee_id",
            "item": "employee_id",
            "nro_item": "employee_id",
            "matricula": "employee_id",
            "employee_id": "employee_id",

            "ci": "document_number",
            "cedula": "document_number",
            "cedula_de_identidad": "document_number",
            "carnet": "document_number",
            "carnet_de_identidad": "document_number",
            "documento": "document_number",
            "nro_documento": "document_number",
            "document_number": "document_number",

            "nombres": "first_name",
            "nombre": "first_name",
            "primer_nombre": "first_name",
            "first_name": "first_name",

            "apellidos": "last_name",
            "apellido": "last_name",
            "primer_apellido": "last_name",
            "segundo_apellido": "last_name",
            "last_name": "last_name",

            "nombres_y_apellidos": "full_name",
            "nombre_y_apellido": "full_name",
            "nombre_completo": "full_name",
            "funcionario": "full_name",
            "servidor": "full_name",
            "servidor_publico": "full_name",
            "full_name": "full_name",

            "unidad": "org_unit_code",
            "unidad_organizacional": "org_unit_code",
            "secretaria": "org_unit_code",
            "area": "org_unit_code",
            "departamento": "org_unit_code",
            "division": "org_unit_code",
            "unidad_municipal": "org_unit_code",
            "org_unit_code": "org_unit_code",

            "direccion": "parent_unit_name",
            "direccion_general": "parent_unit_name",
            "direccion_administrativa": "parent_unit_name",
            "secretaria_municipal": "parent_unit_name",
            "dependencia": "parent_unit_name",
            "parent_unit_name": "parent_unit_name",

            "cargo": "position_title",
            "puesto": "position_title",
            "posicion": "position_title",
            "denominacion": "position_title",
            "position_title": "position_title",

            "estado": "status",
            "status": "status",

            "cuenta_facebook": "facebook_account",
            "cuenta_de_facebook": "facebook_account",
            "facebook": "facebook_account",
            "fb": "facebook_account",
            "perfil_facebook": "facebook_account",
            "facebook_account": "facebook_account",

            "cuenta_tiktok": "tiktok_account",
            "cuenta_de_tik_tok": "tiktok_account",
            "cuenta_de_tiktok": "tiktok_account",
            "tiktok": "tiktok_account",
            "tik_tok": "tiktok_account",
            "tk": "tiktok_account",
            "tt": "tiktok_account",
            "perfil_tiktok": "tiktok_account",
            "tiktok_account": "tiktok_account",

            "correo": "email",
            "email": "email",
            "correo_electronico": "email",
        }
        renamed = {}
        for col in df.columns:
            raw_str = str(col)
            norm_str = unicodedata.normalize("NFKD", raw_str).encode("ASCII", "ignore").decode("utf-8")
            clean_col = re.sub(r"[^a-z0-9_]", "", norm_str.lower().strip().replace(" ", "_"))
            if clean_col in mapping:
                renamed[col] = mapping[clean_col]
            else:
                renamed[col] = clean_col
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
        Soporta múltiples delimitadores (, ; \t) y codificaciones (UTF-8, UTF-8 con BOM, Latin-1, CP1252).
        """
        correlation_id = get_correlation_id()

        # 1. Cargar archivo con pandas de forma tolerante a formatos, codificaciones y delimitadores
        df = None
        try:
            # Detección de binario Excel (.xlsx / OpenXML empieza con PK\x03\x04 o PK\x05\x06; .xls empieza con \xd0\xcf\x11\xe0)
            is_excel_binary = (
                file_content.startswith(b"PK\x03\x04")
                or file_content.startswith(b"PK\x05\x06")
                or file_content.startswith(b"\xd0\xcf\x11\xe0")
            )
            is_excel_ext = filename.lower().endswith((".xlsx", ".xls", ".xlsm"))

            if is_excel_binary or is_excel_ext:
                try:
                    df = pd.read_excel(io.BytesIO(file_content), dtype=str, keep_default_na=False)
                except Exception:
                    df = None

            if df is None:
                # Intentar leer como texto / CSV
                import csv
                for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252", "iso-8859-1"):
                    try:
                        text = file_content.decode(enc)
                        sep = ','
                        first_line = text.splitlines()[0].lower() if text.splitlines() else ""
                        if ';' in first_line and ('nombres;' in first_line or ';apellidos' in first_line or first_line.count(';') >= 2):
                            sep = ';'
                        elif '\t' in first_line and ('nombres\t' in first_line or '\tapellidos' in first_line or first_line.count('\t') >= 2):
                            sep = '\t'
                            
                        lines = text.splitlines()
                        reader = csv.reader(lines, delimiter=sep)
                        parsed_data = list(reader)
                        
                        if len(parsed_data) > 0 and len(parsed_data[0]) > 0:
                            # Igualar longitud de todas las filas para evitar errores en DataFrame
                            max_cols = max(len(row) for row in parsed_data)
                            for row in parsed_data:
                                while len(row) < max_cols:
                                    row.append("")
                            
                            headers = parsed_data[0]
                            data_rows = parsed_data[1:]
                            temp_df = pd.DataFrame(data_rows, columns=headers, dtype=str)
                            normalized_temp = cls._normalize_columns(temp_df.copy())
                            if "first_name" in normalized_temp.columns or "full_name" in normalized_temp.columns:
                                df = temp_df
                                break
                            elif df is None:
                                df = temp_df
                    except Exception:
                        continue

            if df is None:
                # Fallback final a read_excel o read_csv de pandas
                try:
                    df = pd.read_excel(io.BytesIO(file_content), dtype=str, keep_default_na=False)
                except Exception:
                    df = pd.read_csv(io.BytesIO(file_content), dtype=str, keep_default_na=False, encoding="latin-1")
        except Exception as e:
            err_msg = str(e)
            if "tokenizing data" in err_msg or "Expected" in err_msg:
                err_msg = "El formato de las columnas es irregular. Por favor, asegúrate de guardar el archivo usando la plantilla Excel (.xlsx) o CSV estándar."
            return EmployeeImportReport(
                total_records=0,
                created_count=0,
                updated_count=0,
                unchanged_count=0,
                deactivated_count=0,
                errors=[f"Error al leer el archivo: {err_msg}"],
                correlation_id=correlation_id,
            )


        df = cls._normalize_columns(df)
        
        # Eliminar filas completamente vacías o donde todos los valores sean strings vacíos
        df.replace("", pd.NA, inplace=True)
        df.dropna(how="all", inplace=True)
        df.fillna("", inplace=True)

        # Si se recibió "full_name" sin first_name ni last_name separados
        if "full_name" in df.columns:
            if "first_name" not in df.columns and "last_name" not in df.columns:
                split_fn = df["full_name"].astype(str).str.strip().str.split(" ", n=1, expand=True)
                df["first_name"] = split_fn[0]
                df["last_name"] = split_fn[1].fillna("") if split_fn.shape[1] > 1 else ""
            elif "first_name" not in df.columns:
                df["first_name"] = df["full_name"]

        # Si falta first_name pero hay last_name
        if "first_name" not in df.columns and "last_name" in df.columns:
            df["first_name"] = df["last_name"]
            df["last_name"] = ""

        # Si falta last_name
        if "last_name" not in df.columns:
            df["last_name"] = ""

        # Auto-generar document_number y employee_id si faltan o vienen vacíos de forma determinista
        if "first_name" not in df.columns:
            return EmployeeImportReport(
                total_records=len(df),
                created_count=0,
                updated_count=0,
                unchanged_count=0,
                deactivated_count=0,
                errors=["No se encontró columna de nombres en el archivo (ej: nombres, nombre, funcionario)."],
                correlation_id=correlation_id,
            )

        # Determinar alcance y prefijo de aislamiento de Espacio de Trabajo (REQ-EMP-005, BR-EMP-012, BR-EMP-013)
        from modules.employees.service import EmployeeService
        is_superadmin = EmployeeService.is_global_superadmin(current_user)
        ws_type = (getattr(current_user, "workspace_type", "UNIT") or "UNIT").upper().strip() if current_user else "GLOBAL"
        user_unit = getattr(current_user, "assigned_unit", None) if current_user else None
        user_dir = getattr(current_user, "assigned_direction", None) if current_user else None

        unit_slug = ""
        if user_unit:
            unit_slug = re.sub(r"[^A-Za-z0-9]", "", user_unit)[:6].upper()
        elif user_dir:
            unit_slug = re.sub(r"[^A-Za-z0-9]", "", user_dir)[:6].upper()
        elif current_user:
            unit_slug = str(current_user.id)[:6].upper()

        if "document_number" not in df.columns:
            df["document_number"] = ""
        if "employee_id" not in df.columns:
            df["employee_id"] = ""
        if "last_name" not in df.columns:
            df["last_name"] = ""

        prefix_tag = f"-{unit_slug}" if unit_slug else ""
        for i in range(len(df)):
            first_name = str(df.at[i, "first_name"]).strip()
            last_name = str(df.at[i, "last_name"]).strip()
            name_seed = f"{unit_slug}_{first_name.lower()}_{last_name.lower()}".strip("_") or f"row_{i+1}"
            name_hash = hashlib.sha256(name_seed.encode("utf-8")).hexdigest()[:8].upper()

            # document_number
            doc_val = str(df.at[i, "document_number"]).strip()
            if not doc_val:
                doc_val = f"AUTO{prefix_tag}-{name_hash}"
                df.at[i, "document_number"] = doc_val

            # employee_id
            emp_val = str(df.at[i, "employee_id"]).strip()
            if not emp_val:
                if doc_val and not doc_val.startswith("AUTO"):
                    df.at[i, "employee_id"] = f"EMP-{doc_val}"
                else:
                    df.at[i, "employee_id"] = f"EMP{prefix_tag}-{name_hash}"
            else:
                df.at[i, "employee_id"] = emp_val

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
            raw_unit = re.sub(r'(?i)alcaldesa', 'Alcalde', str(row.get("org_unit_code", "")).strip().upper())
            raw_parent_unit = re.sub(r'(?i)alcaldesa', 'Alcalde', str(row.get("parent_unit_name", "")).strip().upper())
            raw_pos = str(row.get("position_title", "")).strip().upper()
            raw_status = str(row.get("status", EmployeeStatus.ACTIVE.value)).strip().upper() or EmployeeStatus.ACTIVE.value
            raw_facebook = str(row.get("facebook_account", "")).strip()
            raw_tiktok = str(row.get("tiktok_account", "")).strip()

            if not first_name:
                errors.append(f"Fila {row_num}: El nombre del funcionario es obligatorio.")
                continue

            if not emp_id or not doc_num:
                name_seed = f"{first_name.lower()}_{last_name.lower()}".strip("_") or f"row_{row_num}"
                name_hash = hashlib.sha256(name_seed.encode("utf-8")).hexdigest()[:8].upper()
                if not doc_num:
                    doc_num = f"AUTO-{name_hash}"
                if not emp_id:
                    emp_id = f"EMP-{name_hash}"

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
                elif parent_unit and target_unit.parent_id != parent_unit.id:
                    # Vincular unidad existente a su dirección padre si cambió o no estaba asignada
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

            # Buscar funcionario existente por:
            # 1. employee_id exacto
            stmt_emp = (
                select(Employee)
                .where(Employee.employee_id == emp_id)
                .options(selectinload(Employee.organizational_unit).selectinload(OrganizationalUnit.parent))
            )
            existing_emp = (await db.execute(stmt_emp)).scalar_one_or_none()

            # 2. Si no se encontró por employee_id y tenemos un documento real (no AUTO):
            if not existing_emp and doc_num and not doc_num.startswith("AUTO"):
                doc_hash = hash_blind_index(doc_num)
                stmt_doc = (
                    select(Employee)
                    .where(Employee.document_hash == doc_hash)
                    .options(selectinload(Employee.organizational_unit).selectinload(OrganizationalUnit.parent))
                )
                existing_emp = (await db.execute(stmt_doc)).scalar_one_or_none()

            # Protección de aislamiento (REQ-EMP-005, BR-EMP-012):
            # Si se encontró un registro pero pertenece a OTRO espacio de trabajo, NO sobreescribirlo ni trasladarlo
            from modules.employees.service import EmployeeService
            if existing_emp and not is_superadmin and not EmployeeService.is_accessible_by_user(existing_emp, current_user):
                existing_emp = None
                # Evitar colisión de PK en este lote
                emp_id = f"{emp_id}-{unit_slug}" if unit_slug and not emp_id.endswith(unit_slug) else f"{emp_id}-R{row_num}"

            # 3. Si sigue sin encontrarse, buscar por coincidencia de nombre (confinado al workspace del usuario)
            if not existing_emp and first_name:
                stmt_name = (
                    select(Employee)
                    .options(selectinload(Employee.organizational_unit).selectinload(OrganizationalUnit.parent))
                )
                if last_name:
                    stmt_name = stmt_name.where(
                        func.lower(Employee.first_name) == first_name.lower(),
                        func.lower(Employee.last_name) == last_name.lower(),
                    )
                else:
                    stmt_name = stmt_name.where(
                        func.lower(Employee.first_name) == first_name.lower(),
                    )

                if not is_superadmin and current_user:
                    if ws_type == "AUTONOMOUS" or (not user_unit and not user_dir):
                        stmt_name = stmt_name.where(Employee.created_by_user_id == current_user.id)
                    elif user_unit:
                        stmt_name = stmt_name.where(
                            or_(
                                Employee.organizational_unit.has(func.lower(OrganizationalUnit.name) == user_unit.strip().lower()),
                                Employee.created_by_user_id == current_user.id,
                            )
                        )
                    elif user_dir:
                        dir_norm_clean = re.sub(r'(?i)alcaldesa', 'Alcalde', user_dir.strip()).lower()
                        stmt_name = stmt_name.where(
                            or_(
                                func.lower(Employee.direction_name) == dir_norm_clean,
                                Employee.created_by_user_id == current_user.id,
                            )
                        )

                existing_emp = (await db.execute(stmt_name)).scalars().first()

            dir_for_emp = parent_unit.name if parent_unit else (raw_parent_unit.title() if raw_parent_unit else None)
            if not is_superadmin and current_user:
                if user_dir and not dir_for_emp:
                    dir_for_emp = user_dir
                if user_unit and not target_unit:
                    target_unit = (
                        units_by_name.get(user_unit)
                        or units_by_name.get(user_unit.upper())
                        or units_by_name.get(user_unit.lower())
                        or units_by_code.get(user_unit.upper())
                    )
                    if not target_unit:
                        code_cand = re.sub(r"[^A-Za-z0-9]", "", user_unit)[:8].upper() or "UND"
                        unit_code = f"OU-{code_cand}-{uuid.uuid4().hex[:6].upper()}"
                        target_unit = OrganizationalUnit(
                            name=user_unit.strip(),
                            code=unit_code,
                            parent_id=parent_unit.id if parent_unit else None,
                            status="ACTIVE",
                        )
                        db.add(target_unit)
                        await db.flush()
                        units_by_name[user_unit] = target_unit
                        units_by_name[user_unit.upper()] = target_unit
                        units_by_name[user_unit.lower()] = target_unit
                        units_by_code[unit_code.upper()] = target_unit

            if not existing_emp:
                # ALTA: Nuevo funcionario
                new_emp = Employee(
                    employee_id=emp_id,
                    document_number_encrypted=encrypt_field(doc_num),
                    document_hash=hash_blind_index(doc_num),
                    first_name=first_name,
                    last_name=last_name,
                    organizational_unit_id=target_unit.id if target_unit else None,
                    direction_name=dir_for_emp,
                    position_id=target_pos.id if target_pos else None,
                    status=raw_status,
                    created_by_user_id=current_user.id if current_user else None,
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

                # Verificar si el documento cambió (no sobreescribir documento real con AUTO generado)
                current_doc = decrypt_field(existing_emp.document_number_encrypted)
                doc_changed = doc_num != current_doc and not doc_num.startswith("AUTO-")

                if unit_changed or pos_changed or status_changed or name_changed or doc_changed:
                    existing_emp.first_name = first_name
                    if last_name:
                        existing_emp.last_name = last_name
                    if doc_changed:
                        existing_emp.document_number_encrypted = encrypt_field(doc_num)
                        existing_emp.document_hash = hash_blind_index(doc_num)
                    if new_unit_id:
                        existing_emp.organizational_unit_id = new_unit_id
                    if dir_for_emp:
                        existing_emp.direction_name = dir_for_emp
                    if not existing_emp.created_by_user_id and current_user:
                        existing_emp.created_by_user_id = current_user.id
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
                current_emp_id = existing_emp.employee_id if existing_emp else emp_id
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
