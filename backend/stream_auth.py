"""Authorization helpers for long-lived streams."""

import logging
from dataclasses import dataclass

from fastapi import WebSocket
import revocation_bus
from org_scope import ws_org_conn
from rbac_permissions import FeatureGroup, PermissionLevel, check_permission

logger = logging.getLogger(__name__)

DENIED = "Permissions revoked"
FAILED = "Authorization check failed"


@dataclass(frozen=True)
class StreamRecheck:
    allowed: bool
    failed: bool = False

    @property
    def close_reason(self) -> str | None:
        if self.failed:
            return FAILED
        if not self.allowed:
            return DENIED
        return None


async def fail_closed(check) -> StreamRecheck:
    """Run an access check. An error closes the stream instead of leaving it open."""
    try:
        return StreamRecheck(allowed=bool(await check()))
    except Exception:
        logger.exception("Authorization recheck failed")
        return StreamRecheck(allowed=False, failed=True)


async def recheck_permission(
    connection,
    user_id: str,
    instance_id: str,
    feature: FeatureGroup,
    level: PermissionLevel,
    org_id: str | None = None,
) -> StreamRecheck:
    async def check() -> bool:
        async with connection as conn:
            return await check_permission(
                conn,
                user_id,
                instance_id,
                feature,
                level,
                org_id=org_id,
            )

    return await fail_closed(check)


async def recheck_stream_permission(
    websocket: WebSocket,
    user_id: str,
    instance_id: str,
    feature: FeatureGroup,
    level: PermissionLevel = PermissionLevel.WRITE,
) -> StreamRecheck:
    return await recheck_permission(
        ws_org_conn(websocket, user_id, instance_id),
        user_id,
        instance_id,
        feature,
        level,
    )


async def watch_stream_revocation(
    websocket: WebSocket,
    user_id: str,
    instance_id: str,
    feature: FeatureGroup,
    on_close=None,
) -> None:
    """Close the stream when a matching revocation removes access or cannot be checked."""
    queue = revocation_bus.subscribe()
    try:
        while True:
            payload = await queue.get()
            if not revocation_bus.payload_matches(
                payload, user_id=user_id, instance_id=instance_id
            ):
                continue
            result = await recheck_stream_permission(
                websocket, user_id, instance_id, feature
            )
            if result.close_reason:
                if on_close is not None:
                    await on_close(result.close_reason)
                return
    finally:
        revocation_bus.unsubscribe(queue)
