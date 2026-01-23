"""
Audit Logging Service

Provides audit logging for security-sensitive actions.
All configuration changes, user management actions, and authentication
events should be logged for security compliance and troubleshooting.
"""

import asyncpg
import secrets
import string
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import Request
from enum import Enum
import json


class AuditAction(str, Enum):
    """Enumeration of auditable actions."""

    # Authentication Events
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILURE = "LOGIN_FAILURE"
    LOGOUT = "LOGOUT"
    SESSION_REVOKED = "SESSION_REVOKED"

    # User Management
    USER_CREATED = "USER_CREATED"
    USER_UPDATED = "USER_UPDATED"
    USER_DELETED = "USER_DELETED"
    USER_ROLE_CHANGED = "USER_ROLE_CHANGED"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"

    # Instance Management
    INSTANCE_CREATED = "INSTANCE_CREATED"
    INSTANCE_UPDATED = "INSTANCE_UPDATED"
    INSTANCE_DELETED = "INSTANCE_DELETED"
    INSTANCE_CONNECTED = "INSTANCE_CONNECTED"
    INSTANCE_DISCONNECTED = "INSTANCE_DISCONNECTED"

    # Site Management
    SITE_CREATED = "SITE_CREATED"
    SITE_UPDATED = "SITE_UPDATED"
    SITE_DELETED = "SITE_DELETED"

    # VyOS Configuration Changes
    CONFIG_CHANGED = "CONFIG_CHANGED"
    CONFIG_COMMITTED = "CONFIG_COMMITTED"
    CONFIG_SAVED = "CONFIG_SAVED"
    CONFIG_DISCARDED = "CONFIG_DISCARDED"
    CONFIG_RESTORED = "CONFIG_RESTORED"

    # Firewall
    FIREWALL_RULE_CREATED = "FIREWALL_RULE_CREATED"
    FIREWALL_RULE_UPDATED = "FIREWALL_RULE_UPDATED"
    FIREWALL_RULE_DELETED = "FIREWALL_RULE_DELETED"
    FIREWALL_GROUP_CREATED = "FIREWALL_GROUP_CREATED"
    FIREWALL_GROUP_UPDATED = "FIREWALL_GROUP_UPDATED"
    FIREWALL_GROUP_DELETED = "FIREWALL_GROUP_DELETED"

    # NAT
    NAT_RULE_CREATED = "NAT_RULE_CREATED"
    NAT_RULE_UPDATED = "NAT_RULE_UPDATED"
    NAT_RULE_DELETED = "NAT_RULE_DELETED"

    # Interfaces
    INTERFACE_CREATED = "INTERFACE_CREATED"
    INTERFACE_UPDATED = "INTERFACE_UPDATED"
    INTERFACE_DELETED = "INTERFACE_DELETED"

    # Routing
    ROUTE_CREATED = "ROUTE_CREATED"
    ROUTE_UPDATED = "ROUTE_UPDATED"
    ROUTE_DELETED = "ROUTE_DELETED"

    # VPN
    VPN_TUNNEL_CREATED = "VPN_TUNNEL_CREATED"
    VPN_TUNNEL_UPDATED = "VPN_TUNNEL_UPDATED"
    VPN_TUNNEL_DELETED = "VPN_TUNNEL_DELETED"

    # System
    SYSTEM_REBOOT = "SYSTEM_REBOOT"
    SYSTEM_SHUTDOWN = "SYSTEM_SHUTDOWN"
    SYSTEM_REBOOT_SCHEDULED = "SYSTEM_REBOOT_SCHEDULED"
    SYSTEM_SHUTDOWN_SCHEDULED = "SYSTEM_SHUTDOWN_SCHEDULED"
    SYSTEM_REBOOT_CANCELLED = "SYSTEM_REBOOT_CANCELLED"
    SYSTEM_SHUTDOWN_CANCELLED = "SYSTEM_SHUTDOWN_CANCELLED"

    # Import/Export
    DATA_EXPORTED = "DATA_EXPORTED"
    DATA_IMPORTED = "DATA_IMPORTED"

    # Configuration Backups
    CONFIG_BACKUP_CREATED = "CONFIG_BACKUP_CREATED"
    CONFIG_BACKUP_DELETED = "CONFIG_BACKUP_DELETED"
    CONFIG_RESTORE_INITIATED = "CONFIG_RESTORE_INITIATED"


