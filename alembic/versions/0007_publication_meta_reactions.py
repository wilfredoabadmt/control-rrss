"""Métricas agregadas de reacciones Meta en publications

La Graph API de Meta no expone las identidades de quienes reaccionan; sólo entrega
conteos agregados (/reactions?summary=total_count y /insights). Estas columnas
almacenan ese conteo institucional verificable sin inventar datos.

Revision ID: 0007_publication_meta_reactions
Revises: 0006_reports_and_dashboards
Create Date: 2026-10-07 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0007_publication_meta_reactions'
down_revision: Union[str, None] = '0006_reports_and_dashboards'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'publications',
        sa.Column('meta_reactions_total', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column(
        'publications',
        sa.Column('meta_reactions_by_type', sa.JSON(), nullable=False, server_default='{}'),
    )
    op.add_column(
        'publications',
        sa.Column('meta_metrics_synced_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('publications', 'meta_metrics_synced_at')
    op.drop_column('publications', 'meta_reactions_by_type')
    op.drop_column('publications', 'meta_reactions_total')
