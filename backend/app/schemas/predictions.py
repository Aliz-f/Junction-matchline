"""Prediction input validation shared by future HTTP and persistence layers."""

from __future__ import annotations

from pydantic import StrictInt, ValidationInfo, field_validator, model_validator

from app.schemas.contract import Outcome, PredictionRequest


class ValidatedPredictionRequest(PredictionRequest):
    home_score: StrictInt | None
    away_score: StrictInt | None

    @field_validator("home_score", "away_score")
    @classmethod
    def scores_are_real_nonnegative_integers(cls, value: int | None, info: ValidationInfo) -> int | None:
        if value is not None and (isinstance(value, bool) or value < 0):
            raise ValueError(f"{info.field_name} must be a nonnegative integer or null")
        return value

    @model_validator(mode="after")
    def scores_are_complete_and_match_outcome(self) -> "ValidatedPredictionRequest":
        if (self.home_score is None) != (self.away_score is None):
            raise ValueError("home_score and away_score must both be null or both be present")
        if self.home_score is None:
            return self
        assert self.away_score is not None
        actual = Outcome.DRAW
        if self.home_score > self.away_score:
            actual = Outcome.HOME
        elif self.home_score < self.away_score:
            actual = Outcome.AWAY
        if actual != self.outcome:
            raise ValueError("scores must imply the requested outcome")
        return self
