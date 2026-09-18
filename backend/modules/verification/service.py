"""
Capa de Servicios de Verificación Epistémica — GAMEA Social Monitor
Principio V: No Inventar Datos
Principio XXVIII: Explicabilidad
REQ-VER-002, REQ-VER-003, BR-VER-003 a BR-VER-006
"""

import hashlib
import uuid

from core.audit.service import record_audit_event
from core.logging_config import get_correlation_id
from modules.employees.models import Employee
from modules.iam.models import User
from modules.interactions.models import Interaction, InteractionEvidence
from modules.shared.enums import AuditAction, VerificationStatus
from modules.shared.exceptions import EntityNotFoundException, ValidationException
from modules.verification.explainer import VerificationExplainer
from modules.verification.models import Verification
from modules.verification.schemas import ConsolidatedStatusResponse, ManualVerificationRequest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class VerificationService:

    @staticmethod
    async def manual_verification(
        db: AsyncSession,
        req: ManualVerificationRequest,
        current_user: User,
    ) -> Verification:
        """
        Ejecuta la verificación manual asistida por operador (REQ-VER-002).
        Requiere justificación obligatoria y asigna estados DECLARED_*.
        """
        # BR-VER-004: El resultado manual MUST ser DECLARED_CONFIRMED o DECLARED_NOT_FOUND
        allowed_statuses = {
            VerificationStatus.DECLARED_CONFIRMED.value,
            VerificationStatus.DECLARED_NOT_FOUND.value,
        }
        if req.status not in allowed_statuses:
            raise ValidationException(
                f"Estado de verificación manual inválido: '{req.status}'. "
                f"Los estados permitidos son: {allowed_statuses}."
            )

        cid = get_correlation_id()

        # 1. Validar existencia de interacción
        stmt_int = (
            select(Interaction)
            .where(Interaction.id == req.interaction_id)
            .options(
                selectinload(Interaction.platform),
                selectinload(Interaction.publication),
            )
        )
        interaction = (await db.execute(stmt_int)).scalar_one_or_none()
        if not interaction:
            raise EntityNotFoundException("Interaction", str(req.interaction_id))

        # 2. Validar existencia de funcionario
        stmt_emp = select(Employee).where(Employee.employee_id == req.employee_id)
        emp = (await db.execute(stmt_emp)).scalar_one_or_none()
        if not emp:
            raise EntityNotFoundException("Employee", req.employee_id)

        # 3. Crear evidencia técnica (BR-VER-003)
        ev_id: uuid.UUID | None = None
        evidence_content = req.evidence_content or req.evidence_note
        content_hash = hashlib.sha256(evidence_content.encode("utf-8")).hexdigest()

        evidence = InteractionEvidence(
            interaction_id=interaction.id,
            evidence_type="SCREENSHOT" if req.evidence_content else "MANUAL_NOTE",
            content=evidence_content,
            content_hash=content_hash,
            created_by_user_id=str(current_user.id),
        )
        db.add(evidence)
        ev_id = evidence.id

        # 4. Generar explicación humana y técnica (Principio XXVIII)
        platform_name = interaction.platform.display_name if interaction.platform else "Red Social"
        explanation = VerificationExplainer.explain(
            status=req.status,
            platform_name=platform_name,
            post_title_or_id=interaction.external_post_id,
            employee_id=emp.employee_id,
            operator_email=current_user.email,
            evidence_note=req.evidence_note,
            event_date=interaction.external_created_at or interaction.captured_at,
        )

        verification = Verification(
            interaction_id=interaction.id,
            employee_id=emp.employee_id,
            verification_status=req.status,
            verification_method="MANUAL_OPERATOR",
            verified_by_user_id=str(current_user.id),
            explanation=explanation,
            evidence_id=ev_id,
        )
        db.add(verification)

        # BR-VER-006: Toda verificación manual MUST registrar evento de auditoría
        await record_audit_event(
            db=db,
            action=AuditAction.VERIFY,
            entity_name="Verification",
            entity_id=str(verification.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            new_state={
                "interaction_id": str(interaction.id),
                "employee_id": emp.employee_id,
                "status": req.status,
                "evidence_hash": content_hash,
                "method": "MANUAL_OPERATOR",
            },
            details={"evidence_note": req.evidence_note},
            correlation_id=cid,
        )

        await db.refresh(verification)
        return verification

    @staticmethod
    async def get_consolidated_status(
        db: AsyncSession,
        employee_id: str,
        publication_id: uuid.UUID,
        interaction_type: str,
    ) -> ConsolidatedStatusResponse:
        """
        Calcula el estado consolidado de verificación por la combinación
        (funcionario × publicación × tipo de interacción) (REQ-VER-003).
        """
        # Buscar verificaciones existentes para esta publicación y funcionario
        stmt = (
            select(Verification)
            .join(Verification.interaction)
            .where(
                Verification.employee_id == employee_id,
                Interaction.publication_id == publication_id,
                Interaction.interaction_type == interaction_type,
            )
            .order_by(Verification.verified_at.desc())
        )
        verifications = list((await db.execute(stmt)).scalars().all())

        if verifications:
            # Si hay verificación previa (automática o manual)
            latest = verifications[0]
            return ConsolidatedStatusResponse(
                employee_id=employee_id,
                publication_id=publication_id,
                interaction_type=interaction_type,
                status=latest.verification_status,
                explanation=latest.explanation,
                verified_at=latest.verified_at,
            )

        # Si no existe verificación directa, determinar estado base
        return ConsolidatedStatusResponse(
            employee_id=employee_id,
            publication_id=publication_id,
            interaction_type=interaction_type,
            status=VerificationStatus.NOT_FOUND.value,
            explanation=f"No se ha registrado ninguna interacción de tipo {interaction_type} para el funcionario [{employee_id}] en esta publicación.",
            verified_at=None,
        )
