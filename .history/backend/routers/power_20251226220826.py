"""
System Power Management Router

API endpoints for managing VyOS system power actions (reboot, poweroff).
Restricted to ADMIN and SUPER_ADMIN roles only.

Uses session-based architecture - VyOS instance comes from user's active session.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import asyncpg
import re
import uuid

from session_vyos_service import get_session_vyos_service

router = APIRouter(prefix="/vyos/power", tags=["power"])

# ========================================================================
# Permission Check Helper
# ========================================================================

ALLOWED_ROLES = ["ADMIN", "SUPER_ADMIN"]


async def check_power_permission(request: Request) -> None:
    """
    Check if user has permission to execute power actions.
    Only ADMIN and SUPER_ADMIN roles are allowed.

    Raises:
        HTTPException(403): If user doesn't have required role
    """
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Get user's role from database
    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
        result = await conn.fetchrow(
            """
            SELECT role FROM users WHERE id = $1
            """,
            user["id"],
        )

        if not result or result["role"] not in ALLOWED_ROLES:
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Power actions require ADMIN or SUPER_ADMIN role.",
            )


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
        system_config = full_config.get("system", {})
        timezone = system_config.get("time-zone")
        return timezone
    except Exception:
        return None


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
    # Check permissions
    await check_power_permission(request)

    # Get VyOS service and instance info
    service = get_session_vyos_service(request)
    user = request.state.user
    instance = request.state.instance
    instance_id = instance["id"]
    db_pool: asyncpg.Pool = request.app.state.db_pool

    # Build VyOS command path
    if body.action == "now":
        path = ["now"]
        scheduled_time = None
    elif body.action == "at":
        if not body.value:
            raise HTTPException(
                status_code=400, detail="Time (HH:MM) required for 'at' action"
            )
        path = ["at", body.value]
        scheduled_time = None  # Will get from show command
    elif body.action == "in":
        if not body.value:
            raise HTTPException(
                status_code=400, detail="Minutes required for 'in' action"
            )
        path = ["in", body.value]
        # Calculate scheduled time
        minutes = int(body.value)
        scheduled_time = datetime.utcnow() + timedelta(minutes=minutes)
    elif body.action == "cancel":
        path = ["cancel"]
        scheduled_time = None

        # Mark as cancelled in database
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE scheduled_power_actions
                SET cancelled = true,
                    "cancelledBy" = $1,
                    "cancelledByName" = $2,
                    "cancelledAt" = NOW()
                WHERE "instanceId" = $3
                  AND "actionType" = 'reboot'
                  AND cancelled = false
                """,
                user["id"],
                user["name"],
                instance_id,
            )
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    # Get VyOS timezone for proper time conversion
    vyos_timezone = await get_vyos_timezone(service)

    # Execute VyOS command
    try:
        response = service.device.reboot(path=path)

        if response.status != 200:
            raise HTTPException(status_code=500, detail=f"VyOS command failed: {response.error}")

        # Check if VyOS returned an error message (even with 200 status)
        if isinstance(response.result, str) and ("Invalid" in response.result or "Error" in response.result or "Failed" in response.result):
            raise HTTPException(status_code=400, detail=response.result.strip())

        # Parse scheduled time from the response only for "at" action
        # For "in" we already calculated UTC time, don't overwrite with VyOS's local time
        if body.action == "at":
            if response.result:
                # VyOS returns: {"success": true, "data": "Reboot is scheduled YYYY-MM-DD HH:MM:SS\n", "error": null}
                # The time is in VyOS's local timezone, so we convert it to UTC
                if isinstance(response.result, dict) and "data" in response.result:
                    output = response.result["data"]
                    parsed_time = parse_scheduled_time(output, vyos_timezone)
                    if parsed_time:
                        scheduled_time = parsed_time
                elif isinstance(response.result, str):
                    # Result is a string directly
                    parsed_time = parse_scheduled_time(response.result, vyos_timezone)
                    if parsed_time:
                        scheduled_time = parsed_time
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Power] Error in reboot: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    # Store scheduled action in database (except for 'now' and 'cancel')
    if body.action in ["at", "in"] and scheduled_time:
        async with db_pool.acquire() as conn:
            # Delete any existing scheduled reboots for this instance
            await conn.execute(
                """
                DELETE FROM scheduled_power_actions
                WHERE "instanceId" = $1 AND "actionType" = 'reboot'
                """,
                instance_id,
            )

            # Generate CUID-like id
            action_id = f"c{uuid.uuid4().hex[:24]}"

            # Insert new scheduled action
            await conn.execute(
                """
                INSERT INTO scheduled_power_actions
                (id, "instanceId", "actionType", "scheduledTime", "scheduledBy", "scheduledByName")
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                action_id,
                instance_id,
                "reboot",
                scheduled_time,
                user["id"],
                user["name"],
            )

    # Build response message
    if body.action == "now":
        message = "System is rebooting now"
    elif body.action == "cancel":
        message = "Reboot cancelled"
    else:
        message = f"Reboot scheduled for {scheduled_time}"

    # Convert to timezone-aware UTC for proper JSON serialization
    scheduled_time_utc = None
    if scheduled_time:
        scheduled_time_utc = scheduled_time.replace(tzinfo=ZoneInfo("UTC"))

    return PowerActionResponse(
        success=True, message=message, scheduled_time=scheduled_time_utc
    )


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
    # Check permissions
    await check_power_permission(request)

    # Get VyOS service and instance info
    service = get_session_vyos_service(request)
    user = request.state.user
    instance = request.state.instance
    instance_id = instance["id"]
    db_pool: asyncpg.Pool = request.app.state.db_pool

    # Build VyOS command path
    if body.action == "now":
        path = ["now"]
        scheduled_time = None
    elif body.action == "at":
        if not body.value:
            raise HTTPException(
                status_code=400, detail="Time (HH:MM) required for 'at' action"
            )
        path = ["at", body.value]
        scheduled_time = None  # Will get from show command
    elif body.action == "in":
        if not body.value:
            raise HTTPException(
                status_code=400, detail="Minutes required for 'in' action"
            )
        path = ["in", body.value]
        # Calculate scheduled time
        minutes = int(body.value)
        scheduled_time = datetime.utcnow() + timedelta(minutes=minutes)
    elif body.action == "cancel":
        path = ["cancel"]
        scheduled_time = None

        # Mark as cancelled in database
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE scheduled_power_actions
                SET cancelled = true,
                    "cancelledBy" = $1,
                    "cancelledByName" = $2,
                    "cancelledAt" = NOW()
                WHERE "instanceId" = $3
                  AND "actionType" = 'poweroff'
                  AND cancelled = false
                """,
                user["id"],
                user["name"],
                instance_id,
            )
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    # Get VyOS timezone for proper time conversion
    vyos_timezone = await get_vyos_timezone(service)
    if vyos_timezone:
        print(f"[Power] VyOS timezone: {vyos_timezone}")

    # Execute VyOS command
    try:
        response = service.device.poweroff(path=path)
        print(f"[Power] VyOS response status: {response.status}")
        print(f"[Power] VyOS response.result type: {type(response.result)}")
        print(f"[Power] VyOS response.result: {response.result}")

        if response.status != 200:
            raise HTTPException(status_code=500, detail=f"VyOS command failed: {response.error}")

        # Check if VyOS returned an error message (even with 200 status)
        if isinstance(response.result, str) and ("Invalid" in response.result or "Error" in response.result or "Failed" in response.result):
            raise HTTPException(status_code=400, detail=response.result.strip())

        # Parse scheduled time from the response only for "at" action
        # For "in" we already calculated UTC time, don't overwrite with VyOS's local time
        if body.action == "at":
            print(f"[Power] Action is 'at', checking response.result...")
            if response.result:
                print(f"[Power] response.result exists, type: {type(response.result)}")
                # VyOS returns: {"success": true, "data": "Poweroff is scheduled YYYY-MM-DD HH:MM:SS\n", "error": null}
                # The time is in VyOS's local timezone, so we convert it to UTC
                if isinstance(response.result, dict) and "data" in response.result:
                    output = response.result["data"]
                    print(f"[Power] VyOS output for 'at' action: {output}")
                    parsed_time = parse_scheduled_time(output, vyos_timezone)
                    print(f"[Power] Parsed time result: {parsed_time}")
                    if parsed_time:
                        # For "at" action, use parsed and converted time (now in UTC)
                        scheduled_time = parsed_time
                        print(f"[Power] Parsed scheduled time (UTC): {scheduled_time}")
                    else:
                        print(f"[Power] WARNING: Failed to parse scheduled time from VyOS output!")
                elif isinstance(response.result, str):
                    # Maybe it's just a string?
                    print(f"[Power] response.result is a string, trying to parse directly")
                    parsed_time = parse_scheduled_time(response.result, vyos_timezone)
                    if parsed_time:
                        scheduled_time = parsed_time
                        print(f"[Power] Parsed scheduled time (UTC): {scheduled_time}")
                else:
                    print(f"[Power] ERROR: Unexpected response.result structure!")
                    print(f"[Power] response.result: {response.result}")
            else:
                print(f"[Power] ERROR: response.result is None or empty!")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Power] Error in poweroff: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    # Store scheduled action in database (except for 'now' and 'cancel')
    if body.action in ["at", "in"] and scheduled_time:
        async with db_pool.acquire() as conn:
            # Delete any existing scheduled poweroffs for this instance
            await conn.execute(
                """
                DELETE FROM scheduled_power_actions
                WHERE "instanceId" = $1 AND "actionType" = 'poweroff'
                """,
                instance_id,
            )

            # Generate CUID-like id
            action_id = f"c{uuid.uuid4().hex[:24]}"

            # Insert new scheduled action
            await conn.execute(
                """
                INSERT INTO scheduled_power_actions
                (id, "instanceId", "actionType", "scheduledTime", "scheduledBy", "scheduledByName")
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                action_id,
                instance_id,
                "poweroff",
                scheduled_time,
                user["id"],
                user["name"],
            )

    # Build response message
    if body.action == "now":
        message = "System is powering off now"
    elif body.action == "cancel":
        message = "Poweroff cancelled"
    else:
        message = f"Poweroff scheduled for {scheduled_time}"

    # Convert to timezone-aware UTC for proper JSON serialization
    scheduled_time_utc = None
    if scheduled_time:
        scheduled_time_utc = scheduled_time.replace(tzinfo=ZoneInfo("UTC"))

    return PowerActionResponse(
        success=True, message=message, scheduled_time=scheduled_time_utc
    )


# ========================================================================
# Endpoint: Status Check
# ========================================================================


@router.get("/status", response_model=PowerStatusResponse)
async def get_power_status(request: Request):
    """
    Check if a reboot or poweroff is scheduled for the current instance.

    This endpoint is polled by the frontend to display the banner.
    """
    # Get VyOS service and instance info
    service = get_session_vyos_service(request)
    instance = request.state.instance
    instance_id = instance["id"]
    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
        # First, clean up expired actions
        await conn.execute(
            """
            DELETE FROM scheduled_power_actions
            WHERE "instanceId" = $1
              AND "scheduledTime" < NOW()
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
              AND "scheduledTime" > NOW()
            ORDER BY "createdAt" DESC
            LIMIT 1
            """,
            instance_id,
        )

        if not result:
            # No scheduled action
            return PowerStatusResponse(scheduled=False)

        # Check if VyOS still has it scheduled (verify with 'show reboot')
        try:
            # Get VyOS timezone for proper time conversion
            vyos_timezone = await get_vyos_timezone(service)

            response = service.device.show(path=["reboot"])

            if response.status != 200:
                raise Exception(f"VyOS command failed: {response.error}")

            # VyOS returns: {"success": true, "data": "Reboot is scheduled...", "error": null}
            output = ""
            if isinstance(response.result, dict) and "data" in response.result:
                output = response.result["data"]
            elif isinstance(response.result, str):
                output = response.result

            vyos_scheduled_time = parse_scheduled_time(output, vyos_timezone) if output else None

            # If VyOS doesn't have it scheduled, clean up database
            if not vyos_scheduled_time:
                await conn.execute(
                    """
                    DELETE FROM scheduled_power_actions
                    WHERE "instanceId" = $1
                      AND "actionType" = $2
                      AND "scheduledTime" > NOW()
                    """,
                    instance_id,
                    result["actionType"],
                )
                return PowerStatusResponse(scheduled=False)

        except Exception:
            # If we can't check VyOS status, assume it's still scheduled
            pass

        # Convert scheduled_time to timezone-aware UTC for proper JSON serialization
        scheduled_time_utc = result["scheduledTime"]
        if scheduled_time_utc:
            if not hasattr(scheduled_time_utc, 'tzinfo') or scheduled_time_utc.tzinfo is None:
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
