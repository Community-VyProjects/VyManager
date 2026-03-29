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
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from session_vyos_service import get_session_vyos_service, _session_device_registry
from fastapi_permissions import require_read_permission
from rbac_permissions import FeatureGroup
from events.event_manager import (
    event_manager,
    EVENT_CONFIG_DIFF,
    EVENT_COMMIT_CONFIRM,
    EVENT_POWER_STATUS,
)
import commit_confirm_state

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/events", tags=["events"])

# Background poller task reference
_poller_task: Optional[asyncio.Task] = None
POLL_INTERVAL = 10  # seconds


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

    instance_id = request.state.instance["id"]
    queue = event_manager.subscribe(instance_id)

    async def event_stream():
        try:
            # Send initial state immediately on connect
            initial = await _gather_banner_state(request)
            yield _format_sse("banner_state", initial)

            while True:
                try:
                    # Wait for events with a timeout for keepalive
                    payload = await asyncio.wait_for(queue.get(), timeout=30)
                    yield f"data: {payload}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive comment to prevent connection timeout
                    yield ": keepalive\n\n"
                except asyncio.CancelledError:
                    break
        except asyncio.CancelledError:
            pass
        finally:
            event_manager.unsubscribe(instance_id, queue)

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


async def _get_config_diff_state(request: Request) -> Dict[str, Any]:
    """Get config diff state without going through the HTTP endpoint."""
    from routers.config.config import _saved_config_snapshots, deep_diff

    try:
        service = get_session_vyos_service(request)
        instance_id = request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config, refresh=True)

        if instance_id not in _saved_config_snapshots:
            _saved_config_snapshots[instance_id] = current_config
            return {
                "has_changes": False,
                "added": {},
                "removed": {},
                "modified": {},
                "summary": {"added": 0, "removed": 0, "modified": 0},
            }

        added, removed, modified = deep_diff(current_config, _saved_config_snapshots[instance_id])
        has_changes = bool(added or removed or modified)

        return {
            "has_changes": has_changes,
            "added": added,
            "removed": removed,
            "modified": modified,
            "summary": {
                "added": len(added),
                "removed": len(removed),
                "modified": len(modified),
            },
        }
    except Exception:
        logger.exception("Failed to get config diff for SSE")
        return {
            "has_changes": False,
            "added": {},
            "removed": {},
            "modified": {},
            "summary": {"added": 0, "removed": 0, "modified": 0},
        }


def _get_commit_confirm_state(instance_id: str) -> Dict[str, Any]:
    """Get commit-confirm state from the in-memory tracker."""
    session = commit_confirm_state.get_active(instance_id)
    if session is None:
        return {"active": False}
    return session.to_dict()


