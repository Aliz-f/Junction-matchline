"""add room creator metadata for BE-06

Revision ID: 20261024_10
Revises: 20261024_09
"""
from alembic import op
import sqlalchemy as sa

revision = "20261024_10"
down_revision = "20261024_09"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("rooms") as batch:
        batch.add_column(sa.Column("created_by_user_id", sa.String(length=36), nullable=True))
        batch.add_column(sa.Column("created_at", sa.DateTime(timezone=True), nullable=True))
        batch.create_foreign_key("fk_rooms_created_by_user", "users", ["created_by_user_id"], ["id"])
        batch.create_index("ix_rooms_created_by_user_id", ["created_by_user_id"])


def downgrade() -> None:
    with op.batch_alter_table("rooms") as batch:
        batch.drop_index("ix_rooms_created_by_user_id")
        batch.drop_constraint("fk_rooms_created_by_user", type_="foreignkey")
        batch.drop_column("created_at")
        batch.drop_column("created_by_user_id")
