"""Enforce match status and score-pair consistency."""

from __future__ import annotations

from alembic import op

revision = "20261024_09"
down_revision = "20261024_08"
branch_labels = None
depends_on = None

_STATUS_SCORE_CHECK = (
    "(status IN ('SCHEDULED', 'POSTPONED', 'CANCELLED', 'SUSPENDED', 'UNKNOWN') "
    "AND home_score IS NULL AND away_score IS NULL) OR "
    "(status IN ('LIVE', 'HALFTIME', 'FINISHED') "
    "AND home_score IS NOT NULL AND away_score IS NOT NULL "
    "AND home_score >= 0 AND away_score >= 0)"
)


def upgrade() -> None:
    with op.batch_alter_table("matches") as batch:
        batch.create_check_constraint("ck_matches_status_score_consistency", _STATUS_SCORE_CHECK)


def downgrade() -> None:
    with op.batch_alter_table("matches") as batch:
        batch.drop_constraint("ck_matches_status_score_consistency", type_="check")
