"""
System Power Management Router

API endpoints for managing VyOS system power actions (reboot, poweroff).
Uses RBAC permission system - requires WRITE permission on POWER feature.

Uses session-based architecture - VyOS instance comes from user's active session.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import re
import uuid

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from org_scope import request_scoped_conn
from rbac_permissions import FeatureGroup
from events.event_manager import event_manager, EVENT_POWER_STATUS
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/power", tags=["power"])


def _utcnow() -> datetime:
    """Naive UTC now, the form scheduledTime is stored in."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# powerctrl.py parses 'at' with strptime("%H:%M") and hands 'in' to shutdown
# as a minute count; anything else comes back as a 200 with an error line.
_AT_TIME = re.compile(r"(?:[01]?\d|2[0-3]):[0-5]?\d", re.ASCII)
# At most 7 significant digits (under 10 million minutes) after leading zeros,
# so int() and the timedelta below cannot fail. The modal uses the same bound.
_IN_MINUTES = re.compile(r"0*([1-9]\d{0,6})", re.ASCII)
_AT_DETAIL = "Time (HH:MM) required for 'at' action"
_IN_DETAIL = "Minutes (a whole number from 1 to 9999999) required for 'in' action"
# powerctrl.py answers a rejected request with HTTP 200 and one of these lines.
_REJECTED_MARKERS = ("Invalid", "Error", "Failed", "Could not", "Incorrect")


# ========================================================================
# Pydantic Models
# ========================================================================


class PowerActionRequest(BaseModel):
    """Request model for power actions."""

    action: Literal["now", "at", "in", "cancel"] = Field(
        ..., description="Action type: now, at, in, or cancel"
    )
    value: Optional[str] = Field(
        None, description="Value for 'at' (HH:MM) or 'in' (minutes)"
    )


class PowerActionResponse(BaseModel):
    """Response from power action."""

    success: bool
    message: str
    scheduled_time: Optional[datetime] = None


class PowerStatusResponse(BaseModel):
    """Response for power status check."""

    scheduled: bool
    action_type: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    scheduled_by: Optional[str] = None
    scheduled_by_name: Optional[str] = None
    cancelled: bool = False
    cancelled_by: Optional[str] = None
    cancelled_by_name: Optional[str] = None




# ========================================================================
# Helper: Parse Scheduled Time from VyOS
# ========================================================================


def parse_scheduled_time(output: str, vyos_timezone: Optional[str] = None) -> Optional[datetime]:
    """
    Parse scheduled time from VyOS 'show reboot' output and convert to UTC.

    Example output: "Reboot is scheduled 2025-12-23 19:32:49"

    Args:
        output: VyOS command output
        vyos_timezone: VyOS timezone (e.g., "America/Chicago"). If provided,
                      the parsed time is treated as being in this timezone
                      and converted to UTC.

    Returns:
        datetime in UTC, or None if parsing fails
    """
    if not output or not isinstance(output, str):
        return None

    # Match pattern: "Reboot is scheduled YYYY-MM-DD HH:MM:SS"
    # or "Poweroff is scheduled YYYY-MM-DD HH:MM:SS"
    match = re.search(
        r"(Reboot|Poweroff) is scheduled (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})", output
    )

    if match:
        time_str = match.group(2)
        try:
            # Parse the time string
            parsed_time = datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")

            # If we know VyOS's timezone, convert to UTC
            if vyos_timezone:
                try:
                    # Treat parsed time as being in VyOS's timezone
                    local_time = parsed_time.replace(tzinfo=ZoneInfo(vyos_timezone))
                    # Convert to UTC
                    utc_time = local_time.astimezone(ZoneInfo("UTC"))
                    # Return as naive datetime in UTC (for database storage)
                    return utc_time.replace(tzinfo=None)
                except Exception:
                    # Fall back to treating as UTC
                    return parsed_time
            else:
                # No timezone info, treat as UTC (old behavior)
                return parsed_time

        except ValueError:
            return None

    return None


async def get_vyos_timezone(service) -> Optional[str]:
    """
    Get the timezone configured on the VyOS device.

    Returns:
        Timezone string (e.g., "America/Chicago") or None if not found
    """
    try:
        full_config = await run_in_threadpool(service.get_full_config)
        return full_config.get("system", {}).get("time-zone")
    except Exception:
        return None


