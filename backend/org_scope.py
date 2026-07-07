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

from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

import asyncpg
from fastapi import Request


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


async def org_conn(request: Request) -> AsyncIterator[asyncpg.Connection]:
    """FastAPI dependency: the handler's whole body is one unit of work.

    Yields a connection inside an org-scoped transaction and exposes it as
    request.state.org_conn so nested permission checks join the same
    transaction instead of opening their own.
    """
    pool: asyncpg.Pool = request.app.state.db_pool
    async with pool.acquire() as conn:
        async with conn.transaction():
            is_admin = await _resolve_system_admin(conn, request)
            await conn.execute(
                "SELECT set_config('app.org_id', $1, true),"
                "       set_config('app.is_system_admin', $2, true)",
                org_id_from_state(request) or "",
                "true" if is_admin else "false",
            )
            request.state.org_conn = conn
            try:
                yield conn
            finally:
                request.state.org_conn = None


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
