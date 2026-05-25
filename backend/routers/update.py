"""VyManager self-update via Docker.


"""

import asyncio
import logging
import time
from enum import Enum
from typing import Optional

try:
    import docker
    from docker.errors import DockerException, NotFound
    _DOCKER_AVAILABLE = True
except ImportError:
    _DOCKER_AVAILABLE = False
    DockerException = Exception  # type: ignore[misc,assignment]
    NotFound = Exception  # type: ignore[misc,assignment]

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from fastapi_permissions import require_super_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/version", tags=["version"])

_FRONTEND_IMAGE = "ghcr.io/community-vyprojects/vymanager-frontend"
_BACKEND_IMAGE = "ghcr.io/community-vyprojects/vymanager-backend"
_IMAGE_TAG = "beta"
_BACKEND_CONTAINER = "vymanager-backend"
_FRONTEND_CONTAINER = "vymanager-frontend"


class UpdatePhase(str, Enum):
    idle = "idle"
    pulling_frontend = "pulling_frontend"
    pulling_backend = "pulling_backend"
    applying = "applying"
    complete = "complete"
    error = "error"
class UpdateStatusResponse(BaseModel):
    phase: UpdatePhase
    message: str
    started_at: Optional[float] = None
    error: Optional[str] = None

_phase: UpdatePhase = UpdatePhase.idle
_message: str = "No update in progress"
_started_at: Optional[float] = None
_error: Optional[str] = None


def _set_status(phase: UpdatePhase, message: str, error: Optional[str] = None) -> None:
    global _phase, _message, _error
    _phase = phase
    _message = message
    _error = error

@router.get("/update/status", response_model=UpdateStatusResponse)
async def get_update_status() -> UpdateStatusResponse:
    """Return the current self-update status. No authentication required."""
    return UpdateStatusResponse(
        phase=_phase,
        message=_message,
        started_at=_started_at,
        error=_error,
    )

@router.post("/update/start")
async def start_update(request: Request, simulate: bool = False) -> dict:
    """
    Trigger a one-click VyManager self-update.

    Pulls the latest images from GHCR then recreates the running containers
    via a docker
    cli helper container.
    Pass ?simulate=true to run a fake update (useful for testing without Docker).
    """
    await require_super_admin(request)

    global _phase, _started_at

    if _phase in (UpdatePhase.pulling_frontend, UpdatePhase.pulling_backend, UpdatePhase.applying):
        raise HTTPException(status_code=409, detail="An update is already in progress")

    if simulate:
        _phase = UpdatePhase.pulling_frontend
        _started_at = time.time()
        asyncio.create_task(_run_simulated_update())
        return {"message": "Simulated update started", "phase": _phase}

    if not _DOCKER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail=(
                "The 'docker' Python package is not installed. "
                "Install it with: pip install docker==7.1.0"
            ),
        )

    try:
        client = docker.from_env()
        client.ping()
    except DockerException:
        raise HTTPException(
            status_code=503,
            detail=(
                "Docker socket is not accessible. "
                "Add the following under the backend service in docker-compose.yml and restart:\n"
                "  volumes:\n    - /var/run/docker.sock:/var/run/docker.sock"
            ),
        )

    _phase = UpdatePhase.pulling_frontend
    _started_at = time.time()
    asyncio.create_task(_run_update(client))

    return {"message": "Update started", "phase": _phase}

async def _run_simulated_update() -> None:
    await asyncio.sleep(2)
    _set_status(UpdatePhase.pulling_frontend, "Pulling frontend image...")
    await asyncio.sleep(3)
    _set_status(UpdatePhase.pulling_backend, "Pulling backend image...")
    await asyncio.sleep(3)
    _set_status(UpdatePhase.applying, "Applying update — containers are restarting...")
    await asyncio.sleep(2)
    _set_status(UpdatePhase.complete, "Update applied. Services are restarting.")


async def _run_update(client: docker.DockerClient) -> None:
    loop = asyncio.get_event_loop()

    try:
        _set_status(UpdatePhase.pulling_frontend, "Pulling frontend image...")
        await loop.run_in_executor(
            None, lambda: client.images.pull(_FRONTEND_IMAGE, tag=_IMAGE_TAG)
        )

        _set_status(UpdatePhase.pulling_backend, "Pulling backend image...")
        await loop.run_in_executor(
            None, lambda: client.images.pull(_BACKEND_IMAGE, tag=_IMAGE_TAG)
        )

        _set_status(UpdatePhase.applying, "Applying update — containers are restarting...")
        await loop.run_in_executor(None, lambda: _apply_update(client))

        _set_status(UpdatePhase.complete, "Update applied. Services are restarting.")

    except Exception as exc:
        logger.exception("VyManager update failed")
        _set_status(UpdatePhase.error, "Update failed.", error=str(exc))


def _apply_update(client: docker.DockerClient) -> None:
    working_dir: Optional[str] = None
    try:
        be = client.containers.get(_BACKEND_CONTAINER)
        working_dir = be.labels.get("com.docker.compose.project.working_dir")
    except NotFound:
        pass

    if working_dir:
        _apply_via_compose(client, working_dir)
    else:
        logger.warning(
            _BACKEND_CONTAINER,
        )
        _recreate_container(client, _FRONTEND_CONTAINER)


def _apply_via_compose(client: docker.DockerClient, working_dir: str) -> None:
    """
    Launch a short-lived docker:cli container that sleeps 5 s then runs
    `docker compose up -d --force-recreate`. 
    The delay lets the current
    backend process send its HTTP response before it is replaced.
    """
    try:
        client.containers.run(
            "docker:cli",
            command=[
                "sh",
                "-c",
                f"sleep 5 && cd '{working_dir}' && docker compose up -d --force-recreate 2>&1",
            ],
            volumes={
                "/var/run/docker.sock": {"bind": "/var/run/docker.sock", "mode": "rw"},
                working_dir: {"bind": working_dir, "mode": "ro"},
            },
            working_dir=working_dir,
            remove=True,
            detach=True,
        )
    except Exception as exc:
        logger.warning("docker:cli helper failed (%s) — recreating frontend manually", exc)
        _recreate_container(client, _FRONTEND_CONTAINER)


def _recreate_container(client: docker.DockerClient, container_name: str) -> None:
    """Stop remove and recreate a container."""
    try:
        c = client.containers.get(container_name)
    except NotFound:
        logger.warning("Container %s not found, skipping", container_name)
        return

    attrs = c.attrs
    cfg = attrs["Config"]
    hc = attrs["HostConfig"]
    nets = attrs["NetworkSettings"]["Networks"]

    c.stop(timeout=30)
    c.remove()

    new = client.containers.create(
        image=cfg["Image"],
        name=container_name,
        environment=cfg.get("Env") or [],
        labels=cfg.get("Labels") or {},
        ports=hc.get("PortBindings") or None,
        volumes=hc.get("Binds") or [],
        restart_policy=hc.get("RestartPolicy") or {"Name": "unless-stopped"},
        network=hc.get("NetworkMode", "bridge"),
        hostname=cfg.get("Hostname"),
        detach=True,
    )

    for net_name in nets:
        if net_name != hc.get("NetworkMode"):
            try:
                client.networks.get(net_name).connect(new)
            except Exception:
                pass

    new.start()
