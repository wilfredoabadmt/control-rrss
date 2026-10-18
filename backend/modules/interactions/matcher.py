"""
Motor de Cruce Automático de Interacciones con Funcionarios — GAMEA Social Monitor
Principio VII: Identidad Única e Inmutable
REQ-INT-003, BR-INT-006, BR-INT-007, BR-INT-008, BR-INT-009
"""

from dataclasses import dataclass
from enum import StrEnum

from modules.employees.models import Employee
from modules.interactions.models import Interaction
from modules.shared.enums import BindingStatus, EmployeeStatus
from modules.social_accounts.models import SocialAccount
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class MatchStatus(StrEnum):
    MATCHED = "MATCHED"
    UNMATCHED = "UNMATCHED"
    NOT_OBSERVABLE = "NOT_OBSERVABLE"


@dataclass
class MatchResult:
    status: MatchStatus
    employee: Employee | None = None
    social_account: SocialAccount | None = None
    message: str = ""


class InteractionMatcher:
    """
    Motor encargado de cruzar la autoría externa de una interacción con los funcionarios registrados.
    """

    @staticmethod
    async def match_interaction(
        db: AsyncSession,
        interaction: Interaction,
    ) -> MatchResult:
        """
        Ejecuta las reglas BR-INT-006 a BR-INT-009 sobre la interacción.
        Cruza rigurosamente por:
        1. Cédula de Identidad (employee_id) si el identificador externo es CI.
        2. ID técnico externo registrado en SocialAccount (external_user_id).
        3. Username / @handle / URL de red social registrada en SocialAccount.
        4. Coincidencia de nombre y apellidos contra el padrón municipal activo (name_matching).
        """
        raw_author_id = (interaction.external_author_id or "").strip()
        clean_author = raw_author_id.lstrip("@").lower()
        author_name = (interaction.external_author_name or "").strip()
        clean_name = author_name.lower()

        is_anon_id = (
            not raw_author_id
            or clean_author in {"anonimo", "anonymous", "desconocido", "-", "null", "none"}
            or clean_author.startswith("anonimo")
        )
        is_anon_name = (
            not clean_name
            or clean_name in {
                "usuario facebook", "usuario de facebook", "facebook user",
                "anonimo", "anonymous", "desconocido", "-", "null", "none"
            }
            or len(clean_name) < 3
        )

        # BR-INT-009: Si no hay identificador técnico NI nombre visible del autor, es NOT_OBSERVABLE
        if is_anon_id and is_anon_name:
            return MatchResult(
                status=MatchStatus.NOT_OBSERVABLE,
                message="La plataforma social no suministró un identificador unívoco ni nombre de autor observable.",
            )

        # 1. Coincidencia directa por Cédula de Identidad (employee_id)
        if not is_anon_id:
            stmt_ci = (
                select(Employee)
                .where(
                    Employee.employee_id == raw_author_id,
                    Employee.status == EmployeeStatus.ACTIVE.value,
                )
                .options(selectinload(Employee.organizational_unit))
            )
            emp_by_ci = (await db.execute(stmt_ci)).scalar_one_or_none()
            if emp_by_ci:
                return MatchResult(
                    status=MatchStatus.MATCHED,
                    employee=emp_by_ci,
                    social_account=None,
                    message=f"Interacción cruzada por Cédula de Identidad con el funcionario {emp_by_ci.employee_id} ({emp_by_ci.first_name} {emp_by_ci.last_name}).",
                )

        # BR-INT-006: 2. Comparar external_author_id con external_user_id de SocialAccount activa
        account = None
        if not is_anon_id:
            stmt = (
                select(SocialAccount)
                .where(
                    SocialAccount.platform_id == interaction.platform_id,
                    SocialAccount.external_user_id == raw_author_id,
                    SocialAccount.binding_status == BindingStatus.ACTIVE.value,
                )
                .options(selectinload(SocialAccount.employee))
            )
            account = (await db.execute(stmt)).scalar_one_or_none()

        # 3. Si no coincide por ID externo, probar coincidencia por username/handle/URL en SocialAccount
        if not account:
            stmt_user = (
                select(SocialAccount)
                .where(
                    SocialAccount.platform_id == interaction.platform_id,
                    SocialAccount.binding_status == BindingStatus.ACTIVE.value,
                )
                .options(selectinload(SocialAccount.employee))
            )
            candidates = list((await db.execute(stmt_user)).scalars().all())
            import re
            clean_name_pure = re.sub(r"[^a-z]", "", clean_name)
            for cand in candidates:
                cand_handle = (cand.current_username or "").lstrip("@").lower()
                clean_cand_h = extract_social_handle(cand.current_username).lower()
                cand_url = extract_social_handle(cand.profile_url).lower() if cand.profile_url else ""

                if not is_anon_id:
                    if clean_author in (cand_handle, clean_cand_h, cand_url):
                        account = cand
                        break
                if not is_anon_name:
                    if clean_name in (cand_handle, clean_cand_h, cand_url):
                        account = cand
                        break
                    # Coincidencia pura sin dígitos o símbolos (ej: @markpatzi88 vs Mark Patzi)
                    cand_pure = re.sub(r"[^a-z]", "", clean_cand_h or cand_handle)
                    if len(cand_pure) >= 5 and len(clean_name_pure) >= 5:
                        if cand_pure == clean_name_pure or cand_pure in clean_name_pure or clean_name_pure in cand_pure:
                            account = cand
                            break

        if account and account.employee and account.employee.status == EmployeeStatus.ACTIVE.value:
            return MatchResult(
                status=MatchStatus.MATCHED,
                employee=account.employee,
                social_account=account,
                message=f"Interacción cruzada con éxito con el funcionario {account.employee.employee_id} ({account.employee.first_name} {account.employee.last_name}).",
            )

        # 4. Si aún no coincide por cuenta social, probar cruce por nombre de funcionario
        if not is_anon_name:
            from modules.shared.name_matching import best_employee_match

            stmt_emps = (
                select(Employee)
                .where(Employee.status == EmployeeStatus.ACTIVE.value)
                .options(selectinload(Employee.organizational_unit))
            )
            all_active_emps = list((await db.execute(stmt_emps)).scalars().all())

            name_match = best_employee_match(author_name, all_active_emps)
            if name_match.matched:
                emp = name_match.employee
                # Enlazar o asociar la cuenta social de forma automática
                stmt_exist = select(SocialAccount).where(
                    SocialAccount.employee_id == emp.employee_id,
                    SocialAccount.platform_id == interaction.platform_id,
                )
                emp_acc = (await db.execute(stmt_exist)).scalar_one_or_none()
                if emp_acc:
                    if not emp_acc.external_user_id and not is_anon_id:
                        emp_acc.external_user_id = raw_author_id
                else:
                    emp_acc = SocialAccount(
                        employee_id=emp.employee_id,
                        platform_id=interaction.platform_id,
                        external_user_id=raw_author_id if not is_anon_id else None,
                        current_username=author_name,
                        binding_status=BindingStatus.ACTIVE.value,
                    )
                    db.add(emp_acc)
                    await db.flush()

                return MatchResult(
                    status=MatchStatus.MATCHED,
                    employee=emp,
                    social_account=emp_acc,
                    message=(
                        f"Interacción cruzada por nombre ({name_match.reason}, "
                        f"puntaje {name_match.score:.2f}) con el funcionario {emp.employee_id} "
                        f"({emp.first_name} {emp.last_name})."
                    ),
                )

        # BR-INT-008: No se encontró coincidencia en el directorio municipal
        return MatchResult(
            status=MatchStatus.UNMATCHED,
            message=f"El identificador externo '{raw_author_id}' ('{author_name}') no corresponde a ningún funcionario municipal activo registrado.",
        )

