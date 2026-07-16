"""Startup gate: wait for the Prisma-managed schema before serving.

Migrations run in the frontend container (``prisma migrate deploy``), so
on a populated-database upgrade there is a window where the backend is up
but the new tables don't exist yet — admin endpoints 500 and feature
pages degrade to spurious "no active instance" errors until the frontend
finishes migrating. Instead of serving through that window, the backend
polls until the schema it depends on is present and no migration is left
half-applied.

The wait is bounded (``VYMANAGER_SCHEMA_WAIT_TIMEOUT``, seconds,
default 120, ``0`` disables the gate): if the schema never appears the
backend logs loudly and serves anyway, preserving the old self-healing
behavior and avoiding a startup deadlock with compose setups where the
migration runner waits for the backend healthcheck.
"""

import asyncio
import os
import time

import asyncpg

# Tables the backend queries unconditionally (middleware, org scoping,
# RBAC, auditing). Extend this list when a migration adds a table the
# backend reads at request time.
REQUIRED_TABLES = (
    "users",
    "sites",
    "instances",
    "organizations",
    "org_memberships",
    "user_instance_roles",
    "user_feature_permissions",
    "active_sessions",
    "audit_logs",
)


async def _schema_status(database_url: str):
    """Return (missing_tables, unfinished_migrations) or raise on connect failure."""
    conn = await asyncpg.connect(database_url, timeout=10)
    try:
        rows = await conn.fetch(
            """
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = current_schema() AND table_name = ANY($1::text[])
            """,
            list(REQUIRED_TABLES) + ["_prisma_migrations"],
        )
        present = {r["table_name"] for r in rows}
        missing = [t for t in REQUIRED_TABLES if t not in present]

        unfinished = 0
        if "_prisma_migrations" in present:
            unfinished = await conn.fetchval(
                'SELECT count(*) FROM "_prisma_migrations" '
                "WHERE finished_at IS NULL AND rolled_back_at IS NULL"
            )
        return missing, unfinished
    finally:
        await conn.close()


async def wait_for_schema(database_url: str) -> bool:
    """Poll until the required schema exists. True = ready, False = timed out."""
    timeout = float(os.getenv("VYMANAGER_SCHEMA_WAIT_TIMEOUT", "120"))
    interval = float(os.getenv("VYMANAGER_SCHEMA_WAIT_INTERVAL", "2"))
    if timeout <= 0:
        return True

    deadline = time.monotonic() + timeout
    attempt = 0
    while True:
        attempt += 1
        try:
            missing, unfinished = await _schema_status(database_url)
            if not missing and not unfinished:
                if attempt > 1:
                    print("  ✓ Database schema ready")
                return True
            state = []
            if missing:
                state.append(f"missing tables: {', '.join(missing)}")
            if unfinished:
                state.append(f"{unfinished} unfinished migration(s)")
            reason = "; ".join(state)
        except Exception as e:
            reason = f"database not reachable: {e}"

        if time.monotonic() >= deadline:
            print("  " + "!" * 58)
            print(f"  ✗ Schema not ready after {timeout:.0f}s ({reason}).")
            print("  ✗ Serving anyway — run 'prisma migrate deploy' (frontend")
            print("  ✗ container) to bring the database up to date.")
            print("  " + "!" * 58)
            return False

        if attempt == 1 or attempt % 5 == 0:
            print(f"  ⏳ Waiting for database schema ({reason})")
        await asyncio.sleep(interval)
