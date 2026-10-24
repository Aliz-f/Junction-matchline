"""add durable private What-if lifecycle fields for BE-08

Revision ID: 20261024_12
Revises: 20261024_11
"""

import sqlalchemy as sa
from alembic import op

revision = "20261024_12"
down_revision = "20261024_11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("whatif_threads") as batch:
        batch.add_column(
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True)
        )
    with op.batch_alter_table("whatif_messages") as batch:
        batch.add_column(
            sa.Column("client_message_id", sa.String(length=36), nullable=True)
        )
        batch.add_column(
            sa.Column("delivery_state", sa.String(length=16), nullable=True)
        )
        batch.add_column(sa.Column("analysis_json", sa.JSON(), nullable=True))
        batch.create_index(
            "ix_whatif_messages_client_message_id", ["client_message_id"]
        )
    with op.batch_alter_table("whatif_requests") as batch:
        batch.add_column(
            sa.Column("quota_day_utc", sa.String(length=10), nullable=True)
        )
        batch.add_column(sa.Column("state", sa.String(length=16), nullable=True))
        batch.add_column(
            sa.Column("user_message_id", sa.String(length=36), nullable=True)
        )
        batch.add_column(sa.Column("lease_owner", sa.String(length=64), nullable=True))
        batch.add_column(
            sa.Column("lease_expires_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch.add_column(sa.Column("attempts", sa.Integer(), nullable=True))
        batch.add_column(
            sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch.create_foreign_key(
            "fk_whatif_requests_user_message",
            "whatif_messages",
            ["user_message_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("whatif_requests") as batch:
        batch.drop_constraint("fk_whatif_requests_user_message", type_="foreignkey")
        for column in (
            "next_retry_at",
            "attempts",
            "lease_expires_at",
            "lease_owner",
            "user_message_id",
            "state",
            "quota_day_utc",
        ):
            batch.drop_column(column)
    with op.batch_alter_table("whatif_messages") as batch:
        batch.drop_index("ix_whatif_messages_client_message_id")
        batch.drop_column("analysis_json")
        batch.drop_column("delivery_state")
        batch.drop_column("client_message_id")
    with op.batch_alter_table("whatif_threads") as batch:
        batch.drop_column("updated_at")
