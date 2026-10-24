"""Complete required indexes and durable private-thread lifecycle columns."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20261024_10"
down_revision = "20261024_09"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_matches_competition_season_kickoff", "matches", ["competition_id", "season_id", "kickoff_at"])
    op.create_index("ix_matches_home_kickoff", "matches", ["home_team_id", "kickoff_at"])
    op.create_index("ix_matches_away_kickoff", "matches", ["away_team_id", "kickoff_at"])
    op.create_index("ix_rooms_match_kind", "rooms", ["match_id", "kind"])
    op.create_index("ix_room_messages_room_created", "room_messages", ["room_id", "created_at"])
    with op.batch_alter_table("whatif_threads") as batch:
        batch.add_column(
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP"))
        )
    op.create_index("ix_whatif_threads_user_match_updated", "whatif_threads", ["user_id", "match_id", "updated_at"])
    with op.batch_alter_table("whatif_requests") as batch:
        batch.add_column(sa.Column("client_message_id", sa.String(36), nullable=False))
        batch.add_column(sa.Column("state", sa.String(16), nullable=False, server_default="PENDING"))
        batch.add_column(sa.Column("quota_day_utc", sa.String(10)))
        batch.add_column(sa.Column("lease_owner_id", sa.String(36)))
        batch.add_column(sa.Column("lease_expires_at", sa.DateTime(timezone=True)))
        batch.add_column(sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"))
        batch.add_column(
            sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP"))
        )
        batch.add_column(sa.Column("quota_charged_at", sa.DateTime(timezone=True)))
        batch.create_unique_constraint("uq_whatif_requests_thread_client_message", ["thread_id", "client_message_id"])


def downgrade() -> None:
    with op.batch_alter_table("whatif_requests") as batch:
        batch.drop_constraint("uq_whatif_requests_thread_client_message", type_="unique")
        batch.drop_column("quota_charged_at")
        batch.drop_column("accepted_at")
        batch.drop_column("attempt_count")
        batch.drop_column("lease_expires_at")
        batch.drop_column("lease_owner_id")
        batch.drop_column("quota_day_utc")
        batch.drop_column("state")
        batch.drop_column("client_message_id")
    op.drop_index("ix_whatif_threads_user_match_updated", table_name="whatif_threads")
    with op.batch_alter_table("whatif_threads") as batch:
        batch.drop_column("updated_at")
    op.drop_index("ix_room_messages_room_created", table_name="room_messages")
    op.drop_index("ix_rooms_match_kind", table_name="rooms")
    op.drop_index("ix_matches_away_kickoff", table_name="matches")
    op.drop_index("ix_matches_home_kickoff", table_name="matches")
    op.drop_index("ix_matches_competition_season_kickoff", table_name="matches")
