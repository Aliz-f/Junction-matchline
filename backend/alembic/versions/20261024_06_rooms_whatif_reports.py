"""Add BE-02 room, private-thread, and report persistence."""
import sqlalchemy as sa
from alembic import op

revision = "20261024_06"
down_revision = "20261024_05"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("rooms", sa.Column("id", sa.String(36), primary_key=True), sa.Column("match_id", sa.String(36), sa.ForeignKey("matches.id"), nullable=False), sa.Column("kind", sa.String(16), nullable=False), sa.Column("title", sa.String(200), nullable=False), sa.Column("status", sa.String(16), nullable=False))
    op.create_table("room_messages", sa.Column("id", sa.String(36), primary_key=True), sa.Column("room_id", sa.String(36), sa.ForeignKey("rooms.id"), nullable=False), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("body", sa.String(2000), nullable=False), sa.Column("moderation_state", sa.String(16), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("whatif_threads", sa.Column("id", sa.String(36), primary_key=True), sa.Column("match_id", sa.String(36), sa.ForeignKey("matches.id"), nullable=False), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("title", sa.String(200)), sa.Column("visibility", sa.String(16), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("reports", sa.Column("id", sa.String(36), primary_key=True), sa.Column("reporter_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("target_kind", sa.String(32), nullable=False), sa.Column("target_id", sa.String(36), nullable=False), sa.Column("reason", sa.String(500), nullable=False), sa.Column("status", sa.String(16), nullable=False))


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("whatif_threads")
    op.drop_table("room_messages")
    op.drop_table("rooms")
