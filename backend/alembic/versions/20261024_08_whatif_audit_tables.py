"""Add BE-02 private What-if and badge audit-table foundations."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20261024_08"
down_revision = "20261024_07"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "whatif_messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("thread_id", sa.String(36), sa.ForeignKey("whatif_threads.id"), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("body", sa.String(4000), nullable=False),
        sa.Column("evidence_refs_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_whatif_messages_thread_id", "whatif_messages", ["thread_id"])
    op.create_table(
        "whatif_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("thread_id", sa.String(36), sa.ForeignKey("whatif_threads.id"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("idempotency_key", sa.String(36), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("reservation_active", sa.Boolean(), nullable=False),
        sa.Column("response_status", sa.Integer()),
        sa.Column("response_snapshot_json", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("thread_id", "idempotency_key"),
    )
    op.create_index("ix_whatif_requests_thread_id", "whatif_requests", ["thread_id"])
    op.create_index("ix_whatif_requests_user_id", "whatif_requests", ["user_id"])
    op.create_table(
        "ai_daily_quotas",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("quota_date_utc", sa.String(10), nullable=False),
        sa.Column("reserved_count", sa.Integer(), nullable=False),
        sa.Column("completed_count", sa.Integer(), nullable=False),
        sa.UniqueConstraint("user_id", "quota_date_utc"),
    )
    op.create_index("ix_ai_daily_quotas_user_id", "ai_daily_quotas", ["user_id"])
    op.create_table(
        "user_badges",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("badge_code", sa.String(64), nullable=False),
        sa.Column("earned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("evidence_json", sa.JSON(), nullable=False),
        sa.UniqueConstraint("user_id", "badge_code"),
    )
    op.create_index("ix_user_badges_user_id", "user_badges", ["user_id"])
    with op.batch_alter_table("reports") as batch:
        batch.add_column(
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            )
        )
        batch.alter_column("created_at", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("reports") as batch:
        batch.drop_column("created_at")
    op.drop_table("user_badges")
    op.drop_table("ai_daily_quotas")
    op.drop_table("whatif_requests")
    op.drop_table("whatif_messages")
