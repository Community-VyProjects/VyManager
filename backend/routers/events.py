"""
SSE Events Router

Provides a Server-Sent Events endpoint that streams banner status updates
(config diff, commit-confirm, power status) to connected clients in real time.

Replaces frontend polling of /vyos/config/diff, /vyos/config/commit-confirm/status,
and /vyos/power/status with a single persistent connection.
"""

import asyncio
import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from session_vyos_service import cached_session_service, get_session_vyos_service, _session_device_registry
from fastapi_permissions import has_permission, require_read_permission
from org_scope import org_id_from_state, request_scoped_conn
from rbac_permissions import FeatureGroup, PermissionLevel, check_permission
from stream_auth import fail_closed
import revocation_bus
from events.event_manager import (
    event_manager,
    EVENT_CONFIG_DIFF,
    EVENT_COMMIT_CONFIRM,
    EVENT_POWER_STATUS,
)
import commit_confirm_state
import device_keys
from routers.power import get_scheduled_power_status

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/events", tags=["events"])

# Background poller task reference
_poller_task: Optional[asyncio.Task] = None
POLL_INTERVAL = 10  # seconds


# ============================================================================
# Session helpers
# ============================================================================

async def configuration_read_allowed(conn, user_id: str, instance_id: str, org_id: str | None) -> bool:
    """True only when this user still has an active session and configuration read."""
    if not await _has_active_session(conn, user_id, instance_id):
        return False
    return await check_permission(
        conn, user_id, instance_id,
        FeatureGroup.CONFIGURATION, PermissionLevel.READ,
        org_id=org_id)


async def banner_access_revoked(check) -> bool:
    """Close the banner stream when read access is gone or cannot be checked."""
    result = await fail_closed(check)
    return result.close_reason is not None


async def _has_active_session(conn, user_id: str, instance_id: str) -> bool:
    """Return True if the user still has an active VyOS instance session.

    Takes an open connection; callers own the acquisition (request paths use
    an org-scoped connection per tick, the background poller its own).
    """
    row = await conn.fetchrow(
        'SELECT 1 FROM active_sessions WHERE "userId" = $1 AND "instanceId" = $2',
        user_id,
        instance_id,
    )
    return row is not None


async def _get_instance_ids_with_active_sessions(conn, instance_ids: list[str]) -> list[str]:
    """Return the subset of instance_ids that have at least one active session."""
    if not instance_ids:
        return []
    rows = await conn.fetch(
        'SELECT DISTINCT "instanceId" FROM active_sessions WHERE "instanceId" = ANY($1)',
        instance_ids,
    )
    return [row["instanceId"] for row in rows]


# ============================================================================
# SSE Endpoint
# ============================================================================

