"""Manifest-backed provider; all returned data is explicitly synthetic."""

from __future__ import annotations

from typing import Any, cast

from app.providers.base import (
    ProviderCapabilities,
    ProviderDataUnavailable,
    SportsDataProvider,
)
from app.seed.loader import load_demo_manifest


class DemoSportsDataProvider(SportsDataProvider):
    capabilities = ProviderCapabilities(has_events=True, has_lineups=False, has_player_stats=False)

    async def normalized_season(self, competition_code: str, season_start_year: int) -> dict[str, Any]:
        manifest = load_demo_manifest()
        competition = manifest["competition"]
        if competition_code != competition["code"] or season_start_year != competition["season_start_year"]:
            raise ProviderDataUnavailable("No synthetic data exists for that competition season")
        return manifest

    async def list_teams(self, competition_code: str, season_start_year: int) -> list[dict[str, Any]]:
        return cast(list[dict[str, Any]], (await self.normalized_season(competition_code, season_start_year))["teams"])

    async def list_matches(self, competition_code: str, season_start_year: int) -> list[dict[str, Any]]:
        return cast(list[dict[str, Any]], (await self.normalized_season(competition_code, season_start_year))["fixtures"])

    async def get_match(self, match_id: str) -> dict[str, Any]:
        fixture = next((item for item in load_demo_manifest()["fixtures"] if item["id"] == match_id), None)
        if fixture is None:
            raise ProviderDataUnavailable("No synthetic fixture exists for this identifier")
        return cast(dict[str, Any], fixture)

    async def get_standings(self, competition_code: str, season_start_year: int) -> list[dict[str, Any]]:
        # The frozen manifest has scenario identifiers but no fabricated table
        # rows. Callers must handle this explicit absence as insufficient data.
        await self.normalized_season(competition_code, season_start_year)
        raise ProviderDataUnavailable("Synthetic standings rows are not available in the frozen manifest")

    async def get_match_events(self, match_id: str) -> list[dict[str, Any]]:
        return cast(list[dict[str, Any]], (await self.get_match(match_id))["events"])

    async def get_venue(self, venue_id: str) -> dict[str, Any]:
        venue = next((item for item in load_demo_manifest()["venues"] if item["id"] == venue_id), None)
        if venue is None:
            raise ProviderDataUnavailable("No synthetic venue exists for this identifier")
        return cast(dict[str, Any], venue)
