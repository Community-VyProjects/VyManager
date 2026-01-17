import pytest

from fastapi.testclient import TestClient

from app import app


def test_read_root():
    client = TestClient(app)
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["message"] == "VyManager API - Multi-Instance VyOS Management"
    assert data["docs"] == "/docs"
    assert "supported_versions" in data