async def _get_power_status_state(request: Request) -> Dict[str, Any]:
    """Get power status from the database."""
    try:
        instance_id = request.state.instance["id"]
        db_pool = request.app.state.db_pool

        if not db_pool:
            return {"scheduled": False}

        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                DELETE FROM scheduled_power_actions
                WHERE "instanceId" = $1
                  AND "scheduledTime" < NOW()
                """,
                instance_id,
            )

            result = await conn.fetchrow(
                """
                SELECT "actionType", "scheduledTime", "scheduledBy", "scheduledByName",
                       cancelled, "cancelledBy", "cancelledByName"
                FROM scheduled_power_actions
                WHERE "instanceId" = $1
                  AND "scheduledTime" > NOW()
                ORDER BY "createdAt" DESC
                LIMIT 1
                """,
                instance_id,
            )

            if not result:
                return {"scheduled": False}

            scheduled_time = result["scheduledTime"]
            if scheduled_time and (not hasattr(scheduled_time, 'tzinfo') or scheduled_time.tzinfo is None):
                scheduled_time = scheduled_time.replace(tzinfo=ZoneInfo("UTC"))

            return {
                "scheduled": True,
                "action_type": result["actionType"],
                "scheduled_time": scheduled_time.isoformat() if scheduled_time else None,
                "scheduled_by": result["scheduledBy"],
                "scheduled_by_name": result["scheduledByName"],
                "cancelled": result["cancelled"],
                "cancelled_by": result["cancelledBy"],
                "cancelled_by_name": result["cancelledByName"],
            }
    except Exception:
        logger.exception("Failed to get power status for SSE")
        return {"scheduled": False}


# ============================================================================
# Background Poller
# ============================================================================

async def _poll_banner_state_for_instance(
    instance_id: str,
    app_state: Any,
) -> None:
    """
    Poll the current banner state for a single instance and emit events
    only if the state has changed since the last poll.
    """
    from routers.config.config import _saved_config_snapshots, deep_diff

    # --- Config diff ---
    try:
        service = _session_device_registry.get(instance_id)
        current_config = await run_in_threadpool(service.get_full_config, refresh=True)

        if instance_id not in _saved_config_snapshots:
            _saved_config_snapshots[instance_id] = current_config
            config_diff_data = {
                "has_changes": False,
                "added": {},
                "removed": {},
                "modified": {},
                "summary": {"added": 0, "removed": 0, "modified": 0},
            }
        else:
            added, removed, modified = deep_diff(current_config, _saved_config_snapshots[instance_id])
            has_changes = bool(added or removed or modified)
            config_diff_data = {
                "has_changes": has_changes,
                "added": added,
                "removed": removed,
                "modified": modified,
                "summary": {
                    "added": len(added),
                    "removed": len(removed),
                    "modified": len(modified),
                },
            }

        if event_manager.update_last_state(instance_id, EVENT_CONFIG_DIFF, config_diff_data):
            event_manager.emit(instance_id, EVENT_CONFIG_DIFF, config_diff_data)
    except Exception:
        logger.debug("Poller: failed to get config diff for instance %s", instance_id)

    # --- Commit confirm ---
    try:
        cc_data = _get_commit_confirm_state(instance_id)
        if event_manager.update_last_state(instance_id, EVENT_COMMIT_CONFIRM, cc_data):
            event_manager.emit(instance_id, EVENT_COMMIT_CONFIRM, cc_data)
    except Exception:
        logger.debug("Poller: failed to get commit-confirm for instance %s", instance_id)

    # --- Power status ---
    try:
        db_pool = app_state.db_pool
        if db_pool:
            async with db_pool.acquire() as conn:
                await conn.execute(
                    """
                    DELETE FROM scheduled_power_actions
                    WHERE "instanceId" = $1
                      AND "scheduledTime" < NOW()
                    """,
                    instance_id,
                )

                result = await conn.fetchrow(
                    """
                    SELECT "actionType", "scheduledTime", "scheduledBy", "scheduledByName",
                           cancelled, "cancelledBy", "cancelledByName"
                    FROM scheduled_power_actions
                    WHERE "instanceId" = $1
                      AND "scheduledTime" > NOW()
                    ORDER BY "createdAt" DESC
                    LIMIT 1
                    """,
                    instance_id,
                )

                if not result:
                    power_data = {"scheduled": False}
                else:
                    scheduled_time = result["scheduledTime"]
                    if scheduled_time and (not hasattr(scheduled_time, 'tzinfo') or scheduled_time.tzinfo is None):
                        scheduled_time = scheduled_time.replace(tzinfo=ZoneInfo("UTC"))
                    power_data = {
                        "scheduled": True,
                        "action_type": result["actionType"],
                        "scheduled_time": scheduled_time.isoformat() if scheduled_time else None,
                        "scheduled_by": result["scheduledBy"],
                        "scheduled_by_name": result["scheduledByName"],
                        "cancelled": result["cancelled"],
                        "cancelled_by": result["cancelledBy"],
                        "cancelled_by_name": result["cancelledByName"],
                    }

                if event_manager.update_last_state(instance_id, EVENT_POWER_STATUS, power_data):
                    event_manager.emit(instance_id, EVENT_POWER_STATUS, power_data)
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

            # Poll each instance concurrently
            tasks = [
                _poll_banner_state_for_instance(iid, app_state)
                for iid in instance_ids
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
