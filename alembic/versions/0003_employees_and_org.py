"""Employees, Organizational Units, Positions and Employee History tables

Revision ID: 0003_employees_and_org
Revises: 0002_iam_and_audit
Create Date: 2026-09-17 21:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = '0003_employees_and_org'
down_revision: Union[str, None] = '0002_iam_and_audit'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tabla organizational_units
    op.create_table(
        'organizational_units',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('code', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('parent_id', UUID(as_uuid=True), sa.ForeignKey('organizational_units.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(20), default='ACTIVE', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 2. Tabla positions
    op.create_table(
        'positions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(150), nullable=False),
        sa.Column('code', sa.String(50), unique=True, nullable=True, index=True),
        sa.Column('status', sa.String(20), default='ACTIVE', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 3. Tabla employees
    op.create_table(
        'employees',
        sa.Column('employee_id', sa.String(50), primary_key=True, nullable=False),
        sa.Column('document_number_encrypted', sa.Text(), nullable=False),
        sa.Column('document_hash', sa.String(64), nullable=False, index=True),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('organizational_unit_id', UUID(as_uuid=True), sa.ForeignKey('organizational_units.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('position_id', UUID(as_uuid=True), sa.ForeignKey('positions.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('status', sa.String(30), default='ACTIVE', nullable=False, index=True),
        sa.Column('hire_date', sa.Date(), nullable=True),
        sa.Column('termination_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 4. Tabla employee_history
    op.create_table(
        'employee_history',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('employee_id', sa.String(50), sa.ForeignKey('employees.employee_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('previous_organizational_unit_id', UUID(as_uuid=True), nullable=True),
        sa.Column('new_organizational_unit_id', UUID(as_uuid=True), nullable=True),
        sa.Column('previous_position_id', UUID(as_uuid=True), nullable=True),
        sa.Column('new_position_id', UUID(as_uuid=True), nullable=True),
        sa.Column('previous_status', sa.String(30), nullable=True),
        sa.Column('new_status', sa.String(30), nullable=True),
        sa.Column('effective_date', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('change_reason', sa.String(255), nullable=True),
        sa.Column('recorded_by_user_id', sa.String(36), nullable=True),
        sa.Column('correlation_id', sa.String(64), nullable=False, index=True),
    )


def downgrade() -> None:
    op.drop_table('employee_history')
    op.drop_table('employees')
    op.drop_table('positions')
    op.drop_table('organizational_units')
