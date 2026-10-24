"""Transactional, manifest-only seeding for the synthetic demo domain."""
from __future__ import annotations

from datetime import datetime
from uuid import uuid5, NAMESPACE_URL

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.football_models import (
    AuditRecord,
    Competition,
    Match,
    MatchEventRecord,
    PredictionRecord,
    PredictionRequestRecord,
    PredictionRevision,
    ProviderSyncRun,
    ReportRecord,
    RoomChangeEvent,
    RoomMessageRecord,
    RoomRecord,
    RuntimeState,
    Season,
    SeasonTeamHomeVenue,
    StandingsSnapshot,
    Team,
    Venue,
    WhatifThreadRecord,
)
from app.seed.loader import load_demo_manifest


def utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


async def seed_demo(session: AsyncSession) -> None:
    """Idempotently replace the BE-02 demo-domain rows from the frozen manifest."""
    manifest = load_demo_manifest()
    # Delete children first: PostgreSQL correctly enforces that a baseline reset
    # cannot leave audit/replay rows attached to replaced synthetic fixtures.
    await session.execute(delete(ReportRecord))
    await session.execute(delete(WhatifThreadRecord))
    await session.execute(delete(RoomMessageRecord))
    await session.execute(delete(RoomChangeEvent))
    await session.execute(delete(RoomRecord))
    await session.execute(delete(PredictionRevision))
    await session.execute(delete(PredictionRequestRecord))
    await session.execute(delete(PredictionRecord))
    await session.execute(delete(AuditRecord))
    await session.execute(delete(ProviderSyncRun))
    await session.execute(delete(SeasonTeamHomeVenue))
    await session.execute(delete(StandingsSnapshot))
    await session.execute(delete(MatchEventRecord))
    await session.execute(delete(Match))
    await session.execute(delete(Season))
    await session.execute(delete(Team))
    await session.execute(delete(Venue))
    await session.execute(delete(Competition))
    competition = manifest["competition"]
    session.add(Competition(id=competition["id"], code=competition["code"], name=competition["name"], brand_key=competition["brand_key"], country_code=competition["country_code"]))
    season_id = str(uuid5(NAMESPACE_URL, f"matchline:{competition['id']}:{competition['season_start_year']}"))
    session.add(Season(id=season_id, competition_id=competition["id"], start_year=competition["season_start_year"]))
    for team in manifest["teams"]:
        session.add(Team(id=team["id"], provider="demo", provider_id=team["id"], name=team["name"], short_name=team["short_name"], crest_url=None))
    for venue in manifest["venues"]:
        session.add(Venue(id=venue["id"], name=venue["name"], lat=venue["lat"], lng=venue["lng"], coord_verified=venue["coord_verified"], coord_source=venue["coord_source"]))
        for team_id in venue["home_team_ids"]:
            session.add(SeasonTeamHomeVenue(season_id=season_id, team_id=team_id, venue_id=venue["id"], source_ref=venue["coord_source"]))
    for fixture in manifest["fixtures"]:
        session.add(Match(id=fixture["id"], provider="demo", provider_id=fixture["id"], competition_id=competition["id"], season_id=season_id, matchday=fixture["matchday"], home_team_id=fixture["home_team_id"], away_team_id=fixture["away_team_id"], venue_id=fixture["venue_id"], kickoff_at=utc(fixture["kickoff_at"]), status=fixture["status"], home_score=fixture["score"]["home"], away_score=fixture["score"]["away"], capabilities=fixture["capabilities"]))
        for event in fixture["events"]:
            session.add(MatchEventRecord(id=event["id"], match_id=fixture["id"], kind=event["kind"], minute=event["minute"], team_id=event["team_id"], player_name=event["player_name"], related_player_name=event["related_player_name"], description="", source_ref=event["source_ref"]))
    for snapshot in manifest["snapshots"]:
        scenario = manifest["scenarios"][snapshot["key"]]
        session.add(StandingsSnapshot(id=snapshot["id"], competition_id=competition["id"], season_id=season_id, effective_at=utc(scenario["server_now_utc"]), source_version=snapshot["key"], table_json=[], is_official=False))
    for room in manifest["rooms"]:
        session.add(
            RoomRecord(
                id=room["id"],
                match_id=room["match_id"],
                kind=room["kind"],
                title=f"System {room['kind']} room",
                status="OPEN",
            )
        )
    state = await session.get(RuntimeState, 1)
    if state is None:
        session.add(RuntimeState(id=1, mode="DEMO", demo_clock_utc=utc(manifest["demo_clock"]), demo_epoch=1, scenario_name="baseline", scenario_revision=1))
    else:
        state.demo_clock_utc = utc(manifest["demo_clock"])
        state.demo_epoch += 1
        state.scenario_name, state.scenario_revision = "baseline", state.scenario_revision + 1
    await session.commit()
