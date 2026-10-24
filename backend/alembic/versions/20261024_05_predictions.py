"""Add BE-02 prediction persistence and immutable replay audit tables."""
import sqlalchemy as sa
from alembic import op

revision = "20261024_05"
down_revision = "20261024_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("predictions", sa.Column("id", sa.String(36), primary_key=True), sa.Column("match_id", sa.String(36), sa.ForeignKey("matches.id"), nullable=False), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("outcome", sa.String(8), nullable=False), sa.Column("home_score", sa.Integer()), sa.Column("away_score", sa.Integer()), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False), sa.Column("status", sa.String(16), nullable=False), sa.Column("points", sa.Integer()), sa.UniqueConstraint("match_id", "user_id"), sa.CheckConstraint("(home_score IS NULL AND away_score IS NULL) OR (home_score >= 0 AND away_score >= 0)"))
    op.create_table("prediction_revisions", sa.Column("id", sa.String(36), primary_key=True), sa.Column("prediction_id", sa.String(36), sa.ForeignKey("predictions.id"), nullable=False), sa.Column("revision", sa.Integer(), nullable=False), sa.Column("payload_json", sa.JSON(), nullable=False), sa.Column("idempotency_key", sa.String(36), nullable=False), sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False), sa.UniqueConstraint("prediction_id", "revision"), sa.UniqueConstraint("prediction_id", "idempotency_key"))
    op.create_table("prediction_requests", sa.Column("id", sa.String(36), primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("match_id", sa.String(36), sa.ForeignKey("matches.id"), nullable=False), sa.Column("idempotency_key", sa.String(36), nullable=False), sa.Column("request_hash", sa.String(64), nullable=False), sa.Column("response_status", sa.Integer(), nullable=False), sa.Column("response_snapshot_json", sa.JSON(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.UniqueConstraint("user_id", "match_id", "idempotency_key"))


def downgrade() -> None:
    op.drop_table("prediction_requests")
    op.drop_table("prediction_revisions")
    op.drop_table("predictions")