class AuditService:
    """
    Service for writing audit logs to the database.

    Usage:
        audit = AuditService(db_pool)
        await audit.log(
            request=request,
            action=AuditAction.FIREWALL_RULE_CREATED,
            resource="firewall.ipv4.rule.100",
            details={"chain": "INPUT", "action": "accept"}
        )
    """

    def __init__(self, db_pool: asyncpg.Pool):
        """
        Initialize the audit service.

        Args:
            db_pool: asyncpg connection pool
        """
        self.db_pool = db_pool

    async def log(
        self,
        request: Request,
        action: AuditAction,
        resource: str,
        details: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
    ) -> str:
        """
        Write an audit log entry.

        Args:
            request: FastAPI request object (for user info, IP, user agent)
            action: The action being performed
            resource: Resource identifier (e.g., "firewall.ipv4.rule.100")
            details: Additional context about the action
            user_id: Override user ID (if not available in request)
            user_email: Override user email (if not available in request)

        Returns:
            The ID of the created audit log entry
        """
        # Get user info from request state or parameters
        if user_id is None and hasattr(request.state, "user") and request.state.user:
            user_id = request.state.user.get("id", "unknown")
        if user_email is None and hasattr(request.state, "user") and request.state.user:
            user_email = request.state.user.get("email", "unknown")

        user_id = user_id or "unknown"
        user_email = user_email or "unknown"

        # Get IP address (handle proxies)
        ip_address = self._get_client_ip(request)

        # Get user agent
        user_agent = request.headers.get("user-agent", "")[:500]  # Truncate to 500 chars

        # Generate ID
        alphabet = string.ascii_letters + string.digits
        log_id = ''.join(secrets.choice(alphabet) for _ in range(25))

        # Write to database
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO audit_logs (id, "userId", "userEmail", action, resource, details, "ipAddress", "userAgent", "createdAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                """,
                log_id,
                user_id,
                user_email,
                action.value if isinstance(action, AuditAction) else str(action),
                resource,
                json.dumps(details) if details else None,
                ip_address,
                user_agent,
            )

        # Also print to console for immediate visibility
        print(f"[Audit] {action.value if isinstance(action, AuditAction) else action}: {resource} by {user_email} ({ip_address})")

        return log_id

    def _get_client_ip(self, request: Request) -> str:
        """
        Get the client's IP address, handling common proxy headers.

        Args:
            request: FastAPI request object

        Returns:
            The client's IP address
        """
        # Check X-Forwarded-For header (set by proxies/load balancers)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP (original client)
            return forwarded_for.split(",")[0].strip()

        # Check X-Real-IP header (set by some proxies)
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # Fall back to direct client connection
        if request.client:
            return request.client.host

        return "unknown"


async def get_audit_service(request: Request) -> AuditService:
    """
    Dependency to get the audit service from the request.

    Usage in endpoints:
        @router.post("/something")
        async def create_something(request: Request):
            audit = await get_audit_service(request)
            await audit.log(request, AuditAction.SOMETHING_CREATED, "resource.id")

    Returns:
        AuditService instance
    """
    db_pool = getattr(request.app.state, "db_pool", None)
    if not db_pool:
        raise ValueError("Database pool not available")
    return AuditService(db_pool)


# Convenience function for quick logging without creating a service instance
async def audit_log(
    request: Request,
    action: AuditAction,
    resource: str,
    details: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    """
    Convenience function to log an audit event.

    Args:
        request: FastAPI request object
        action: The action being performed
        resource: Resource identifier
        details: Additional context

    Returns:
        The audit log ID, or None if logging failed
    """
    try:
        audit = await get_audit_service(request)
        return await audit.log(request, action, resource, details)
    except Exception as e:
        # Don't let audit logging failures break the main request
        print(f"[Audit] Warning: Failed to log audit event: {e}")
        return None
