"""Add BE-02 standings, room-change, and provider audit support."""
import sqlalchemy as sa
from alembic import op

revision = "20261024_04"
down_revision = "20261024_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("standings_snapshots", sa.Column("id", sa.String(36), primary_key=True), sa.Column("competition_id", sa.String(36), sa.ForeignKey("competitions.id"), nullable=False), sa.Column("season_id", sa.String(36), sa.ForeignKey("seasons.id"), nullable=False), sa.Column("effective_at", sa.DateTime(timezone=True), nullable=False), sa.Column("source_version", sa.String(128), nullable=False), sa.Column("table_json", sa.JSON(), nullable=False), sa.Column("is_official", sa.Boolean(), nullable=False))
    op.create_table("room_change_events", sa.Column("id", sa.String(36), primary_key=True), sa.Column("room_id", sa.String(36), nullable=False), sa.Column("seq", sa.Integer(), nullable=False), sa.Column("kind", sa.String(16), nullable=False), sa.Column("message_id", sa.String(36), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.UniqueConstraint("room_id", "seq"))
    op.create_table("provider_sync_runs", sa.Column("id", sa.String(36), primary_key=True), sa.Column("provider", sa.String(32), nullable=False), sa.Column("started_at", sa.DateTime(timezone=True), nullable=False), sa.Column("finished_at", sa.DateTime(timezone=True)), sa.Column("status", sa.String(32), nullable=False), sa.Column("records_processed", sa.Integer(), nullable=False), sa.Column("error_message", sa.String(500)))


def downgrade() -> None:
    op.drop_table("provider_sync_runs")
    op.drop_table("room_change_events")
    op.drop_table("standings_snapshots")
