"""Interfaces invoked inside a manifest-backed demo scenario transaction.

BE-02 owns the transaction boundary and hook contract. Prediction settlement is
deliberately implemented by BE-07, so the default hook is a no-op rather than a
premature scoring implementation.
"""
from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.predictions import settle_finished_predictions


class DemoTransitionHook(Protocol):
    async def after_transition(
        self, session: AsyncSession, scenario_name: str, transitioned_match_ids: Sequence[str]
    ) -> None: ...


class NoopDemoTransitionHook:
    async def after_transition(
        self, session: AsyncSession, scenario_name: str, transitioned_match_ids: Sequence[str]
    ) -> None:
        del session, scenario_name, transitioned_match_ids


class PredictionSettlementHook:
    """BE-07 hook used by the demo CLI so status/score transition and scoring commit together."""
    async def after_transition(
        self, session: AsyncSession, scenario_name: str, transitioned_match_ids: Sequence[str]
    ) -> None:
        if scenario_name == "upcoming_finished":
            await settle_finished_predictions(session, list(transitioned_match_ids))
