"""Enforce prediction score direction at the database boundary."""

from __future__ import annotations

from alembic import op

revision = "20261024_07"
down_revision = "20261024_06"
branch_labels = None
depends_on = None

_DIRECTION_CHECK = (
    "(home_score IS NULL AND away_score IS NULL) OR "
    "(outcome = 'HOME' AND home_score > away_score) OR "
    "(outcome = 'DRAW' AND home_score = away_score) OR "
    "(outcome = 'AWAY' AND home_score < away_score)"
)


def upgrade() -> None:
    with op.batch_alter_table("predictions") as batch:
        batch.create_check_constraint("ck_predictions_score_direction", _DIRECTION_CHECK)


def downgrade() -> None:
    with op.batch_alter_table("predictions") as batch:
        batch.drop_constraint("ck_predictions_score_direction", type_="check")
