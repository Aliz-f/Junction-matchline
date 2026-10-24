"""add prediction lock and settlement timestamps for BE-07

Revision ID: 20261024_11
Revises: 20261024_10
"""
import sqlalchemy as sa

from alembic import op

revision = "20261024_11"
down_revision = "20261024_10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("predictions") as batch:
        batch.add_column(sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("scored_at", sa.DateTime(timezone=True), nullable=True))
        batch.create_index("ix_predictions_scored_at", ["scored_at"])


def downgrade() -> None:
    with op.batch_alter_table("predictions") as batch:
        batch.drop_index("ix_predictions_scored_at")
        batch.drop_column("scored_at")
        batch.drop_column("locked_at")
