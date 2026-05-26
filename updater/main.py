"""
VyManager Updater Sidecar

Handles Docker operations for self-update and rollback.
Only reachable from the internal Docker network — no authentication needed.
"""
import asyncio
import logging
import os
from enum import Enum
from typing import Optional

import docker
from docker.errors import DockerException, NotFound, ImageNotFound
from fastapi import FastAPI

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

SIMULATE = os.getenv("SIMULATE", "false").lower() == "true"

app = FastAPI(title="VyManager Updater", docs_url=None, redoc_url=None)

_FRONTEND_IMAGE     = "ghcr.io/community-vyprojects/vymanager-frontend"
_BACKEND_IMAGE      = "ghcr.io/community-vyprojects/vymanager-backend"
_IMAGE_TAG          = "beta"
_ROLLBACK_TAG       = "rollback"
_BACKEND_CONTAINER  = "vymanager-backend"
_FRONTEND_CONTAINER = "vymanager-frontend"


class Phase(str, Enum):
    idle             = "idle"
    pulling_frontend = "pulling_frontend"
    pulling_backend  = "pulling_backend"
    applying         = "applying"
    rolling_back     = "rolling_back"
    complete         = "complete"
    error            = "error"


# Update state
_update_lock    = asyncio.Lock()
_update_phase   : Phase         = Phase.idle
_update_message : str           = "No update in progress"
_update_error   : Optional[str] = None

# Rollback state
_rollback_lock    = asyncio.Lock()
_rollback_phase   : Phase         = Phase.idle
_rollback_message : str           = "No rollback in progress"
_rollback_error   : Optional[str] = None


# ---------------------------------------------------------------------------
# Update endpoints
# ---------------------------------------------------------------------------

@app.get("/update/status")
async def get_update_status() -> dict:
    return {"phase": _update_phase, "message": _update_message, "error": _update_error}


@app.post("/update")
async def start_update() -> dict:
    global _update_phase
    async with _update_lock:
        if _update_phase in (Phase.pulling_frontend, Phase.pulling_backend, Phase.applying):
            return {"error": "already_running"}
        _update_phase = Phase.pulling_frontend
    asyncio.create_task(_run_update())
    return {"message": "started"}


# ---------------------------------------------------------------------------
# Rollback endpoints
# ---------------------------------------------------------------------------

@app.get("/rollback/status")
async def get_rollback_status() -> dict:
    if SIMULATE:
        available = True
    else:
        try:
            client = docker.from_env()
            available = _rollback_images_exist(client)
        except Exception:
            available = False
    return {
        "available": available,
        "phase": _rollback_phase,
        "message": _rollback_message,
        "error": _rollback_error,
    }


@app.post("/rollback")
async def start_rollback() -> dict:
    global _rollback_phase
    try:
        client = docker.from_env()
    except DockerException:
        return {"error": "docker_unavailable"}

    if not _rollback_images_exist(client):
        return {"error": "no_rollback_images"}

    async with _rollback_lock:
        if _rollback_phase == Phase.rolling_back:
            return {"error": "already_running"}
        _rollback_phase = Phase.rolling_back

    asyncio.create_task(_run_rollback(client))
    return {"message": "started"}


@app.delete("/rollback/images")
async def delete_rollback_images() -> dict:
    try:
        client = docker.from_env()
        removed = []
        for image_name in (_FRONTEND_IMAGE, _BACKEND_IMAGE):
            try:
                client.images.remove(f"{image_name}:{_ROLLBACK_TAG}", force=True)
                removed.append(image_name)
            except ImageNotFound:
                pass
        return {"removed": removed}
    except DockerException as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# Docker helpers
# ---------------------------------------------------------------------------

def _rollback_images_exist(client) -> bool:
    try:
        client.images.get(f"{_FRONTEND_IMAGE}:{_ROLLBACK_TAG}")
        client.images.get(f"{_BACKEND_IMAGE}:{_ROLLBACK_TAG}")
        return True
    except Exception:
        return False


def _tag_for_rollback(client) -> None:
    for container_name, image_name in (
        (_FRONTEND_CONTAINER, _FRONTEND_IMAGE),
        (_BACKEND_CONTAINER,  _BACKEND_IMAGE),
    ):
        try:
            c = client.containers.get(container_name)
            img = client.images.get(c.attrs["Image"])
            img.tag(image_name, tag=_ROLLBACK_TAG)
            logger.info("Tagged %s as :%s", image_name, _ROLLBACK_TAG)
        except Exception as exc:
            logger.warning("Could not tag %s for rollback: %s", container_name, exc)


