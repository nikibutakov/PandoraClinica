"""medical record ticket id

Revision ID: ea6783ee8253
Revises: 9f11f013ce8d
Create Date: 2026-10-28 23:18:33.196253

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ea6783ee8253'
down_revision: Union[str, Sequence[str], None] = '9f11f013ce8d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'medical_record',
        sa.Column('ticket_id', sa.Integer(), nullable=True, comment='Талон, по которому состоялся приём'),
    )
    op.create_unique_constraint('medical_record_ticket_id_key', 'medical_record', ['ticket_id'])
    op.create_foreign_key('medical_record_ticket_id_fkey', 'medical_record', 'ticket', ['ticket_id'], ['id'])
    op.alter_column('slot', 'template_id',
               existing_type=sa.INTEGER(),
               comment='NULL — слот создан вручную (или шаблон удалён)',
               existing_nullable=True)


def downgrade() -> None:
    op.drop_constraint('medical_record_ticket_id_fkey', 'medical_record', type_='foreignkey')
    op.drop_constraint('medical_record_ticket_id_key', 'medical_record', type_='unique')
    op.drop_column('medical_record', 'ticket_id')
    op.alter_column('slot', 'template_id',
               existing_type=sa.INTEGER(),
               comment='NULL — слот создан вручную',
               existing_nullable=True)
