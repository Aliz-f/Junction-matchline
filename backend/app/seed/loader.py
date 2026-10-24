"""Read the committed BE-00 manifest without mutating it."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, cast

MANIFEST_PATH = Path(__file__).with_name("demo_manifest.json")


@lru_cache
def load_demo_manifest() -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(MANIFEST_PATH.read_text(encoding="utf-8")))


def scenario_data(name: str) -> dict[str, Any]:
    scenarios = load_demo_manifest()["scenarios"]
    if name not in scenarios:
        raise ValueError(f"Unknown demo scenario: {name}")
    return cast(dict[str, Any], scenarios[name])
