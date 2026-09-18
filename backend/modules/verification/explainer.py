"""
Motor de Explicabilidad de Estados Epistémicos — GAMEA Social Monitor
Principio XXVIII: Explicabilidad de Estados
REQ-VER-004
"""

from datetime import datetime

from modules.shared.enums import VerificationStatus


class VerificationExplainer:
    """
    Genera explicaciones textuales comprensibles y verificables para cada estado epistémico.
    Garantiza el cumplimiento estricto del Principio XXVIII (Explicabilidad).
    """

    @staticmethod
    def explain(
        status: str,
        platform_name: str = "la plataforma social",
        post_title_or_id: str | None = None,
        username: str | None = None,
        employee_id: str | None = None,
        operator_email: str | None = None,
        evidence_note: str | None = None,
        event_date: datetime | None = None,
    ) -> str:
        date_str = event_date.strftime("%Y-%m-%d %H:%M UTC") if event_date else "fecha no registrada"
        target_ref = f" (Post: {post_title_or_id})" if post_title_or_id else ""
        emp_ref = f" al funcionario [{employee_id}]" if employee_id else ""
        user_ref = f"@{username}" if username else "usuario externo"

        if status == VerificationStatus.CONFIRMED.value:
            return (
                f"Interacción confirmada en {platform_name}{target_ref}. "
                f"Cuenta: {user_ref}{emp_ref}. Fecha: {date_str}. "
                f"Método: cruce automático con cuenta institucional vinculada."
            )

        elif status == VerificationStatus.NOT_OBSERVABLE.value:
            return (
                f"La API oficial de {platform_name} no proporcionó la identidad del autor de esta interacción. "
                f"El dato no puede verificarse automáticamente conforme al Principio V (No Inventar Datos)."
            )

        elif status == VerificationStatus.API_RESTRICTED.value:
            return (
                f"La API oficial de {platform_name} no permite obtener la identidad individual de interacciones para este tipo de recurso. "
                f"Este dato no es técnicamente observable por medios automáticos directos."
            )

        elif status == VerificationStatus.DECLARED_CONFIRMED.value:
            op_text = f"el operador [{operator_email}]" if operator_email else "un operador autorizado"
            ev_text = f" Evidencia adjunta: {evidence_note}." if evidence_note else " Con respaldo documental verificado."
            return (
                f"Verificado manualmente por {op_text} el {date_str}{emp_ref}.{ev_text}"
            )

        elif status == VerificationStatus.DECLARED_NOT_FOUND.value:
            op_text = f"el operador [{operator_email}]" if operator_email else "un operador autorizado"
            return (
                f"Descartado manualmente por {op_text} el {date_str} tras revisión exhaustiva de evidencia."
            )

        elif status == VerificationStatus.NOT_FOUND.value:
            return (
                "El autor de la interacción no coincide con ninguna cuenta social vinculada a la nómina municipal activa."
            )

        elif status == VerificationStatus.PENDING.value:
            return "Interacción registrada pendiente de cruce o dictamen de verificación."

        elif status == VerificationStatus.ERROR.value:
            return "Ocurrió una anomalía técnica en el conector o en el procesamiento del registro."

        return f"Estado de verificación: {status}."
