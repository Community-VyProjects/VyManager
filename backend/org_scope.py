"""Org-scoped database access.

Every database touch runs inside a transaction that carries the request's
organization context as PostgreSQL settings:

    app.org_id           the acting organization id, or '' when the request
                         has no org context (deployment-operator surface).
                         Organizations can never have an empty-string id
                         (DB CHECK constraint), so the sentinel cannot
                         collide with a real org.
    app.is_system_admin  'true' only for deployment operators
                         (users.role = 'ADMIN'). This is the single,
                         greppable bypass flag for row-level security.

Both are SET LOCAL (set_config(..., true)), so they die with the
transaction and can never leak across requests on a pooled connection.

THE RULE — one unit of work = one org_scoped_conn acquisition. A logically
atomic read-modify-write must never split across two acquisitions: the
second acquisition is a new transaction on (possibly) another connection,
and the data read under the first is stale by then. Handlers that own
queries take the whole handler as their unit of work via the org_conn
dependency; the permission check path is read-only and uses one short
acquisition of its own.
"""

import os
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

import asyncpg
from fastapi import HTTPException, Query, Request


# Master switch for organization enforcement. Off by default: the whole
# hardening chain lands behind it so each step is inert on today's single-org
# deployments and only becomes load-bearing when this flips on.
ORG_ENFORCEMENT = os.getenv("ORG_ENFORCEMENT", "").strip().lower() in (
    "1", "true", "yes", "on"
)


def _require_pool(request: Request) -> asyncpg.Pool:
    pool = getattr(request.app.state, "db_pool", None)
    if pool is None:
        raise HTTPException(status_code=503, detail="Database not available")
    return pool


@asynccontextmanager
async def org_scoped_conn(
    pool: asyncpg.Pool,
    org_id: Optional[str],
    is_system_admin: bool,
) -> AsyncIterator[asyncpg.Connection]:
    """One connection, one transaction, org context applied.

    The building block for every DB unit of work. SET LOCAL cannot bind
    parameters, so set_config(..., is_local => true) — its exact
    equivalent — is used instead.
    """
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                "SELECT set_config('app.org_id', $1, true),"
                "       set_config('app.is_system_admin', $2, true)",
                org_id or "",
                "true" if is_system_admin else "false",
            )
            yield conn


def org_id_from_state(request: Request) -> Optional[str]:
    """The org derived by SessionMiddleware (instance -> site -> org)."""
    org = getattr(request.state, "org", None)
    return org["id"] if org else None


def is_system_admin_from_state(request: Request) -> Optional[bool]:
    """Deployment-operator flag when middleware already resolved the role.

    None means the role was not resolved on this request path (e.g.
    /session/*, which SessionMiddleware skips) and must be fetched.
    """
    role = getattr(request.state, "user_role", None)
    return None if role is None else role == "ADMIN"


async def _resolve_system_admin(conn: asyncpg.Connection, request: Request) -> bool:
    known = is_system_admin_from_state(request)
    if known is not None:
        return known
    user = getattr(request.state, "user", None)
    if not user:
        return False
    role = await conn.fetchval("SELECT role FROM users WHERE id = $1", user["id"])
    return role == "ADMIN"


async def _resolve_admin_org(
    conn: asyncpg.Connection,
    request: Request,
    requested_org_id: Optional[str],
    is_system_admin: bool,
) -> str:
    """Validate an explicitly requested org for a no-instance endpoint.

    The org must exist and (unless the caller is a System Administrator)
    be one of the caller's organizations.
    """
    user = getattr(request.state, "user", None)
    exists = await conn.fetchval(
        "SELECT 1 FROM organizations WHERE id = $1", requested_org_id)
    if not exists:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not is_system_admin:
        member = user and await conn.fetchval(
            'SELECT 1 FROM org_memberships'
            ' WHERE "userId" = $1 AND "orgId" = $2',
            user["id"], requested_org_id)
        if not member:
            raise HTTPException(
                status_code=403,
                detail="You are not a member of this organization")
    return requested_org_id


