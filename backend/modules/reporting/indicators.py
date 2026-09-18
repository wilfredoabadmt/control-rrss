"""
Cálculo de Indicadores Institucionales con Ficha Técnica — GAMEA Social Monitor
Principio V: No Inventar Datos
Principio XXVI: Semántica de Indicadores
Principio XXVII: No Rankings
REQ-RPT-003, BR-RPT-008, BR-RPT-009
"""

import uuid
from dataclasses import asdict, dataclass
from typing import Any

from modules.employees.models import Employee
from modules.interactions.models import Interaction
from modules.publications.models import MonitoringCampaign
from modules.shared.enums import EmployeeStatus, VerificationStatus
from modules.verification.models import Verification
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class IndicatorSheet:
    """
    Ficha técnica obligatoria que documenta la metodología formal de cada indicador (Principio XXVI).
    """
    code: str
    name: str
    value: float
    value_formatted: str
    numerator: float
    denominator: float
    period: str
    exclusions: str
    not_observable_treatment: str
    explanation: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class IndicatorEngine:
    """
    Motor centralizado de cálculo de métricas para reportes y dashboards ejecutivos.
    Garantiza consistencia absoluta entre lo visualizado en pantalla y lo exportado a Excel.
    """

    @staticmethod
    async def calculate_observable_coverage_rate(
        db: AsyncSession,
        campaign_id: uuid.UUID | None = None,
        period_label: str = "Histórico / Vigente",
    ) -> IndicatorSheet:
        """
        Tasa de Cobertura Observable (REQ-RPT-003):
        Proporción de funcionarios con al menos una interacción verificada (CONFIRMED o DECLARED_CONFIRMED).
        """
        # 1. Denominador: Total de funcionarios con estado ACTIVE
        stmt_den = select(func.count(Employee.employee_id)).where(
            Employee.status == EmployeeStatus.ACTIVE.value
        )
        denominator = float((await db.execute(stmt_den)).scalar_one() or 0)

        # 2. Numerador: Funcionarios con al menos una interacción confirmada
        stmt_num = (
            select(func.count(func.distinct(Verification.employee_id)))
            .join(Employee, Employee.employee_id == Verification.employee_id)
            .where(
                Employee.status == EmployeeStatus.ACTIVE.value,
                Verification.verification_status.in_([
                    VerificationStatus.CONFIRMED.value,
                    VerificationStatus.DECLARED_CONFIRMED.value,
                ]),
            )
        )
        if campaign_id:
            stmt_num = stmt_num.join(Verification.interaction).join(
                Interaction.publication
            ).join(
                MonitoringCampaign.publications
            ).where(
                MonitoringCampaign.id == campaign_id
            )

        numerator = float((await db.execute(stmt_num)).scalar_one() or 0)

        rate = (numerator / denominator * 100.0) if denominator > 0 else 0.0

        return IndicatorSheet(
            code="IND-COV-001",
            name="Tasa de Cobertura Observable",
            value=round(rate, 2),
            value_formatted=f"{round(rate, 2)}%",
            numerator=numerator,
            denominator=denominator,
            period=period_label,
            exclusions="Excluye funcionarios en estado ON_LEAVE, INACTIVE o TERMINATED.",
            not_observable_treatment="Interacciones en estado NOT_OBSERVABLE o API_RESTRICTED no se computan en el numerador.",
            explanation="Porcentaje de funcionarios públicos activos con participación verificada mediante cruce institucional o validación de operador.",
        )

    @staticmethod
    async def calculate_verification_rate(
        db: AsyncSession,
        period_label: str = "Histórico / Vigente",
    ) -> IndicatorSheet:
        """
        Tasa de Verificación Completada (REQ-RPT-003):
        Proporción de interacciones con dictamen epistémico final respecto al total observado.
        """
        # Total de interacciones
        stmt_total = select(func.count(Interaction.id))
        total_interactions = float((await db.execute(stmt_total)).scalar_one() or 0)

        # Interacciones verificadas (con registro en verifications)
        stmt_verified = select(func.count(func.distinct(Verification.interaction_id)))
        verified_interactions = float((await db.execute(stmt_verified)).scalar_one() or 0)

        rate = (verified_interactions / total_interactions * 100.0) if total_interactions > 0 else 0.0

        return IndicatorSheet(
            code="IND-VER-002",
            name="Tasa de Verificación Epistémica",
            value=round(rate, 2),
            value_formatted=f"{round(rate, 2)}%",
            numerator=verified_interactions,
            denominator=total_interactions,
            period=period_label,
            exclusions="Ninguna. Considera el universo total de interacciones ingeridas.",
            not_observable_treatment="Incluye verificaciones dictaminadas como NOT_OBSERVABLE y API_RESTRICTED.",
            explanation="Grado de cobertura del motor de verificación sobre el total de interacciones capturadas.",
        )

    @staticmethod
    async def get_verification_status_distribution(db: AsyncSession) -> dict[str, int]:
        """
        Retorna la distribución cuantitativa exacta de interacciones por estado de verificación.
        """
        stmt = (
            select(Verification.verification_status, func.count(Verification.id))
            .group_by(Verification.verification_status)
        )
        rows = (await db.execute(stmt)).fetchall()
        distribution = {status.value: 0 for status in VerificationStatus}
        for status_val, count in rows:
            distribution[status_val] = count
        return distribution
