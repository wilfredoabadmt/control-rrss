"""IAM and Audit tables

Revision ID: 0002_iam_and_audit
Revises: 0001_initial
Create Date: 2026-09-17 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = '0002_iam_and_audit'
down_revision: Union[str, None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tabla roles
    op.create_table(
        'roles',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('description', sa.String(255), nullable=False),
        sa.Column('is_system', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 2. Tabla permissions
    op.create_table(
        'permissions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('code', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('description', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 3. Tabla role_permissions (M:N)
    op.create_table(
        'role_permissions',
        sa.Column('role_id', UUID(as_uuid=True), sa.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('permission_id', UUID(as_uuid=True), sa.ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True),
    )

    # 4. Tabla users
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('full_name', sa.String(150), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('failed_login_attempts', sa.Integer(), default=0, nullable=False),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 5. Tabla user_roles (M:N)
    op.create_table(
        'user_roles',
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('role_id', UUID(as_uuid=True), sa.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    )

    # 6. Tabla audit_events (Append-only)
    op.create_table(
        'audit_events',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('timestamp_utc', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('user_id', sa.String(36), nullable=True, index=True),
        sa.Column('user_email', sa.String(255), nullable=True, index=True),
        sa.Column('action', sa.String(50), nullable=False, index=True),
        sa.Column('entity_name', sa.String(100), nullable=False, index=True),
        sa.Column('entity_id', sa.String(100), nullable=True, index=True),
        sa.Column('previous_state', sa.JSON(), nullable=True),
        sa.Column('new_state', sa.JSON(), nullable=True),
        sa.Column('correlation_id', sa.String(64), nullable=False, index=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(255), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
    )

    # Índices específicos de auditoría
    op.create_index('idx_audit_correlation', 'audit_events', ['correlation_id'])
    op.create_index('idx_audit_temporal', 'audit_events', ['timestamp_utc', 'entity_name'])

    # 7. Trigger de inmutabilidad en PostgreSQL (Principio X)
    op.execute("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'prevent_audit_mutation') THEN
            NULL;
        ELSE
            CREATE FUNCTION prevent_audit_mutation()
            RETURNS TRIGGER AS $func$
            BEGIN
                RAISE EXCEPTION 'audit_events table is append-only. UPDATE and DELETE are prohibited.';
            END;
            $func$ LANGUAGE plpgsql;
        END IF;
    END $$;
    """)

    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_no_update') THEN
            CREATE TRIGGER trg_audit_no_update
            BEFORE UPDATE OR DELETE ON audit_events
            FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
        END IF;
    END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_events;")
    op.execute("DROP FUNCTION IF EXISTS prevent_audit_mutation();")
    op.drop_index('idx_audit_temporal', table_name='audit_events')
    op.drop_index('idx_audit_correlation', table_name='audit_events')
    op.drop_table('audit_events')
    op.drop_table('user_roles')
    op.drop_table('users')
    op.drop_table('role_permissions')
    op.drop_table('permissions')
    op.drop_table('roles')
