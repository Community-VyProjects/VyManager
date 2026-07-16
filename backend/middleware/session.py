"""
Session Middleware

Resolves the user's active VyOS instance and injects it into request state.
This middleware runs after AuthenticationMiddleware and makes the active
instance available to all route handlers.
"""

import logging

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import asyncpg
from typing import Optional
from session_cookie import verify_session_cookie


logger = logging.getLogger(__name__)


class _SecureStr:
    """Wraps a sensitive string to prevent accidental logging or serialization.

    repr() and str() return '[REDACTED]' so the value never appears in logs.
    JSON serialization raises TypeError to prevent accidental data exposure.
    Use .value to access the underlying string only where it is explicitly needed.
    """
    __slots__ = ("_value",)

    def __init__(self, value: str):
        self._value = value

    @property
    def value(self) -> str:
        return self._value

    def __repr__(self) -> str:
        return "'[REDACTED]'"

    def __str__(self) -> str:
        return "[REDACTED]"


class SessionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to resolve active VyOS instance for authenticated users.

    After authentication, this middleware:
    1. Checks if user has an active session
    2. Loads instance details from database
    3. Injects instance info into request.state

    Protected routes can then access request.state.instance to know
    which VyOS device the user is currently managing.
    """

    # Endpoints that should NOT update activity timestamp
    # These are background polling endpoints - not real user activity
    POLLING_ENDPOINTS = {
        "/vyos/config/diff",
        "/vyos/config/snapshot",
        "/session/current",
        "/vyos/power/status",
    }

    def __init__(self, app):
        super().__init__(app)

    # Shared SELECT projection so cookie and token resolution yield identical rows.
    _INSTANCE_COLUMNS = """
        i.id as instance_id,
        i.name as instance_name,
        i.host,
        i.port,
        i."apiKey" as api_key,
        i."isActive" as is_active,
        i."siteId" as site_id,
        i."vyosVersion" as vyos_version,
        i.protocol,
        i."verifySsl" as verify_ssl,
        i."commitConfirmEnabled" as commit_confirm_enabled,
        i."commitConfirmMinutes" as commit_confirm_minutes,
        i.timeout,
        s.name as site_name,
        s."orgId" as org_id,
        o.name as org_name
    """

    async def _resolve_cookie_instance(self, conn, request: Request, path: str, user_id: str, user_site_role):
        """Resolve the user's single active instance from active_sessions (browser cookie flow)."""
        cookie_token = request.cookies.get("better-auth.session_token")
        current_session_token = verify_session_cookie(cookie_token) if cookie_token else None

        # Site ADMINs don't need user_instance_roles entries - they get ADMIN role automatically
        if user_site_role == "ADMIN":
            session = await conn.fetchrow(
                f"""
                SELECT {self._INSTANCE_COLUMNS},
                    a."sessionToken" as session_token,
                    'ADMIN' as user_role
                FROM active_sessions a
                JOIN instances i ON a."instanceId" = i.id
                JOIN sites s ON i."siteId" = s.id
                LEFT JOIN organizations o ON o.id = s."orgId"
                WHERE a."userId" = $1
                """,
                user_id,
            )
        else:
            # Regular users need explicit instance-level role assignment
            session = await conn.fetchrow(
                f"""
                SELECT {self._INSTANCE_COLUMNS},
                    a."sessionToken" as session_token,
                    uir.role as user_role
                FROM active_sessions a
                JOIN instances i ON a."instanceId" = i.id
                JOIN sites s ON i."siteId" = s.id
                LEFT JOIN organizations o ON o.id = s."orgId"
                JOIN user_instance_roles uir
                    ON (uir."instanceId" = i.id OR uir."siteId" = i."siteId")
                    AND uir."userId" = $1
                WHERE a."userId" = $1
                ORDER BY CASE uir.role
                    WHEN 'ADMIN' THEN 3 WHEN 'OPERATOR' THEN 2 WHEN 'VIEWER' THEN 1 ELSE 0
                END DESC
                LIMIT 1
                """,
                user_id,
            )

        # If the active session belongs to a different auth session (login from a
        # new device), clear it so the user must reconnect to an instance.
        if session:
            stored_session_token = session.get("session_token")
            if stored_session_token and current_session_token and stored_session_token != current_session_token:
                await conn.execute('DELETE FROM active_sessions WHERE "userId" = $1', user_id)
                return None

            # Session tokens match - update activity (skip background polling).
            if path not in self.POLLING_ENDPOINTS:
                await conn.execute(
                    'UPDATE active_sessions SET "lastActivityAt" = NOW() WHERE "userId" = $1',
                    user_id,
                )
        return session

    @staticmethod
    def _token_allows_instance(request: Request, instance_id: str, site_id: str) -> bool:
        """
        Apply a scoped token's instance/site restriction.

        Empty restrictions = the token may reach any instance the user is granted.
        Otherwise the instance must be explicitly allowed, or belong to an allowed
        site. (The user-grant check has already run separately.)
        """
        allowed_instances = getattr(request.state, "api_token_allowed_instance_ids", None) or []
        allowed_sites = getattr(request.state, "api_token_allowed_site_ids", None) or []
        if not allowed_instances and not allowed_sites:
            return True
        return instance_id in allowed_instances or site_id in allowed_sites

    async def _resolve_instance_for_user(self, conn, user_id: str, user_site_role, instance_id: str):
        """
        Resolve a specific instance by id for a token client.

        Returns the instance row only if the user is a site ADMIN or holds a
        user_instance_roles grant (per-instance or whole-site) on it; otherwise
        None. This is where per-user RBAC gates which devices a token may reach.
        """
        if user_site_role == "ADMIN":
            return await conn.fetchrow(
                f"""
                SELECT {self._INSTANCE_COLUMNS}, 'ADMIN' as user_role
                FROM instances i
                JOIN sites s ON i."siteId" = s.id
                LEFT JOIN organizations o ON o.id = s."orgId"
                WHERE i.id = $1
                """,
                instance_id,
            )
        return await conn.fetchrow(
            f"""
            SELECT {self._INSTANCE_COLUMNS}, uir.role as user_role
            FROM instances i
            JOIN sites s ON i."siteId" = s.id
            LEFT JOIN organizations o ON o.id = s."orgId"
            JOIN user_instance_roles uir
                ON (uir."instanceId" = i.id OR uir."siteId" = i."siteId")
                AND uir."userId" = $2
            WHERE i.id = $1
            ORDER BY CASE uir.role
                WHEN 'ADMIN' THEN 3 WHEN 'OPERATOR' THEN 2 WHEN 'VIEWER' THEN 1 ELSE 0
            END DESC
            LIMIT 1
            """,
            instance_id, user_id,
        )

    async def dispatch(self, request: Request, call_next):
        """Process the request and resolve active instance."""

        # Skip session resolution for public routes
        path = request.url.path
        public_paths = [
            "/",
            "/docs",
            "/openapi.json",
            "/redoc",
        ]

        # Skip for session management endpoints (they handle their own lookups)
        if path.startswith("/session"):
            return await call_next(request)

        if path in public_paths or path.startswith("/docs"):
            return await call_next(request)

        # Only resolve session for authenticated users
        if not hasattr(request.state, "user") or not request.state.user:
            # No user - authentication middleware will handle this
            return await call_next(request)

        # Get user ID
        user_id = request.state.user["id"]

        # Get database pool from app state
        db_pool: Optional[asyncpg.Pool] = getattr(request.app.state, "db_pool", None)

        if not db_pool:
            # Database not available - continue without instance resolution
            request.state.instance = None
            request.state.site = None
            request.state.org = None
            return await call_next(request)

        # Token clients (e.g. the MCP server) authenticate without a cookie and
        # select their instance explicitly per request.
        is_token_auth = getattr(request.state, "auth_method", None) == "api_token"

        try:
            async with db_pool.acquire() as conn:
                # This middleware CREATES the org context by reading org-scoped
                # tables (instances, sites) to resolve the active instance. That
                # read happens before any org context exists, so under FORCE RLS
                # as the fenced role it would be denied. Run the resolution in a
                # transaction with a temporary operator bypass; every query here
                # is scoped to this user, so the bypass cannot leak other rows.
                async with conn.transaction():
                    await conn.execute(
                        "SELECT set_config('app.is_system_admin', 'true', true)")
                    # Site ADMINs reach every instance; regular users need a grant.
                    user_site_role = await conn.fetchval(
                        "SELECT role FROM users WHERE id = $1",
                        user_id,
                    )
                    # Deployment-operator flag for org-scoped connections
                    # (org_scope.py) — resolved here anyway, so keep it.
                    request.state.user_role = user_site_role

                    if is_token_auth:
                        instance_id = request.headers.get("X-VyOS-Instance-Id")
                        if instance_id:
                            session = await self._resolve_instance_for_user(
                                conn, user_id, user_site_role, instance_id
                            )
                            # Beyond the user's grant, a scoped token may only
                            # reach the instances/sites it was restricted to.
                            if session and not self._token_allows_instance(
                                request, session["instance_id"], session["site_id"]
                            ):
                                session = None
                        else:
                            # No instance named - downstream read/write handlers
                            # report "no active instance" as for a disconnect.
                            session = None
                    else:
                        session = await self._resolve_cookie_instance(
                            conn, request, path, user_id, user_site_role
                        )

                if session:
                    # User has an active session - inject instance details.
                    # api_key is wrapped in _SecureStr so it never appears in logs.
                    # Legacy username/password fields are omitted (always empty, never used).
                    request.state.instance = {
                        "id": session["instance_id"],
                        "name": session["instance_name"],
                        "host": session["host"],
                        "port": session["port"],
                        "api_key": _SecureStr(session["api_key"] or ""),
                        "is_active": session["is_active"],
                        "vyos_version": session.get("vyos_version"),
                        "protocol": session.get("protocol"),
                        "verify_ssl": session.get("verify_ssl"),
                        "commit_confirm_enabled": session.get("commit_confirm_enabled") or False,
                        "commit_confirm_minutes": session.get("commit_confirm_minutes") or 5,
                        "timeout": session.get("timeout") or 10,
                    }
                    request.state.site = {
                        "id": session["site_id"],
                        "name": session["site_name"],
                        "user_role": session["user_role"],
                    }
                    # Org derived from the active instance
                    # (instance -> site -> org); the LEFT JOIN keeps a
                    # pre-migration row resolvable, hence the None guard.
                    request.state.org = (
                        {"id": session["org_id"], "name": session["org_name"]}
                        if session.get("org_id") else None
                    )
                else:
                    # No active session
                    request.state.instance = None
                    request.state.site = None
                    request.state.org = None

        except Exception:
            # Session resolution failed (e.g. transient DB error). Continue
            # with no active instance, but never silently: downstream this
            # surfaces as a spurious "no active instance" 400, and without
            # the log line the real cause is invisible.
            logger.exception("Active-session resolution failed; continuing without an instance")
            request.state.instance = None
            request.state.site = None
            request.state.org = None

        # Continue with the request
        response = await call_next(request)
        return response


def require_active_instance(request: Request):
    """
    Helper function to require an active instance.

    Use this in route handlers that need an active VyOS instance.

    Example:
        @router.get("/interfaces")
        async def get_interfaces(request: Request):
            instance = require_active_instance(request)
            # Use instance details...
    """
    if not hasattr(request.state, "instance") or not request.state.instance:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "No active instance",
                "message": "You must connect to a VyOS instance first. Use POST /session/connect.",
            },
        )

    if not request.state.instance["is_active"]:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Instance is inactive",
                "message": f"Instance '{request.state.instance['name']}' is currently inactive.",
            },
        )

    return request.state.instance
