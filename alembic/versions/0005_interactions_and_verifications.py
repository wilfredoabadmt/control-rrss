"""Interactions, Evidences, Verifications, and External Sync Jobs tables

Revision ID: 0005_interactions_and_verifications
Revises: 0004_social_and_publications
Create Date: 2026-09-17 23:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = '0005_interactions_and_verifications'
down_revision: Union[str, None] = '0004_social_and_publications'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tabla interactions
    op.create_table(
        'interactions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('publication_id', UUID(as_uuid=True), sa.ForeignKey('publications.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('platform_id', UUID(as_uuid=True), sa.ForeignKey('social_platforms.id', ondelete='RESTRICT'), nullable=False, index=True),
        sa.Column('interaction_type', sa.String(50), nullable=False, index=True),
        sa.Column('external_interaction_id', sa.String(100), nullable=True, index=True),
        sa.Column('external_post_id', sa.String(100), nullable=True, index=True),
        sa.Column('external_author_id', sa.String(100), nullable=True, index=True),
        sa.Column('external_author_name', sa.String(255), nullable=True),
        sa.Column('content_text', sa.Text(), nullable=True),
        sa.Column('reaction_type', sa.String(50), nullable=True),
        sa.Column('external_created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('captured_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('capture_method', sa.String(50), nullable=False),
        sa.Column('api_version', sa.String(50), nullable=True),
        sa.Column('data_origin_type', sa.String(50), nullable=False),
        sa.Column('source_platform', sa.String(50), nullable=True),
        sa.Column('source_account_id', UUID(as_uuid=True), sa.ForeignKey('institutional_accounts.id', ondelete='SET NULL'), nullable=True),
        sa.Column('raw_payload_ref', sa.String(255), nullable=True),
        sa.Column('correlation_id', sa.String(100), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('platform_id', 'external_interaction_id', name='uq_interactions_platform_external_id'),
    )

    # 2. Tabla interaction_evidences
    op.create_table(
        'interaction_evidences',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('interaction_id', UUID(as_uuid=True), sa.ForeignKey('interactions.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('evidence_type', sa.String(50), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('content_hash', sa.String(64), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('created_by_user_id', sa.String(100), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 3. Tabla verifications
    op.create_table(
        'verifications',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('interaction_id', UUID(as_uuid=True), sa.ForeignKey('interactions.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('employee_id', sa.String(50), sa.ForeignKey('employees.employee_id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('verification_status', sa.String(50), nullable=False, index=True),
        sa.Column('verification_method', sa.String(50), nullable=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('verified_by_user_id', sa.String(100), nullable=True),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('evidence_id', UUID(as_uuid=True), sa.ForeignKey('interaction_evidences.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 4. Tabla external_sync_jobs
    op.create_table(
        'external_sync_jobs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('platform_id', UUID(as_uuid=True), sa.ForeignKey('social_platforms.id', ondelete='RESTRICT'), nullable=False, index=True),
        sa.Column('institutional_account_id', UUID(as_uuid=True), sa.ForeignKey('institutional_accounts.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('job_type', sa.String(50), nullable=False, index=True),
        sa.Column('status', sa.String(50), nullable=False, index=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('records_processed', sa.Integer(), default=0, nullable=False),
        sa.Column('records_created', sa.Integer(), default=0, nullable=False),
        sa.Column('records_updated', sa.Integer(), default=0, nullable=False),
        sa.Column('records_failed', sa.Integer(), default=0, nullable=False),
        sa.Column('error_details', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), default=0, nullable=False),
        sa.Column('api_version', sa.String(50), nullable=True),
        sa.Column('correlation_id', sa.String(100), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('external_sync_jobs')
    op.drop_table('verifications')
    op.drop_table('interaction_evidences')
    op.drop_table('interactions')
