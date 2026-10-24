import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from scripts.validate_fixtures import validate


def test_be00_fixture_contract_validates() -> None:
    manifest_hash, edge_hash = validate()
    assert len(manifest_hash) == len(edge_hash) == 64


def test_route_catalogue_is_under_api_v1() -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/health" in paths
    assert all(path.startswith("/api/v1/") for path in paths)
    for path, method in (
        ("/api/v1/auth/register", "post"),
        ("/api/v1/auth/login", "post"),
        ("/api/v1/matches/{id}/predictions", "post"),
        ("/api/v1/whatif/threads/{thread_id}/messages", "post"),
    ):
        assert "requestBody" in paths[path][method]
