"""Social Platforms, Accounts, Publications, Campaigns and Targets tables

Revision ID: 0004_social_and_publications
Revises: 0003_employees_and_org
Create Date: 2026-09-17 22:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = '0004_social_and_publications'
down_revision: Union[str, None] = '0003_employees_and_org'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tabla social_platforms
    op.create_table(
        'social_platforms',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('display_name', sa.String(100), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('api_version', sa.String(20), default='v20.0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 2. Tabla institutional_accounts
    op.create_table(
        'institutional_accounts',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('platform_id', UUID(as_uuid=True), sa.ForeignKey('social_platforms.id', ondelete='RESTRICT'), nullable=False, index=True),
        sa.Column('external_page_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('account_name', sa.String(150), nullable=False),
        sa.Column('handle', sa.String(100), nullable=False),
        sa.Column('access_token_encrypted', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_monitored', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 3. Tabla social_accounts
    op.create_table(
        'social_accounts',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('employee_id', sa.String(50), sa.ForeignKey('employees.employee_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('platform_id', UUID(as_uuid=True), sa.ForeignKey('social_platforms.id', ondelete='RESTRICT'), nullable=False, index=True),
        sa.Column('external_user_id', sa.String(100), nullable=True, index=True),
        sa.Column('current_username', sa.String(100), nullable=False, index=True),
        sa.Column('profile_url', sa.String(255), nullable=True),
        sa.Column('binding_status', sa.String(30), default='ACTIVE', nullable=False, index=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('employee_id', 'platform_id', name='uq_employee_platform_account'),
    )

    # 4. Tabla username_history
    op.create_table(
        'username_history',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('social_account_id', UUID(as_uuid=True), sa.ForeignKey('social_accounts.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('previous_username', sa.String(100), nullable=False),
        sa.Column('new_username', sa.String(100), nullable=False),
        sa.Column('changed_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('recorded_by_user_id', sa.String(36), nullable=True),
        sa.Column('correlation_id', sa.String(64), nullable=False, index=True),
    )

    # 5. Tabla monitoring_campaigns
    op.create_table(
        'monitoring_campaigns',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True, index=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 6. Tabla publications
    op.create_table(
        'publications',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('institutional_account_id', UUID(as_uuid=True), sa.ForeignKey('institutional_accounts.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('platform_id', UUID(as_uuid=True), sa.ForeignKey('social_platforms.id', ondelete='RESTRICT'), nullable=False, index=True),
        sa.Column('external_post_id', sa.String(100), nullable=False),
        sa.Column('post_url', sa.String(500), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('content_text', sa.Text(), nullable=True),
        sa.Column('media_type', sa.String(50), default='POST', nullable=False),
        sa.Column('is_monitored', sa.Boolean(), default=True, nullable=False),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('platform_id', 'external_post_id', name='uq_platform_external_post_id'),
    )

    # 7. Tabla intermedia campaign_publications (M:N)
    op.create_table(
        'campaign_publications',
        sa.Column('campaign_id', UUID(as_uuid=True), sa.ForeignKey('monitoring_campaigns.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('publication_id', UUID(as_uuid=True), sa.ForeignKey('publications.id', ondelete='CASCADE'), primary_key=True),
    )

    # 8. Tabla monitoring_targets
    op.create_table(
        'monitoring_targets',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('campaign_id', UUID(as_uuid=True), sa.ForeignKey('monitoring_campaigns.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('organizational_unit_id', UUID(as_uuid=True), sa.ForeignKey('organizational_units.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('target_percentage', sa.Float(), default=80.0, nullable=False),
        sa.Column('target_count', sa.Integer(), nullable=True),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('monitoring_targets')
    op.drop_table('campaign_publications')
    op.drop_table('publications')
    op.drop_table('monitoring_campaigns')
    op.drop_table('username_history')
    op.drop_table('social_accounts')
    op.drop_table('institutional_accounts')
    op.drop_table('social_platforms')
