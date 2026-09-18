"""
Procesador Canónico de Interacciones e Ingesta Idempotente — GAMEA Social Monitor
Principio V: No Inventar Datos
Principio VI: Proveniencia del Dato
Principio XV: Ingesta Idempotente
REQ-INT-001, REQ-INT-002, BR-INT-001, BR-INT-002
"""

import hashlib

from core.audit.service import record_audit_event
from core.logging_config import get_correlation_id
from modules.interactions.models import Interaction, InteractionEvidence
from modules.interactions.schemas import InteractionCreate
from modules.publications.models import Publication
from modules.shared.enums import AuditAction
from modules.shared.exceptions import EntityNotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class InteractionProcessor:
    """
    Motor de ingesta de interacciones que garantiza estricta idempotencia y proveniencia forense.
    """

    @staticmethod
    def compute_sha256(content: str) -> str:
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    @staticmethod
    async def process_interaction(
        db: AsyncSession,
        item: InteractionCreate,
        current_user_id: str | None = None,
    ) -> Interaction:
        """
        Procesa e inserta una interacción de forma estrictamente idempotente (Principio XV).
        Si la interacción ya existe, retorna el registro existente sin mutar datos.
        """
        cid = get_correlation_id()

        # 1. Validar publicación existente
        stmt_pub = select(Publication).where(Publication.id == item.publication_id)
        pub = (await db.execute(stmt_pub)).scalar_one_or_none()
        if not pub:
            raise EntityNotFoundException("Publication", str(item.publication_id))

        # 2. Comprobación de Idempotencia (BR-INT-001 / BR-INT-002)
        if item.external_interaction_id:
            stmt_exist = (
                select(Interaction)
                .where(
                    Interaction.platform_id == item.platform_id,
                    Interaction.external_interaction_id == item.external_interaction_id.strip(),
                )
                .options(selectinload(Interaction.evidences))
            )
            existing = (await db.execute(stmt_exist)).scalar_one_or_none()
            if existing:
                return existing

        # 3. Construir registro canónico
        payload_hash = InteractionProcessor.compute_sha256(item.raw_payload) if item.raw_payload else None

        interaction = Interaction(
            publication_id=item.publication_id,
            platform_id=item.platform_id,
            interaction_type=item.interaction_type,
            external_interaction_id=item.external_interaction_id.strip() if item.external_interaction_id else None,
            external_post_id=item.external_post_id or pub.external_post_id,
            external_author_id=item.external_author_id.strip() if item.external_author_id else None,
            external_author_name=item.external_author_name,
            content_text=item.content_text,
            reaction_type=item.reaction_type,
            external_created_at=item.external_created_at,
            capture_method=item.capture_method,
            api_version=item.api_version,
            data_origin_type=item.data_origin_type,
            source_platform=item.source_platform,
            source_account_id=item.source_account_id,
            raw_payload_ref=payload_hash,
            correlation_id=cid,
        )
        db.add(interaction)
        await db.flush()

        # 4. Almacenar evidencia técnica forense (REQ-INT-002)
        if item.raw_payload:
            evidence = InteractionEvidence(
                interaction_id=interaction.id,
                evidence_type="API_RESPONSE" if item.capture_method != "WEBHOOK" else "WEBHOOK_PAYLOAD",
                content=item.raw_payload,
                content_hash=payload_hash,
                created_by_user_id=current_user_id or "INGESTION_WORKER",
            )
            db.add(evidence)

        await record_audit_event(
            db=db,
            action=AuditAction.CREATE,
            entity_name="Interaction",
            entity_id=str(interaction.id),
            user_id=current_user_id or "SYSTEM_WORKER",
            user_email="ingestion@elalto.gob.bo",
            new_state={
                "interaction_type": interaction.interaction_type,
                "external_id": interaction.external_interaction_id,
                "author_id": interaction.external_author_id,
            },
            correlation_id=cid,
        )

        await db.commit()
        stmt_refreshed = (
            select(Interaction)
            .where(Interaction.id == interaction.id)
            .options(selectinload(Interaction.evidences))
            .execution_options(populate_existing=True)
        )
        return (await db.execute(stmt_refreshed)).scalar_one()
