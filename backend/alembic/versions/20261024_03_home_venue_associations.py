"""Add verified season home-venue associations."""
import sqlalchemy as sa

from alembic import op

revision = "20261024_03"
down_revision = "20261024_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "season_team_home_venues",
        sa.Column("season_id", sa.String(length=36), sa.ForeignKey("seasons.id"), primary_key=True),
        sa.Column("team_id", sa.String(length=36), sa.ForeignKey("teams.id"), primary_key=True),
        sa.Column("venue_id", sa.String(length=36), sa.ForeignKey("venues.id"), primary_key=True),
        sa.Column("source_ref", sa.String(length=500), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("season_team_home_venues")
