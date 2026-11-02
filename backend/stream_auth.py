"""Authorization helpers for long-lived WebSocket streams."""

import logging

from fastapi import WebSocket
from org_scope import ws_org_conn
from rbac_permissions import FeatureGroup, PermissionLevel, check_permission

logger = logging.getLogger(__name__)


async def recheck_stream_permission(
    websocket: WebSocket,
    user_id: str,
    instance_id: str,
    feature: FeatureGroup,
) -> bool:
    """Recheck stream access, failing closed when authorization cannot be verified."""
    try:
        async with ws_org_conn(websocket, user_id, instance_id) as conn:
            return await check_permission(
                conn,
                user_id,
                instance_id,
                feature,
                PermissionLevel.WRITE,
            )
    except Exception:
        logger.exception(
            "Stream authorization recheck failed for user %s and instance %s",
            user_id,
            instance_id,
        )
        return False
