"""
Motor de Verificación Automática — GAMEA Social Monitor
Principio V: No Inventar Datos
Principio XXVIII: Explicabilidad de Estados
REQ-VER-001, BR-VER-001, BR-VER-002
"""


from core.audit.service import record_audit_event
from core.logging_config import get_correlation_id
from modules.interactions.matcher import InteractionMatcher, MatchStatus
from modules.interactions.models import Interaction
from modules.shared.enums import AuditAction, VerificationStatus
from modules.verification.explainer import VerificationExplainer
from modules.verification.models import Verification
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class VerificationEngine:
    """
    Ejecuta el flujo algorítmico de verificación automática de interacciones (REQ-VER-001).
    """

    @staticmethod
    async def verify_interaction(
        db: AsyncSession,
        interaction: Interaction,
        system_user_id: str = "VERIFICATION_ENGINE",
    ) -> Verification:
        """
        Aplica el flujo canónico:
        Interacción -> Matcher -> Status (CONFIRMED | NOT_FOUND | NOT_OBSERVABLE) -> Verification
        """
        cid = get_correlation_id()

        # Eagerly load platform y publication
        stmt = (
            select(Interaction)
            .where(Interaction.id == interaction.id)
            .options(
                selectinload(Interaction.platform),
                selectinload(Interaction.publication),
            )
            .execution_options(populate_existing=True)
        )
        loaded_interaction = (await db.execute(stmt)).scalar_one()

        match_res = await InteractionMatcher.match_interaction(db, loaded_interaction)

        platform_name = loaded_interaction.platform.display_name if loaded_interaction.platform else "Red Social"

        if match_res.status == MatchStatus.MATCHED and match_res.employee:
            v_status = VerificationStatus.CONFIRMED.value
            emp_id: str | None = match_res.employee.employee_id
            username = match_res.social_account.current_username if match_res.social_account else None
        elif match_res.status == MatchStatus.NOT_OBSERVABLE:
            v_status = VerificationStatus.NOT_OBSERVABLE.value
            emp_id = None
            username = None
        else:
            v_status = VerificationStatus.NOT_FOUND.value
            emp_id = None
            username = None

        explanation = VerificationExplainer.explain(
            status=v_status,
            platform_name=platform_name,
            post_title_or_id=loaded_interaction.external_post_id,
            username=username,
            employee_id=emp_id,
            event_date=loaded_interaction.external_created_at or loaded_interaction.captured_at,
        )

        verification = Verification(
            interaction_id=loaded_interaction.id,
            employee_id=emp_id,
            verification_status=v_status,
            verification_method="AUTOMATIC_CROSS_REFERENCE",
            verified_by_user_id=system_user_id,
            explanation=explanation,
        )
        db.add(verification)
        await db.flush()

        await record_audit_event(
            db=db,
            action=AuditAction.VERIFY,
            entity_name="Verification",
            entity_id=str(verification.id),
            user_id=system_user_id,
            user_email="verification@elalto.gob.bo",
            new_state={
                "interaction_id": str(interaction.id),
                "status": v_status,
                "employee_id": emp_id,
                "method": "AUTOMATIC_CROSS_REFERENCE",
            },
            correlation_id=cid,
        )
        await db.commit()
        await db.refresh(verification)
        return verification
