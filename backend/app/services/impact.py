"""Pure, deterministic standings and match-impact calculations.

The service consumes persisted snapshot rows.  It deliberately does not infer a
table from fixtures: a score can be trustworthy while the historic standings
needed for a counterfactual are not.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID

from app.schemas.contract import (
    GapEffect,
    ImpactInsight,
    ImpactScenario,
    Outcome,
    SourceReference,
    StandingsRow,
)
from app.services.demo_football import summary


def outcome_for_score(home: int | None, away: int | None) -> Outcome | None:
    if home is None or away is None:
        return None
    if home > away:
        return Outcome.HOME
    if home < away:
        return Outcome.AWAY
    return Outcome.DRAW


def points_for(outcome: Outcome, *, home: bool) -> int:
    if outcome is Outcome.DRAW:
        return 1
    return 3 if (outcome is Outcome.HOME) == home else 0


def validated_rows(raw_rows: list[dict[str, object]]) -> list[StandingsRow]:
    """Use the frozen row shape as the only table input boundary."""
    return [StandingsRow.model_validate(row) for row in raw_rows]


def relevance_for(
    fixture: dict[str, Any], favorite_team_id: str, rows: list[StandingsRow]
) -> tuple[
    Literal["HIGH", "MEDIUM", "LOW", "NONE", "UNKNOWN"],
    Literal["POINTS_GAP", "NONE", "INSUFFICIENT_DATA"],
]:
    if favorite_team_id in (fixture["home_team_id"], fixture["away_team_id"]):
        return "HIGH", "POINTS_GAP"
    points = {str(row.team_id): row.points for row in rows}
    try:
        nearest = min(
            abs(points[favorite_team_id] - points[team_id])
            for team_id in (fixture["home_team_id"], fixture["away_team_id"])
        )
    except KeyError:
        return "UNKNOWN", "INSUFFICIENT_DATA"
    if nearest <= 3:
        return "HIGH", "POINTS_GAP"
    if nearest <= 6:
        return "MEDIUM", "POINTS_GAP"
    if nearest <= 9:
        return "LOW", "POINTS_GAP"
    return "NONE", "NONE"


def _effect(
    fixture: dict[str, Any],
    favorite_id: str,
    affected_id: str,
    outcome: Outcome,
    rows: list[StandingsRow],
    post_rows: list[StandingsRow] | None,
    confirmed: bool,
) -> GapEffect:
    by_team = {str(row.team_id): row for row in rows}
    home_id, away_id = fixture["home_team_id"], fixture["away_team_id"]
    favorite_before = by_team[favorite_id]
    affected_before = by_team[affected_id]
    additions = {
        home_id: points_for(outcome, home=True),
        away_id: points_for(outcome, home=False),
    }
    gap_before = favorite_before.points - affected_before.points
    gap_after = (
        favorite_before.points
        + additions.get(favorite_id, 0)
        - (affected_before.points + additions.get(affected_id, 0))
    )
    position_change: int | None = None
    position_note: str | None = (
        "Position is unavailable without verified tiebreaker outcomes."
    )
    if confirmed and post_rows is not None:
        post_by_team = {str(row.team_id): row for row in post_rows}
        after = post_by_team.get(favorite_id)
        if (
            favorite_before.position is not None
            and after is not None
            and after.position is not None
        ):
            position_change = favorite_before.position - after.position
            position_note = None
    return GapEffect(
        affected_team_id=UUID(affected_id),
        gap_before=gap_before,
        gap_after=gap_after,
        gap_delta=gap_after - gap_before,
        position_change=position_change,
        position_note=position_note,
    )


def impact_insight(
    fixture: dict[str, Any],
    data: dict[str, Any],
    favorite_team_id: str,
    raw_rows: list[dict[str, object]] | None,
    *,
    snapshot_id: str | None = None,
    effective_at: datetime | None = None,
    source_version: str | None = None,
    post_raw_rows: list[dict[str, object]] | None = None,
) -> ImpactInsight:
    """Return all calculable scenarios without fabricating missing rankings."""
    match = summary(fixture, data)
    actual = (
        outcome_for_score(
            fixture.get("score", {}).get("home"), fixture.get("score", {}).get("away")
        )
        if fixture["status"] == "FINISHED"
        else None
    )
    base: dict[str, Any] = dict(
        match_id=match.id,
        match=match,
        favorite_team_id=UUID(favorite_team_id),
        data_version=source_version,
        verified_at=(
            effective_at.astimezone(UTC).isoformat().replace("+00:00", "Z")
            if effective_at
            else None
        ),
        actual_outcome=actual,
        summary_type="TEMPLATE",
    )
    if not raw_rows:
        caveat = "Verified standings snapshots are unavailable for this match."
        return ImpactInsight(
            **base,
            relevance="UNKNOWN",
            basis="INSUFFICIENT_DATA",
            scenarios=[],
            summary="Impact is unresolved because no verified pre-match standings snapshot is available.",
            caveats=[caveat],
            sources=[],
        )
    rows = validated_rows(raw_rows)
    if favorite_team_id not in {str(row.team_id) for row in rows}:
        return ImpactInsight(
            **base,
            relevance="UNKNOWN",
            basis="INSUFFICIENT_DATA",
            scenarios=[],
            summary="Impact is unresolved because the favourite is absent from the verified standings snapshot.",
            caveats=["The selected favourite has no row in the verified snapshot."],
            sources=[],
        )
    relevance, basis = relevance_for(fixture, favorite_team_id, rows)
    post_rows = validated_rows(post_raw_rows) if post_raw_rows else None
    opponents = [
        team
        for team in (fixture["home_team_id"], fixture["away_team_id"])
        if team != favorite_team_id
    ]
    outcomes = [Outcome.HOME, Outcome.DRAW, Outcome.AWAY]
    scenarios: list[ImpactScenario] = []
    for outcome in outcomes:
        confirmed = actual is not None and outcome is actual
        # A completed match exposes exactly its observed scenario plus the two alternatives.
        scenarios.append(
            ImpactScenario(
                outcome=outcome,
                is_hypothetical=not confirmed,
                effects=[
                    _effect(
                        fixture,
                        favorite_team_id,
                        opponent,
                        outcome,
                        rows,
                        post_rows,
                        confirmed,
                    )
                    for opponent in opponents
                ],
            )
        )
    source_refs = (
        [
            SourceReference(
                ref=f"standings:{snapshot_id}",
                label="Verified pre-match standings snapshot",
            )
        ]
        if snapshot_id
        else []
    )
    label = (
        "below the recommendation threshold"
        if relevance == "NONE"
        else "calculated from verified pre-match standings"
    )
    return ImpactInsight(
        **base,
        relevance=relevance,
        basis=basis,
        scenarios=scenarios,
        summary=f"This impact is {label}.",
        caveats=[],
        sources=source_refs,
    )