def _get_working_dir(client) -> Optional[str]:
    try:
        be = client.containers.get(_BACKEND_CONTAINER)
        return be.labels.get("com.docker.compose.project.working_dir")
    except NotFound:
        return None


def _compose_recreate(client, working_dir: str, tag: str) -> None:
    override = (
        "services:\\n"
        f"  frontend:\\n    image: {_FRONTEND_IMAGE}:{tag}\\n"
        f"  backend:\\n    image: {_BACKEND_IMAGE}:{tag}\\n"
    )
    cmd = (
        f"sleep 5 && "
        f"printf '{override}' > /tmp/dc-override.yml && "
        f"cd '{working_dir}' && "
        f"docker compose -f docker-compose.yml -f /tmp/dc-override.yml up -d --force-recreate 2>&1 && "
        f"rm -f /tmp/dc-override.yml"
    )
    client.containers.run(
        "docker:cli",
        command=["sh", "-c", cmd],
        volumes={
            "/var/run/docker.sock": {"bind": "/var/run/docker.sock", "mode": "rw"},
            working_dir: {"bind": working_dir, "mode": "ro"},
        },
        working_dir=working_dir,
        remove=True,
        detach=True,
    )


# ---------------------------------------------------------------------------
# Async tasks
# ---------------------------------------------------------------------------

async def _run_update() -> None:
    global _update_phase, _update_message, _update_error
    try:
        if SIMULATE:
            await asyncio.sleep(2)
            _update_phase, _update_message = Phase.pulling_frontend, "Pulling frontend image..."
            await asyncio.sleep(3)
            _update_phase, _update_message = Phase.pulling_backend, "Pulling backend image..."
            await asyncio.sleep(3)
            _update_phase, _update_message = Phase.applying, "Applying update — containers are restarting..."
            await asyncio.sleep(2)
            _update_phase, _update_message = Phase.complete, "Update applied. Services are restarting."
            return

        loop = asyncio.get_event_loop()
        client = docker.from_env()
        await loop.run_in_executor(None, lambda: _tag_for_rollback(client))

        _update_phase, _update_message = Phase.pulling_frontend, "Pulling frontend image..."
        await loop.run_in_executor(None, lambda: client.images.pull(_FRONTEND_IMAGE, tag=_IMAGE_TAG))

        _update_phase, _update_message = Phase.pulling_backend, "Pulling backend image..."
        await loop.run_in_executor(None, lambda: client.images.pull(_BACKEND_IMAGE, tag=_IMAGE_TAG))

        _update_phase, _update_message = Phase.applying, "Applying update — containers are restarting..."
        working_dir = _get_working_dir(client)
        if not working_dir:
            raise RuntimeError("Cannot determine compose working directory from container labels.")
        await loop.run_in_executor(None, lambda: _compose_recreate(client, working_dir, _IMAGE_TAG))

        _update_phase, _update_message = Phase.complete, "Update applied. Services are restarting."

    except Exception as exc:
        logger.exception("Update failed")
        _update_phase, _update_message, _update_error = Phase.error, "Update failed.", str(exc)


async def _run_rollback(client) -> None:
    global _rollback_phase, _rollback_message, _rollback_error
    try:
        if SIMULATE:
            await asyncio.sleep(2)
            _rollback_phase, _rollback_message = Phase.rolling_back, "Reverting to previous version..."
            await asyncio.sleep(3)
            _rollback_phase, _rollback_message = Phase.applying, "Restarting containers with previous version..."
            await asyncio.sleep(2)
            _rollback_phase, _rollback_message = Phase.complete, "Rollback applied. Services are restarting."
            return

        loop = asyncio.get_event_loop()
        _rollback_phase, _rollback_message = Phase.rolling_back, "Reverting to previous version..."
        working_dir = _get_working_dir(client)
        if not working_dir:
            raise RuntimeError("Cannot determine compose working directory from container labels.")

        _rollback_phase, _rollback_message = Phase.applying, "Restarting containers with previous version..."
        await loop.run_in_executor(None, lambda: _compose_recreate(client, working_dir, _ROLLBACK_TAG))

        _rollback_phase, _rollback_message = Phase.complete, "Rollback applied. Services are restarting."

    except Exception as exc:
        logger.exception("Rollback failed")
        _rollback_phase, _rollback_message, _rollback_error = Phase.error, "Rollback failed.", str(exc)
