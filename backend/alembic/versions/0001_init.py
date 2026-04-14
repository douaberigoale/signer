"""init

Revision ID: 0001
Revises:
Create Date: 2026-04-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("signature_path", sa.String(), nullable=True),
        sa.Column("signature_uploaded_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("user_settings")
