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
    async def normalized_season(self, competition_code: str, season_start_year: int) -> dict[str, Any]:
        """Return provider-neutral normalized data or raise ProviderDataUnavailable."""
