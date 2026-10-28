"""slot template_id on delete set null

Revision ID: 9f11f013ce8d
Revises: 12f2e7f0695a
Create Date: 2026-10-28 23:14:30.828648

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f11f013ce8d'
down_revision: Union[str, Sequence[str], None] = '12f2e7f0695a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Слот переживает удаление шаблона: template_id обнуляется."""
    op.drop_constraint("slot_template_id_fkey", "slot", type_="foreignkey")
    op.create_foreign_key(
        "slot_template_id_fkey", "slot", "schedule_template", ["template_id"], ["id"], ondelete="SET NULL"
    )


def downgrade() -> None:
    op.drop_constraint("slot_template_id_fkey", "slot", type_="foreignkey")
    op.create_foreign_key(
        "slot_template_id_fkey", "slot", "schedule_template", ["template_id"], ["id"]
    )
