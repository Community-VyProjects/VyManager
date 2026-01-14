"""
Audit Logging Utilities

Provides functions for recording audit events to the database.
Uses the AuditLog model from the Prisma schema.
"""

import json
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import Request
import asyncpg

from .logging import get_logger

logger = get_logger(__name__)


async def log_audit_event(
    request: Request,
    action: str,
    resource: str,
    details: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
) -> None:
    """
    Log an audit event to the database.

    Args:
        request: FastAPI request object (to get db_pool and user info)
        action: Action performed (e.g., "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT")
        resource: Resource affected (e.g., "instance", "site", "user", "session")
        details: Additional details as dictionary
        user_id: User ID (if not available from request.state)

    Example:
        await log_audit_event(
            request,
            action="CREATE",
            resource="instance",
            details={"instance_id": "abc123", "name": "vyos-router-1"}
        )
    """
    try:
        # Get database pool
        db_pool: asyncpg.Pool = getattr(request.app.state, "db_pool", None)
        if not db_pool:
            logger.warning("Cannot log audit event: database not available")
            return

        # Get user ID from request state or parameter
        if not user_id and hasattr(request.state, "user_id"):
            user_id = request.state.user_id

        if not user_id:
            logger.warning(f"Cannot log audit event: no user ID for action={action} resource={resource}")
            return

        # Sanitize details - remove sensitive data
        safe_details = None
        if details:
            safe_details = {
                k: v for k, v in details.items()
                if k.lower() not in ("password", "api_key", "apikey", "token", "secret")
            }
            safe_details = json.dumps(safe_details)

        # Generate audit log ID
        import uuid
        audit_id = str(uuid.uuid4())

        # Insert audit log
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO audit_logs (id, "userId", action, resource, details, "createdAt")
                VALUES ($1, $2, $3, $4, $5, NOW())
                """,
                audit_id,
                user_id,
                action,
                resource,
                safe_details,
            )

        logger.debug(f"Audit logged: user={user_id} action={action} resource={resource}")

    except Exception as e:
        # Don't fail the request if audit logging fails
        logger.error(f"Failed to log audit event: {type(e).__name__}")


# Convenience functions for common actions

async def audit_create(request: Request, resource: str, details: Optional[Dict] = None) -> None:
    """Log a CREATE action."""
    await log_audit_event(request, "CREATE", resource, details)


async def audit_update(request: Request, resource: str, details: Optional[Dict] = None) -> None:
    """Log an UPDATE action."""
    await log_audit_event(request, "UPDATE", resource, details)


async def audit_delete(request: Request, resource: str, details: Optional[Dict] = None) -> None:
    """Log a DELETE action."""
    await log_audit_event(request, "DELETE", resource, details)


async def audit_login(request: Request, user_id: str, details: Optional[Dict] = None) -> None:
    """Log a LOGIN action."""
    await log_audit_event(request, "LOGIN", "session", details, user_id=user_id)


async def audit_logout(request: Request, details: Optional[Dict] = None) -> None:
    """Log a LOGOUT action."""
    await log_audit_event(request, "LOGOUT", "session", details)


async def audit_connect(request: Request, details: Optional[Dict] = None) -> None:
    """Log a CONNECT action (to VyOS instance)."""
    await log_audit_event(request, "CONNECT", "vyos_instance", details)


async def audit_disconnect(request: Request, details: Optional[Dict] = None) -> None:
    """Log a DISCONNECT action (from VyOS instance)."""
    await log_audit_event(request, "DISCONNECT", "vyos_instance", details)


async def audit_config_change(request: Request, details: Optional[Dict] = None) -> None:
    """Log a CONFIG_CHANGE action."""
    await log_audit_event(request, "CONFIG_CHANGE", "vyos_config", details)