@asynccontextmanager
async def _handler_conn(
    request: Request,
    requested_org_id: Optional[str],
) -> AsyncIterator[asyncpg.Connection]:
    """Shared core of the handler dependencies.

    The handler's whole body is one unit of work; the connection is exposed
    as request.state.org_conn so nested permission checks join the same
    transaction instead of opening their own.
    """
    pool = _require_pool(request)
    user = getattr(request.state, "user", None)
    async with pool.acquire() as conn:
        async with conn.transaction():
            # Bootstrap bypass: the org-context derivation below reads
            # org-scoped tables (org_memberships) to find WHO/WHERE before org
            # context exists. Under FORCE RLS as the fenced role those reads
            # would be denied, so run them with a temporary operator bypass.
            # The real context is set below; the derivation queries are
            # userId-scoped, so the bypass cannot leak another user's rows.
            await conn.execute(
                "SELECT set_config('app.is_system_admin', 'true', true)")

            org_id = org_id_from_state(request)
            is_admin = is_system_admin_from_state(request)

            if requested_org_id and org_id is None:
                if is_admin is None:
                    is_admin = await _resolve_system_admin(conn, request)
                org_id = await _resolve_admin_org(
                    conn, request, requested_org_id, is_admin)
            elif user and (is_admin is None or org_id is None):
                # One round trip resolves both the deployment role and the
                # sole-org default — this dependency runs on every admin
                # request, so per-query trips matter.
                row = await conn.fetchrow(
                    "SELECT (SELECT role FROM users WHERE id = $1) AS role,"
                    ' ARRAY(SELECT "orgId" FROM org_memberships'
                    '       WHERE "userId" = $1 ORDER BY "orgId" LIMIT 2)'
                    " AS orgs",
                    user["id"])
                if is_admin is None:
                    is_admin = row["role"] == "ADMIN"
                if org_id is None:
                    orgs = row["orgs"]
                    if len(orgs) == 1:
                        org_id = orgs[0]
                    elif len(orgs) > 1:
                        raise HTTPException(
                            status_code=400,
                            detail="You belong to multiple organizations;"
                                   " pass org_id")

            if is_admin is None:
                is_admin = False
            await conn.execute(
                "SELECT set_config('app.org_id', $1, true),"
                "       set_config('app.is_system_admin', $2, true)",
                org_id or "",
                "true" if is_admin else "false",
            )
            # Exposed for by-id row-org checks (assert_row_in_acting_org).
            request.state.acting_org_id = org_id
            request.state.is_system_admin = is_admin
            request.state.org_conn = conn
            try:
                yield conn
            finally:
                request.state.org_conn = None


async def org_conn(request: Request) -> AsyncIterator[asyncpg.Connection]:
    """FastAPI dependency for handlers whose org context comes from the
    active instance (SessionMiddleware) or is deliberately absent."""
    async with _handler_conn(request, None) as conn:
        yield conn


async def org_conn_self(request: Request) -> AsyncIterator[asyncpg.Connection]:
    """Connection for endpoints that read only the caller's OWN rows
    (userId-scoped, e.g. listing the caller's organization memberships).

    Sets the operator bypass so those reads succeed under RLS without needing
    a single acting org; safe because every query on this connection is scoped
    to the caller's user id, so nothing else can be returned.
    """
    pool = _require_pool(request)
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                "SELECT set_config('app.is_system_admin', 'true', true)")
            yield conn


async def org_conn_admin(
    request: Request,
    org_id: Optional[str] = Query(
        None,
        description="Organization to act in; defaults to your sole organization.",
    ),
) -> AsyncIterator[asyncpg.Connection]:
    """FastAPI dependency for the admin surface (sites, instances, users,
    tokens, backup): no active instance required; org context comes from
    the optional org_id parameter or the caller's sole membership."""
    async with _handler_conn(request, org_id) as conn:
        yield conn


def _ws_pool(websocket) -> asyncpg.Pool:
    pool = getattr(websocket.app.state, "db_pool", None)
    if pool is None:
        raise RuntimeError("Database not available")
    return pool


