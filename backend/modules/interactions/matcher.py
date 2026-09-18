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

        # BR-INT-006: Comparar external_author_id con external_user_id de SocialAccount activa
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

        if account and account.employee and account.employee.status == EmployeeStatus.ACTIVE.value:
            return MatchResult(
                status=MatchStatus.MATCHED,
                employee=account.employee,
                social_account=account,
                message=f"Interacción cruzada con éxito con el funcionario {account.employee.employee_id} ({account.employee.first_name} {account.employee.last_name}).",
            )

        # BR-INT-008: No se encontró coincidencia en el directorio municipal
        return MatchResult(
            status=MatchStatus.UNMATCHED,
            message=f"El identificador externo '{author_id}' no corresponde a ningún funcionario municipal activo registrado.",
        )
