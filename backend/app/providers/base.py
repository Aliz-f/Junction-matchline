"""Normalized sports-data provider contract."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


class ProviderDataUnavailable(Exception):
    """Raised when a provider cannot supply a requested normalized datum."""


@dataclass(frozen=True)
class ProviderCapabilities:
    has_events: bool
    has_lineups: bool
    has_player_stats: bool


class SportsDataProvider(ABC):
    capabilities: ProviderCapabilities

    @abstractmethod
    async def list_teams(self, competition_code: str, season_start_year: int) -> list[dict[str, Any]]:
        """Return normalized competition members or raise ProviderDataUnavailable."""

    @abstractmethod
    async def list_matches(self, competition_code: str, season_start_year: int) -> list[dict[str, Any]]:
        """Return normalized fixtures or raise ProviderDataUnavailable."""

    @abstractmethod
    async def get_match(self, match_id: str) -> dict[str, Any]:
        """Return one normalized fixture or raise ProviderDataUnavailable."""

    @abstractmethod
    async def get_standings(self, competition_code: str, season_start_year: int) -> list[dict[str, Any]]:
        """Return a normalized standings snapshot or explicit unavailability."""

    @abstractmethod
    async def get_match_events(self, match_id: str) -> list[dict[str, Any]]:
        """Return provider-supplied events only; never fabricate missing events."""

    @abstractmethod
    async def get_venue(self, venue_id: str) -> dict[str, Any]:
        """Return one normalized venue or raise ProviderDataUnavailable."""

    @abstractmethod
    async def normalized_season(self, competition_code: str, season_start_year: int) -> dict[str, Any]:
        """Return the bounded normalized season projection for legacy read callers."""
