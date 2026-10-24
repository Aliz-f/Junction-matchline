"""Create the BE-02 football, runtime, and moderation persistence tables."""

import sqlalchemy as sa

from alembic import op

revision = "20261024_02"
down_revision = "20261024_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "competitions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("code", sa.String(length=16), nullable=False, unique=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("brand_key", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=8), nullable=False),
    )
    op.create_table(
        "venues",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("coord_verified", sa.Boolean(), nullable=False),
        sa.Column("coord_source", sa.String(length=500)),
    )
    op.create_table(
        "teams",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_id", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("short_name", sa.String(length=80), nullable=False),
        sa.Column("crest_url", sa.String(length=500)),
        sa.UniqueConstraint("provider", "provider_id"),
    )
    op.create_table(
        "seasons",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("competition_id", sa.String(length=36), sa.ForeignKey("competitions.id"), nullable=False),
        sa.Column("start_year", sa.Integer(), nullable=False),
        sa.UniqueConstraint("competition_id", "start_year"),
    )
    op.create_index("ix_seasons_competition_id", "seasons", ["competition_id"])
    op.create_table(
        "matches",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="demo"),
        sa.Column("provider_id", sa.String(length=128), nullable=False),
        sa.Column("competition_id", sa.String(length=36), sa.ForeignKey("competitions.id"), nullable=False),
        sa.Column("season_id", sa.String(length=36), sa.ForeignKey("seasons.id"), nullable=False),
        sa.Column("matchday", sa.Integer()),
        sa.Column("home_team_id", sa.String(length=36), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("away_team_id", sa.String(length=36), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("venue_id", sa.String(length=36), sa.ForeignKey("venues.id")),
        sa.Column("kickoff_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("home_score", sa.Integer()),
        sa.Column("away_score", sa.Integer()),
        sa.Column("capabilities", sa.JSON(), nullable=False),
        sa.UniqueConstraint("provider", "provider_id"),
        sa.CheckConstraint("home_team_id <> away_team_id"),
    )
    op.create_index("ix_matches_competition_id", "matches", ["competition_id"])
    op.create_index("ix_matches_season_id", "matches", ["season_id"])
    op.create_index("ix_matches_home_team_id", "matches", ["home_team_id"])
    op.create_index("ix_matches_away_team_id", "matches", ["away_team_id"])
    op.create_index("ix_matches_kickoff_at", "matches", ["kickoff_at"])
    op.create_table(
        "match_events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("match_id", sa.String(length=36), sa.ForeignKey("matches.id"), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("minute", sa.Integer()),
        sa.Column("team_id", sa.String(length=36), sa.ForeignKey("teams.id")),
        sa.Column("player_name", sa.String(length=160)),
        sa.Column("related_player_name", sa.String(length=160)),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("source_ref", sa.String(length=200), nullable=False),
    )
    op.create_index("ix_match_events_match_id", "match_events", ["match_id"])
    op.create_table(
        "app_runtime_state",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("mode", sa.String(length=16), nullable=False),
        sa.Column("demo_clock_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("demo_epoch", sa.Integer(), nullable=False),
        sa.Column("scenario_name", sa.String(length=32), nullable=False),
        sa.Column("scenario_revision", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "moderation_actions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("message_id", sa.String(length=36), nullable=False),
        sa.Column("operator_identifier", sa.String(length=160), nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("reason", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_moderation_actions_message_id", "moderation_actions", ["message_id"])


def downgrade() -> None:
    op.drop_table("moderation_actions")
    op.drop_table("app_runtime_state")
    op.drop_table("match_events")
    op.drop_table("matches")
    op.drop_table("seasons")
    op.drop_table("teams")
    op.drop_table("venues")
    op.drop_table("competitions")
