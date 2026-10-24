"""Manifest-backed provider; all returned data is explicitly synthetic."""

from __future__ import annotations

from typing import Any

from app.providers.base import ProviderCapabilities, ProviderDataUnavailable, SportsDataProvider
from app.seed.loader import load_demo_manifest


class DemoSportsDataProvider(SportsDataProvider):
    capabilities = ProviderCapabilities(has_events=True, has_lineups=False, has_player_stats=False)

    async def normalized_season(self, competition_code: str, season_start_year: int) -> dict[str, Any]:
        manifest = load_demo_manifest()
        competition = manifest["competition"]
        if competition_code != competition["code"] or season_start_year != competition["season_start_year"]:
            raise ProviderDataUnavailable("No synthetic data exists for that competition season")
        return manifest