@asynccontextmanager
async def ws_conn(websocket) -> AsyncIterator[asyncpg.Connection]:
    """Identity-resolution connection for a WebSocket, which authenticates
    outside the HTTP middleware. No org context yet — this is the pre-org
    "who is this and what is their active instance" lookup, the WS analogue
    of the auth middleware. Keeping the pool access here (not in the router)
    keeps the WS routers off the unscoped-connection canary."""
    pool = _ws_pool(websocket)
    async with pool.acquire() as conn:
        yield conn


@asynccontextmanager
async def ws_org_conn(
    websocket, user_id: str, instance_id: str
) -> AsyncIterator[asyncpg.Connection]:
    """One short org-scoped connection for a WebSocket unit of work.

    Resolves the instance's org and the user's deployment role, applies the
    org context, and yields. A WS holds a long-lived SSH stream, so — like the
    /vyos permission path — it must take short scoped connections per unit of
    work, never hold one across the stream.
    """
    pool = _ws_pool(websocket)
    async with pool.acquire() as conn:
        async with conn.transaction():
            # Bootstrap bypass to derive the instance's org before org context
            # exists (see _handler_conn); overwritten with real context below.
            await conn.execute(
                "SELECT set_config('app.is_system_admin', 'true', true)")
            row = await conn.fetchrow(
                'SELECT s."orgId" AS org_id,'
                ' (SELECT role FROM users WHERE id = $2) AS role'
                ' FROM instances i JOIN sites s ON i."siteId" = s.id'
                ' WHERE i.id = $1',
                instance_id, user_id)
            org_id = row["org_id"] if row else None
            is_admin = bool(row and row["role"] == "ADMIN")
            await conn.execute(
                "SELECT set_config('app.org_id', $1, true),"
                "       set_config('app.is_system_admin', $2, true)",
                org_id or "",
                "true" if is_admin else "false",
            )
            yield conn


@asynccontextmanager
async def request_scoped_conn(request: Request) -> AsyncIterator[asyncpg.Connection]:
    """Org-scoped connection for code called from request context.

    Joins the handler's org_conn transaction when one is open; otherwise
    opens a short-lived org_scoped_conn of its own (the /vyos/* permission
    path, where the handler holds no DB connection across its VyOS call).
    """
    existing = getattr(request.state, "org_conn", None)
    if existing is not None:
        yield existing
        return

    pool: asyncpg.Pool = request.app.state.db_pool
    known_admin = is_system_admin_from_state(request)
    if known_admin is None:
        async with pool.acquire() as conn:
            async with conn.transaction():
                is_admin = await _resolve_system_admin(conn, request)
                await conn.execute(
                    "SELECT set_config('app.org_id', $1, true),"
                    "       set_config('app.is_system_admin', $2, true)",
                    org_id_from_state(request) or "",
                    "true" if is_admin else "false",
                )
                yield conn
        return

    async with org_scoped_conn(
        pool, org_id_from_state(request), known_admin
    ) as conn:
        yield conn


async def assert_row_in_acting_org(
    request: Request,
    conn: asyncpg.Connection,
    row_org_id: Optional[str],
) -> None:
    """Assert a by-id target belongs to the caller's acting organization.

    The deny-by-default half of the IDOR defense: a mutation keyed on a
    user-supplied id must confirm the target row is in the caller's org, not
    only that the caller has the role. Returns 404 (not 403) on a cross-org
    id so row existence does not leak.

    Inert unless ORG_ENFORCEMENT is on, so it is a no-op on today's single-org
    deployments and only becomes load-bearing at the enforcement flip. System
    Administrators bypass. RLS is the eventual backstop for the same class.
    """
    if not ORG_ENFORCEMENT:
        return
    if await _resolve_system_admin(conn, request):
        return

    acting = (getattr(request.state, "acting_org_id", None)
              or org_id_from_state(request))
    if acting is None:
        user = getattr(request.state, "user", None)
        if user:
            rows = await conn.fetch(
                'SELECT "orgId" FROM org_memberships WHERE "userId" = $1'
                ' ORDER BY "orgId" LIMIT 2',
                user["id"])
            if len(rows) == 1:
                acting = rows[0]["orgId"]

    if row_org_id is None or acting is None or row_org_id != acting:
        raise HTTPException(status_code=404, detail="Not found")
