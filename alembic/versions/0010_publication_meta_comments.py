"""Métricas agregadas de comentarios Meta en publications

Revision ID: 0010_publication_meta_comments
Revises: 0009_publication_meta_reactions
Create Date: 2026-10-16 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0010_publication_meta_comments'
down_revision: Union[str, None] = '0009_publication_meta_reactions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'publications',
        sa.Column('meta_comments_total', sa.Integer(), nullable=False, server_default='0'),
    )
    try:
        op.execute(
            "COMMENT ON COLUMN publications.meta_comments_total IS "
            "'Total oficial de comentarios reportado por Meta Graph API'"
        )
    except Exception:
        pass


def downgrade() -> None:
    op.drop_column('publications', 'meta_comments_total')
