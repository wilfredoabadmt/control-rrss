"""Alineación de esquema con los modelos: raw_payload_ref TEXT, columnas parcheadas
en el arranque y tabla social_connector_configs.

Revisión: 0007_schema_alignment
Revisión anterior: 0006_reports_and_dashboards

Motivo:
- interactions.raw_payload_ref se usaba para guardar JSON de auditoría manual y
  desbordaba VARCHAR(255) en PostgreSQL (DataError).
- users.assigned_direction / employees.created_by_user_id / employees.direction_name
  solo se creaban con SQL crudo en el lifespan.
- social_connector_configs no existía en ninguna migración (solo create_all).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '0007_schema_alignment'
down_revision: Union[str, None] = '0006_reports_and_dashboards'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE interactions ALTER COLUMN raw_payload_ref TYPE TEXT")
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_direction VARCHAR(200)")
        op.execute("ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_by_user_id UUID")
        op.execute("ALTER TABLE employees ADD COLUMN IF NOT EXISTS direction_name VARCHAR(200)")
    else:
        with op.batch_alter_table("interactions") as batch_op:
            batch_op.alter_column(
                "raw_payload_ref",
                existing_type=sa.String(length=255),
                type_=sa.Text(),
                existing_nullable=True,
            )

    # Tabla de configuración de conectores (Facebook / TikTok)
    op.create_table(
        "social_connector_configs",
        sa.Column("platform_name", sa.String(length=50), nullable=False),
        sa.Column("target_account_id", sa.String(length=150), nullable=False, server_default=""),
        sa.Column("display_name", sa.String(length=150), nullable=False, server_default=""),
        sa.Column("access_token_encrypted", sa.Text(), nullable=True),
        sa.Column("api_secret_encrypted", sa.Text(), nullable=True),
        sa.Column("api_version", sa.String(length=30), nullable=False, server_default="v26.0"),
        sa.Column("extraction_mode", sa.String(length=50), nullable=False, server_default="OFFICIAL_API"),
        sa.Column("rate_limit_per_minute", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("max_posts_per_sync", sa.Integer(), nullable=False, server_default="25"),
        sa.Column("max_comments_per_post", sa.Integer(), nullable=False, server_default="200"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_status", sa.String(length=50), nullable=False, server_default="CONFIGURED"),
        sa.Column("status_message", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_social_connector_configs_platform_name",
        "social_connector_configs",
        ["platform_name"],
        unique=True,
    )

    # Índices y FK declarados en los modelos pero ausentes en 0003
    op.create_index("ix_employees_created_by_user_id", "employees", ["created_by_user_id"])
    op.create_index("ix_employees_direction_name", "employees", ["direction_name"])
    op.create_foreign_key(
        "fk_employees_created_by_user_id",
        "employees",
        "users",
        ["created_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_employees_created_by_user_id", "employees", type_="foreignkey")
    op.drop_index("ix_employees_direction_name", table_name="employees")
    op.drop_index("ix_employees_created_by_user_id", table_name="employees")
    op.drop_index("ix_social_connector_configs_platform_name", table_name="social_connector_configs")
    op.drop_table("social_connector_configs")
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE interactions ALTER COLUMN raw_payload_ref TYPE VARCHAR(255)")
        op.execute("ALTER TABLE users DROP COLUMN IF EXISTS assigned_direction")
        op.execute("ALTER TABLE employees DROP COLUMN IF EXISTS created_by_user_id")
        op.execute("ALTER TABLE employees DROP COLUMN IF EXISTS direction_name")
