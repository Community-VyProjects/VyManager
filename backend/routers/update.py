"""VyManager update/rollback proxy — delegates Docker operations to the updater sidecar."""
import os

import httpx
from fastapi import APIRouter, HTTPException, Request

from fastapi_permissions import require_super_admin

router = APIRouter(prefix="/vyos/version", tags=["version"])

_UPDATER_URL = os.getenv("UPDATER_URL", "http://updater:8001")


async def _get(path: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{_UPDATER_URL}{path}", timeout=10)
        r.raise_for_status()
        return r.json()


async def _post(path: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{_UPDATER_URL}{path}", timeout=10)
        r.raise_for_status()
        return r.json()


async def _delete(path: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.delete(f"{_UPDATER_URL}{path}", timeout=10)
        r.raise_for_status()
        return r.json()


@router.get("/update/status")
async def get_update_status() -> dict:
    try:
        return await _get("/update/status")
    except Exception:
        return {"phase": "idle", "message": "Updater service unavailable", "error": None}


@router.post("/update/start")
async def start_update(request: Request) -> dict:
    await require_super_admin(request)
    try:
        result = await _post("/update")
    except Exception:
        raise HTTPException(status_code=503, detail="Updater service is not available.")
    if result.get("error") == "already_running":
        raise HTTPException(status_code=409, detail="An update is already in progress.")
    return result


@router.get("/rollback/status")
async def get_rollback_status() -> dict:
    try:
        return await _get("/rollback/status")
    except Exception:
        return {"available": False, "phase": "idle", "message": "Updater service unavailable", "error": None}


@router.post("/rollback/start")
async def start_rollback(request: Request) -> dict:
    await require_super_admin(request)
    try:
        result = await _post("/rollback")
    except Exception:
        raise HTTPException(status_code=503, detail="Updater service is not available.")
    if result.get("error") == "already_running":
        raise HTTPException(status_code=409, detail="A rollback is already in progress.")
    if result.get("error") == "no_rollback_images":
        raise HTTPException(status_code=404, detail="No rollback images found. Run an update first.")
    if result.get("error") == "docker_unavailable":
        raise HTTPException(status_code=503, detail="Docker is not available.")
    return result


@router.delete("/rollback/images")
async def delete_rollback_images(request: Request) -> dict:
    await require_super_admin(request)
    try:
        return await _delete("/rollback/images")
    except Exception:
        raise HTTPException(status_code=503, detail="Updater service is not available.")
