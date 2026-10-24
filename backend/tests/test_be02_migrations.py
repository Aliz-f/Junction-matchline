"""Executable Alembic chain smoke test.

The deployment CI runs the same chain against PostgreSQL. This test preserves a
fast local upgrade/downgrade guard without requiring a running service.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def test_alembic_upgrade_downgrade_round_trip(tmp_path: Path) -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    database_path = (tmp_path / "migrations.db").as_posix()
    environment = {
        **os.environ,
        "APP_ENV": "test",
        "DATABASE_URL": f"sqlite+pysqlite:///{database_path}",
    }
    for command in (("upgrade", "head"), ("downgrade", "base"), ("upgrade", "head")):
        result = subprocess.run(
            [sys.executable, "-m", "alembic", *command],
            cwd=backend_dir,
            env=environment,
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode == 0, result.stdout + result.stderr
