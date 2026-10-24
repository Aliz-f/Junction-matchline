"""Read the committed BE-00 manifest without mutating it."""

from __future__ import annotations

import json
from copy import deepcopy
from functools import lru_cache
from pathlib import Path
from typing import Any, cast

MANIFEST_PATH = Path(__file__).with_name("demo_manifest.json")


@lru_cache
def _cached_demo_manifest() -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(MANIFEST_PATH.read_text(encoding="utf-8")))


def load_demo_manifest() -> dict[str, Any]:
    """Return an isolated manifest copy so callers/tests cannot alter the seed source."""
    return deepcopy(_cached_demo_manifest())


def scenario_data(name: str) -> dict[str, Any]:
    scenarios = load_demo_manifest()["scenarios"]
    if name not in scenarios:
        raise ValueError(f"Unknown demo scenario: {name}")
    return cast(dict[str, Any], scenarios[name])