def _action_path(body: PowerActionRequest) -> tuple[list[str], Optional[datetime]]:
    """Op path for the action and, for 'in', the UTC time it fires; 400 on a bad value."""
    if body.action == "at":
        if not body.value or not _AT_TIME.fullmatch(body.value):
            raise HTTPException(status_code=400, detail=_AT_DETAIL)
        return ["at", body.value], None
    if body.action == "in":
        match = _IN_MINUTES.fullmatch(body.value or "")
        if not match:
            raise HTTPException(status_code=400, detail=_IN_DETAIL)
        minutes = match.group(1)
        return ["in", minutes], _utcnow() + timedelta(minutes=int(minutes))
    return [body.action], None


def _check_reply(response) -> None:
    """500 when the device call failed, 400 when powerctrl rejected the request."""
    if response.status != 200 or response.error:
        raise HTTPException(status_code=500, detail=f"VyOS command failed: {response.error}")
    if isinstance(response.result, str) and any(
        marker in response.result for marker in _REJECTED_MARKERS
    ):
        raise HTTPException(status_code=400, detail=response.result.strip())


async def _mark_cancelled(request: Request, user, instance_id) -> None:
    """Mark every pending action cancelled: powerctrl cancel runs shutdown -c,
    which drops whichever reboot or poweroff is scheduled."""
    async with request_scoped_conn(request) as conn:
        await conn.execute(
            """
            UPDATE scheduled_power_actions
            SET cancelled = true,
                "cancelledBy" = $1,
                "cancelledByName" = $2,
                "cancelledAt" = NOW()
            WHERE "instanceId" = $3
              AND cancelled = false
            """,
            user["id"],
            user["name"],
            instance_id,
        )


