import pytest

from httpx import AsyncClient

from app import app


@pytest.mark.asyncio
async def test_read_root():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/")
    assert r.status_code == 200
    assert r.json() == {"message": "Hello from FastAPI"}


@pytest.mark.asyncio
async def test_create_and_get_item():
    item = {"id": 1, "name": "foo", "description": "bar"}
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.post("/items/", json=item)
        assert r.status_code == 201
        assert r.json() == item

        r2 = await ac.get("/items/1")
        assert r2.status_code == 200
        assert r2.json() == item


@pytest.mark.asyncio
async def test_get_missing_item():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/items/999")
    assert r.status_code == 404
