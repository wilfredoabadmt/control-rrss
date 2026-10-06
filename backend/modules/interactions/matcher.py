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
        """
        # BR-INT-009: Si external_author_id es NULL (API no retornó identidad), es NOT_OBSERVABLE
        if not interaction.external_author_id or not interaction.external_author_id.strip():
            return MatchResult(
                status=MatchStatus.NOT_OBSERVABLE,
                message="La plataforma social no suministró un identificador unívoco de autor (API restringida o anónima).",
            )

        author_id = interaction.external_author_id.strip()
        clean_author = author_id.lstrip("@").lower()
        author_name = (interaction.external_author_name or "").strip().lower()

        # BR-INT-006: 1. Comparar external_author_id con external_user_id de SocialAccount activa
        stmt = (
            select(SocialAccount)
            .where(
                SocialAccount.platform_id == interaction.platform_id,
                SocialAccount.external_user_id == author_id,
                SocialAccount.binding_status == BindingStatus.ACTIVE.value,
            )
            .options(selectinload(SocialAccount.employee))
        )
        account = (await db.execute(stmt)).scalar_one_or_none()

        # 2. Si no coincide por ID externo, probar coincidencia por username/handle
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
            for cand in candidates:
                cand_handle = (cand.current_username or "").lstrip("@").lower()
                if cand_handle and (cand_handle == clean_author or (author_name and cand_handle == author_name)):
                    account = cand
                    break

        if account and account.employee and account.employee.status == EmployeeStatus.ACTIVE.value:
            return MatchResult(
                status=MatchStatus.MATCHED,
                employee=account.employee,
                social_account=account,
                message=f"Interacción cruzada con éxito con el funcionario {account.employee.employee_id} ({account.employee.first_name} {account.employee.last_name}).",
            )

        # 3. Si aún no coincide por cuenta social, probar cruce por nombre de funcionario
        if author_name and len(author_name) >= 3:
            import re
            import unicodedata
            from difflib import SequenceMatcher

            def _clean_n(t: str | None) -> str:
                if not t:
                    return ""
                norm = unicodedata.normalize("NFKD", t).encode("ASCII", "ignore").decode("utf-8")
                return re.sub(r"[^a-z0-9]", "", norm.lower().strip())

            norm_author = _clean_n(author_name)
            stmt_emps = (
                select(Employee)
                .where(Employee.status == EmployeeStatus.ACTIVE.value)
                .options(selectinload(Employee.organizational_unit))
            )
            all_active_emps = list((await db.execute(stmt_emps)).scalars().all())

            for emp in all_active_emps:
                emp_full = _clean_n(f"{emp.first_name} {emp.last_name}")
                first_last = _clean_n(f"{emp.first_name} {emp.last_name.split()[0] if emp.last_name else ''}")
                
                # Coincidencia exacta o primer nombre + primer apellido
                matched_name = False
                if norm_author == emp_full or (first_last and norm_author == first_last):
                    matched_name = True
                else:
                    # Fuzzy matching estricto (ratio >= 0.92) para evitar falsos positivos
                    ratio = SequenceMatcher(None, norm_author, emp_full).ratio()
                    if ratio >= 0.92:
                        matched_name = True

                if matched_name:
                    # Enlazar o asociar la cuenta social de forma automática
                    stmt_exist = select(SocialAccount).where(
                        SocialAccount.employee_id == emp.employee_id,
                        SocialAccount.platform_id == interaction.platform_id,
                    )
                    emp_acc = (await db.execute(stmt_exist)).scalar_one_or_none()
                    if emp_acc:
                        if not emp_acc.external_user_id and author_id and not author_id.startswith("anonimo"):
                            emp_acc.external_user_id = author_id
                    else:
                        emp_acc = SocialAccount(
                            employee_id=emp.employee_id,
                            platform_id=interaction.platform_id,
                            external_user_id=author_id if not author_id.startswith("anonimo") else None,
                            current_username=interaction.external_author_name,
                            binding_status=BindingStatus.ACTIVE.value,
                        )
                        db.add(emp_acc)
                        await db.flush()

                    return MatchResult(
                        status=MatchStatus.MATCHED,
                        employee=emp,
                        social_account=emp_acc,
                        message=f"Interacción cruzada por nombre con el funcionario {emp.employee_id} ({emp.first_name} {emp.last_name}).",
                    )

        # BR-INT-008: No se encontró coincidencia en el directorio municipal
        return MatchResult(
            status=MatchStatus.UNMATCHED,
            message=f"El identificador externo '{author_id}' ('{author_name}') no corresponde a ningún funcionario municipal activo registrado.",
        )

