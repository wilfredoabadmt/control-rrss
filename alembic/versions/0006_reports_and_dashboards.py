"""Report executions table

Revision ID: 0006_reports_and_dashboards
Revises: 0005_interactions_and_verifications
Create Date: 2026-09-17 23:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = '0006_reports_and_dashboards'
down_revision: Union[str, None] = '0005_interactions_and_verifications'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'report_executions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('report_type', sa.String(50), nullable=False, index=True),
        sa.Column('report_version', sa.String(20), default='1.0', nullable=False),
        sa.Column('requested_by_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('generated_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('parameters', sa.JSON(), nullable=False),
        sa.Column('file_hash', sa.String(64), nullable=True, index=True),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('row_count', sa.Integer(), default=0, nullable=False),
        sa.Column('status', sa.String(30), default='COMPLETED', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('report_executions')
