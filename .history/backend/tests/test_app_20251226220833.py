import pytest

from httpx import AsyncClient

from app import app


@pytest.mark.asyncio
async def test_read_root():
    async with AsyncClient(base_url="http://test", app=app) as ac:
        r = await ac.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["message"] == "VyManager API - Multi-Instance VyOS Management"
    assert data["docs"] == "/docs"
    assert "supported_versions" in data