@router.get("/banners")
async def banner_events(request: Request):
    """
    SSE stream for banner status updates.

    Sends events when config diff, commit-confirm, or power status changes.
    The client receives instant updates from mutations and periodic checks
    for external changes (e.g. CLI config edits).
    """
    await require_read_permission(request, FeatureGroup.CONFIGURATION)

    instance = getattr(request.state, "instance", None)
    if not instance:
        # No active instance yet (e.g. on the site-selection screen). Return an
        # idle keepalive stream instead of erroring, so the client's EventSource
        # doesn't spin in an error/reconnect loop. A real stream is established
        # once an instance is selected and this endpoint is reconnected.
        async def idle_stream():
            try:
                yield _format_sse("banner_state", {})
                while True:
                    await asyncio.sleep(30)
                    yield ": keepalive\n\n"
            except asyncio.CancelledError:
                pass  # Client disconnected; end the idle stream.

        return StreamingResponse(
            idle_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

    instance_id = instance["id"]
    user_id = request.state.user["id"]
    queue = event_manager.subscribe(instance_id)
    revocations = revocation_bus.subscribe()

    async def _access_revoked() -> bool:
        """Re-check the user still has read access on this instance."""
        async def check() -> bool:
            async with request_scoped_conn(request) as conn:
                return await configuration_read_allowed(
                    conn, user_id, instance_id, org_id_from_state(request))

        return await banner_access_revoked(check)

    async def event_stream():
        try:
            # Send initial state immediately on connect
            initial = await _gather_banner_state(request)
            yield _format_sse("banner_state", initial)

            while True:
                # Wake on a banner event, a revocation notification, or the
                # keepalive timeout — whichever comes first.
                get_event = asyncio.ensure_future(queue.get())
                get_revoke = asyncio.ensure_future(revocations.get())
                done, pending = await asyncio.wait(
                    {get_event, get_revoke}, timeout=30,
                    return_when=asyncio.FIRST_COMPLETED)
                for fut in pending:
                    fut.cancel()

                if get_revoke in done:
                    payload = get_revoke.result()
                    if revocation_bus.payload_matches(
                            payload, user_id=user_id, instance_id=instance_id):
                        if await _access_revoked():
                            break
                    continue

                if get_event in done:
                    yield f"data: {get_event.result()}\n\n"
                    continue

                # Timeout: the poll-tick floor re-checks access even if no
                # notification arrived (a stream must never hold a transaction
                # open between ticks).
                if await _access_revoked():
                    break
                yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass  # Client disconnected; finally unsubscribes.
        finally:
            event_manager.unsubscribe(instance_id, queue)
            revocation_bus.unsubscribe(revocations)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


def _format_sse(event_type: str, data: Any) -> str:
    """Format a payload as an SSE data frame."""
    payload = json.dumps({"type": event_type, "data": data}, default=str)
    return f"data: {payload}\n\n"


# ============================================================================
# State Gathering (shared by SSE initial push and background poller)
# ============================================================================

async def _gather_banner_state(request: Request) -> Dict[str, Any]:
    """Collect current config_diff, commit_confirm, and power_status for an instance."""
    instance_id = request.state.instance["id"]

    config_diff = await _get_config_diff_state(request)
    cc_status = _get_commit_confirm_state(instance_id)
    power = await _get_power_status_state(request)

    return {
        "config_diff": config_diff,
        "commit_confirm": cc_status,
        "power_status": power,
    }


def _no_config_changes() -> Dict[str, Any]:
    return {
        "has_changes": False,
        "added": {},
        "removed": {},
        "modified": {},
        "summary": {"added": 0, "removed": 0, "modified": 0},
    }


async def _config_diff_for(instance_id: str, service: Any) -> Dict[str, Any]:
    """Diff the device config against the saved baseline (SSE push and poller)."""
    from routers.config.config import deep_diff
    from config_state import reconcile_baseline, set_saved_config

    current_config = await run_in_threadpool(service.get_full_config, refresh=True)

    baseline = reconcile_baseline(instance_id, current_config)
    if baseline is None:
        set_saved_config(instance_id, current_config)
        return _no_config_changes()

    added, removed, modified = deep_diff(current_config, baseline)
    return {
        "has_changes": bool(added or removed or modified),
        "added": added,
        "removed": removed,
        "modified": modified,
        "summary": {
            "added": len(added),
            "removed": len(removed),
            "modified": len(modified),
        },
    }


async def _get_config_diff_state(request: Request) -> Dict[str, Any]:
    """Get config diff state without going through the HTTP endpoint."""
    try:
        service = get_session_vyos_service(request)
        return await _config_diff_for(request.state.instance["id"], service)
    except Exception:
        logger.exception("Failed to get config diff for SSE")
        return _no_config_changes()


def _get_commit_confirm_state(instance_id: str) -> Dict[str, Any]:
    """Get the row's commit-confirm state (commit_confirm_state.status), no device I/O."""
    return commit_confirm_state.status(instance_id, cached_session_service(instance_id))


async def _get_power_status_state(request: Request) -> Dict[str, Any]:
    """Get power status: the stored row, checked against the device.

    The stream itself needs CONFIGURATION read; power status is sent only to
    callers with POWER read, the same gate as GET /vyos/power/status.
    """
    try:
        if not await has_permission(request, FeatureGroup.POWER, PermissionLevel.READ):
            return {"scheduled": False}
        status = await get_scheduled_power_status(
            lambda: request_scoped_conn(request),
            request.state.instance["id"],
            lambda: get_session_vyos_service(request),
        )
        return status.model_dump(mode="json")
    except Exception:
        logger.exception("Failed to get power status for SSE")
        return {"scheduled": False}


# ============================================================================
# Background Poller
# ============================================================================

async def _poll_banner_state_for_device(
    instance_ids: list[str],
    app_state: Any,
) -> None:
    """
    Poll the banner state of one router and emit events to each of its
    subscribed instance rows only if that row's state has changed.

    ``instance_ids`` are the subscribed rows verified on one router (see
    ``device_keys``; an unverified row is polled alone). The config diff is
    router state, so it is read once for all of them: each has shown its own
    credentials reach this router, so none sees more than it could read.
    """
    group_key = device_keys.key_for(instance_ids[0])

    # --- Config diff: read once, through the first row whose read works ---
    services = []
    for iid in instance_ids:
        try:
            services.append((iid, _session_device_registry.get(iid)))
        except KeyError:
            continue
    config_diff_data = None
    fresh = None
    for iid, service in services:
        try:
            config_diff_data = await _config_diff_for(iid, service)
            fresh = getattr(service, "_cached_config", None)
            break
        except Exception:
            logger.debug("Poller: failed to get config diff through instance %s", iid)
    # A row whose key the router refused during this tick (device_keys.rejected)
    # is no longer on the router's key: it gets nothing read with another key.
    instance_ids = [iid for iid in instance_ids if device_keys.key_for(iid) == group_key]
    if config_diff_data is not None:
        if fresh is not None:
            # The router changed under the other rows' cached reads: drop them,
            # so each row's next read goes out with its own credentials.
            for _iid, service in services:
                if getattr(service, "_cached_config", None) is not fresh:
                    service._cached_config = None
        for iid in instance_ids:
            if event_manager.update_last_state(iid, EVENT_CONFIG_DIFF, config_diff_data):
                event_manager.emit_to_instance(iid, EVENT_CONFIG_DIFF, {"config_diff": config_diff_data})

    # --- Commit confirm (per row: whether the row arms one is a row setting) ---
    for iid in instance_ids:
        if cached_session_service(iid) is None:
            # Without the row's service its settings are unknown here; the
            # status route (which reads the instance row) stays the source.
            continue
        try:
            cc_data = _get_commit_confirm_state(iid)
            if event_manager.update_last_state(iid, EVENT_COMMIT_CONFIRM, cc_data):
                event_manager.emit_to_instance(iid, EVENT_COMMIT_CONFIRM, {"commit_confirm": cc_data})
        except Exception:
            logger.debug("Poller: failed to get commit-confirm for instance %s", iid)

    # --- Power status (scheduled per instance row) ---
    db_pool = app_state.db_pool
    if not db_pool:
        return
    for instance_id in instance_ids:
        try:
            status = await get_scheduled_power_status(
                db_pool.acquire,
                instance_id,
                lambda iid=instance_id: _session_device_registry.get(iid),
            )
            # Subscribers may lack POWER read, so send the refetch signal and
            # let each client re-read through the POWER-gated GET /status.
            if event_manager.update_last_state(
                instance_id, EVENT_POWER_STATUS, status.model_dump(mode="json")
            ):
                event_manager.emit_to_instance(instance_id, EVENT_POWER_STATUS, None)
        except Exception:
            logger.debug("Poller: failed to get power status for instance %s", instance_id)


async def start_banner_poller(app_state: Any) -> None:
    """
    Background task that periodically checks banner state for all instances
    with active SSE subscribers and emits events when state changes.
    """
    logger.info("Banner SSE poller started (interval: %ds)", POLL_INTERVAL)

    while True:
        try:
            await asyncio.sleep(POLL_INTERVAL)

            instance_ids = event_manager.get_subscribed_instance_ids()
            if not instance_ids:
                continue

            # Skip instances that have no active VyOS sessions so we never hit
            # the VyOS API (and its FUSE filesystem) for signed-out users.
            db_pool = getattr(app_state, "db_pool", None)
            if db_pool:
                try:
                    async with db_pool.acquire() as conn:
                        instance_ids = await _get_instance_ids_with_active_sessions(
                            conn, instance_ids)
                except Exception:
                    pass  # assume all valid when DB is unavailable
            if not instance_ids:
                continue

            # Poll each router once, concurrently.
            by_device: Dict[str, list[str]] = {}
            for iid in instance_ids:
                by_device.setdefault(device_keys.key_for(iid), []).append(iid)
            tasks = [
                _poll_banner_state_for_device(sorted(iids), app_state)
                for iids in by_device.values()
            ]
            await asyncio.gather(*tasks, return_exceptions=True)

        except asyncio.CancelledError:
            logger.info("Banner SSE poller stopped")
            break
        except Exception:
            logger.exception("Banner poller error")


def start_poller(app_state: Any) -> asyncio.Task:
    """Start the background poller and return the task."""
    global _poller_task
    _poller_task = asyncio.create_task(start_banner_poller(app_state))
    return _poller_task


def stop_poller() -> None:
    """Cancel the background poller task."""
    global _poller_task
    if _poller_task and not _poller_task.done():
        _poller_task.cancel()
