"""Normalized demo-provider capability and missing-data behavior."""
from __future__ import annotations

import pytest

from app.providers.base import ProviderDataUnavailable
from app.providers.demo import DemoSportsDataProvider


@pytest.mark.asyncio
async def test_demo_provider_normalizes_manifest_records_and_capabilities() -> None:
    provider = DemoSportsDataProvider()
    teams = await provider.list_teams("PL", 2026)
    match = await provider.get_match("30000000-0000-4000-8000-000000000003")
    events = await provider.get_match_events(match["id"])
    venue = await provider.get_venue(match["venue_id"])

    assert provider.capabilities.has_events is True
    assert provider.capabilities.has_lineups is False
    assert {item["id"] for item in teams}
    assert events[0]["source_ref"].startswith("EVENT:")
    assert venue["coord_verified"] is True


@pytest.mark.asyncio
async def test_demo_provider_exposes_missing_standings_as_explicit_unavailability() -> None:
    with pytest.raises(ProviderDataUnavailable):
        await DemoSportsDataProvider().get_standings("PL", 2026)