async def _store_schedule(request: Request, kind: str, scheduled_time: datetime, user, instance_id) -> None:
    """Replace the stored schedule for the instance: a new shutdown replaces
    whichever reboot or poweroff was pending."""
    async with request_scoped_conn(request) as conn:
        await conn.execute(
            """
            DELETE FROM scheduled_power_actions
            WHERE "instanceId" = $1
            """,
            instance_id,
        )

        # Generate CUID-like id
        action_id = f"c{uuid.uuid4().hex[:24]}"

        await conn.execute(
            """
            INSERT INTO scheduled_power_actions
            (id, "instanceId", "actionType", "scheduledTime", "scheduledBy", "scheduledByName")
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            action_id,
            instance_id,
            kind,
            scheduled_time,
            user["id"],
            user["name"],
        )


async def _run_power_action(
    request: Request, body: PowerActionRequest, kind: Literal["reboot", "poweroff"]
) -> Optional[datetime]:
    """Send the action to the device and update the stored schedule.

    Returns the scheduled UTC time for 'at' and 'in', else None.
    """
    service = get_session_vyos_service(request)
    user = request.state.user
    instance_id = request.state.instance["id"]

    path, scheduled_time = _action_path(body)

    # 'at' replies with the device-local time, so the timezone converts it.
    vyos_timezone = await get_vyos_timezone(service) if body.action == "at" else None

    try:
        if kind == "reboot":
            response = await run_in_threadpool(service.device.reboot, path=path)
        else:
            response = await run_in_threadpool(service.device.poweroff, path=path)
        _check_reply(response)

        if body.action == "at":
            scheduled_time = parse_scheduled_time(response.result, vyos_timezone)
            if not scheduled_time:
                logger.warning("Could not read the scheduled %s time from %r", kind, response.result)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")

    if body.action == "cancel":
        await _mark_cancelled(request, user, instance_id)
    elif scheduled_time:
        await _store_schedule(request, kind, scheduled_time, user, instance_id)

    # Notify SSE subscribers of power status change
    event_manager.emit(instance_id, EVENT_POWER_STATUS, None)
    return scheduled_time


def _utc(scheduled_time: Optional[datetime]) -> Optional[datetime]:
    """Timezone-aware UTC for JSON serialization."""
    return scheduled_time.replace(tzinfo=ZoneInfo("UTC")) if scheduled_time else None


# ========================================================================
# Endpoint: Reboot
# ========================================================================


@router.post("/reboot", response_model=PowerActionResponse)
async def reboot_system(request: Request, body: PowerActionRequest):
    """
    Reboot the VyOS system.

    Options:
    - now: Reboot immediately without confirmation
    - at: Reboot at specific time (HH:MM format)
    - in: Reboot in X minutes
    - cancel: Cancel a pending reboot
    """
    await require_write_permission(request, FeatureGroup.POWER)

    scheduled_time = await _run_power_action(request, body, "reboot")

    if body.action == "now":
        message = "System is rebooting now"
    elif body.action == "cancel":
        message = "Reboot cancelled"
    elif scheduled_time:
        message = f"Reboot scheduled for {scheduled_time}"
    else:
        message = "Reboot scheduled"

    return PowerActionResponse(success=True, message=message, scheduled_time=_utc(scheduled_time))


# ========================================================================
# Endpoint: Poweroff
# ========================================================================


@router.post("/poweroff", response_model=PowerActionResponse)
async def poweroff_system(request: Request, body: PowerActionRequest):
    """
    Poweroff the VyOS system.

    Options:
    - now: Poweroff immediately without confirmation
    - at: Poweroff at specific time (HH:MM format)
    - in: Poweroff in X minutes
    - cancel: Cancel a pending poweroff
    """
    await require_write_permission(request, FeatureGroup.POWER)

    scheduled_time = await _run_power_action(request, body, "poweroff")

    if body.action == "now":
        message = "System is powering off now"
    elif body.action == "cancel":
        message = "Poweroff cancelled"
    elif scheduled_time:
        message = f"Poweroff scheduled for {scheduled_time}"
    else:
        message = "Poweroff scheduled"

    return PowerActionResponse(success=True, message=message, scheduled_time=_utc(scheduled_time))


# ========================================================================
# Endpoint: Status Check
# ========================================================================


@router.get("/status", response_model=PowerStatusResponse)
async def get_power_status(request: Request):
    """
    Check if a reboot or poweroff is scheduled for the current instance.

    This endpoint is polled by the frontend to display the banner.
    Requires READ permission on POWER feature.
    """
    await require_read_permission(request, FeatureGroup.POWER)

    service = get_session_vyos_service(request)
    instance_id = request.state.instance["id"]

    async with request_scoped_conn(request) as conn:
        # scheduledTime is stored as naive UTC (see parse_scheduled_time and
        # the _utcnow() writes), so it must be compared against UTC, not a
        # tz-aware NOW(): under a non-UTC database session timezone a bare
        # NOW() shifts the comparison by the offset and hides pending actions.
        # First, clean up expired actions
        await conn.execute(
            """
            DELETE FROM scheduled_power_actions
            WHERE "instanceId" = $1
              AND "scheduledTime" < (NOW() AT TIME ZONE 'UTC')
            """,
            instance_id,
        )

        # Get most recent non-expired scheduled action
        result = await conn.fetchrow(
            """
            SELECT "actionType", "scheduledTime", "scheduledBy", "scheduledByName",
                   cancelled, "cancelledBy", "cancelledByName"
            FROM scheduled_power_actions
            WHERE "instanceId" = $1
              AND "scheduledTime" > (NOW() AT TIME ZONE 'UTC')
            ORDER BY "createdAt" DESC
            LIMIT 1
            """,
            instance_id,
        )

    if not result:
        return PowerStatusResponse(scheduled=False)

    # Check if VyOS still has it scheduled. The connection above is closed
    # first so no DB connection is held across the device call. Only whether
    # a time is present matters here, so no timezone conversion is needed.
    try:
        response = await run_in_threadpool(service.device.show, path=["reboot"])
        if response.status != 200 or response.error:
            raise RuntimeError(f"VyOS command failed: {response.error}")
        output = response.result if isinstance(response.result, str) else ""
        still_scheduled = parse_scheduled_time(output) is not None
    except Exception:
        # If we can't check VyOS status, assume it's still scheduled
        logger.warning("Could not check the scheduled power action", exc_info=True)
        still_scheduled = True

    if not still_scheduled:
        async with request_scoped_conn(request) as conn:
            await conn.execute(
                """
                DELETE FROM scheduled_power_actions
                WHERE "instanceId" = $1
                  AND "actionType" = $2
                  AND "scheduledTime" > (NOW() AT TIME ZONE 'UTC')
                """,
                instance_id,
                result["actionType"],
            )
        return PowerStatusResponse(scheduled=False)

    # Convert scheduled_time to timezone-aware UTC for proper JSON serialization
    scheduled_time_utc = result["scheduledTime"]
    if scheduled_time_utc and scheduled_time_utc.tzinfo is None:
        scheduled_time_utc = scheduled_time_utc.replace(tzinfo=ZoneInfo("UTC"))

    return PowerStatusResponse(
        scheduled=True,
        action_type=result["actionType"],
        scheduled_time=scheduled_time_utc,
        scheduled_by=result["scheduledBy"],
        scheduled_by_name=result["scheduledByName"],
        cancelled=result["cancelled"],
        cancelled_by=result["cancelledBy"],
        cancelled_by_name=result["cancelledByName"],
    )
