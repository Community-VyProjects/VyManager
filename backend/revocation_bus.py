"""Revocation bus over Postgres LISTEN/NOTIFY.

A grant delete, membership removal or token revoke emits
``NOTIFY vymgr_revocation, '<kind>:<id>'`` in the same transaction as the
mutation. Every worker LISTENs on the channel and fans each notification out
to its in-process subscribers — the active SSE/WS streams — which re-check
permission and close on failure, instead of waiting for their poll tick.

The in-process fan-out is a local fast path only; the Postgres channel is the
real transport, so a revocation on one worker reaches streams on every worker
(and across replicas that share the database), never silently dropped.

Payload grammar: ``kind:id`` where kind is user | instance | org | token.
A stream matches the kinds relevant to it (its user id, its instance id).
"""

import asyncio
import logging
from typing import Optional, Set

import asyncpg

logger = logging.getLogger(__name__)

CHANNEL = "vymgr_revocation"

_subscribers: Set["asyncio.Queue[str]"] = set()
_listen_conn: Optional[asyncpg.Connection] = None
_pool: Optional[asyncpg.Pool] = None


def _on_notify(connection, pid, channel, payload) -> None:
    """asyncpg listener callback: fan a notification out to every subscriber."""
    for queue in list(_subscribers):
        try:
            queue.put_nowait(payload)
        except asyncio.QueueFull:
            # A stuck consumer must not block the bus; it will re-check on its
            # poll-tick floor regardless.
            pass


async def start(pool: asyncpg.Pool) -> None:
    """Open the dedicated LISTEN connection for this worker."""
    global _listen_conn, _pool
    _pool = pool
    _listen_conn = await pool.acquire()
    await _listen_conn.add_listener(CHANNEL, _on_notify)
    logger.info("Revocation bus listening on %s", CHANNEL)


async def stop() -> None:
    """Release the LISTEN connection on shutdown."""
    global _listen_conn
    if _listen_conn is not None:
        try:
            await _listen_conn.remove_listener(CHANNEL, _on_notify)
        finally:
            if _pool is not None:
                await _pool.release(_listen_conn)
            _listen_conn = None


def subscribe() -> "asyncio.Queue[str]":
    """Register a stream; returns a queue that receives revocation payloads."""
    queue: "asyncio.Queue[str]" = asyncio.Queue(maxsize=64)
    _subscribers.add(queue)
    return queue


def unsubscribe(queue: "asyncio.Queue[str]") -> None:
    _subscribers.discard(queue)


async def emit(conn: asyncpg.Connection, kind: str, ident: str) -> None:
    """Emit a revocation, to be called inside the mutation's transaction.

    pg_notify only delivers when the surrounding transaction commits, so a
    rolled-back mutation emits nothing — exactly the coupling we want.
    """
    await conn.execute("SELECT pg_notify($1, $2)", CHANNEL, f"{kind}:{ident}")


def payload_matches(payload: str, *, user_id: str = "", instance_id: str = "") -> bool:
    """True if a revocation payload is relevant to a stream for this
    user/instance."""
    try:
        kind, ident = payload.split(":", 1)
    except ValueError:
        return False
    if kind == "user" and ident == user_id:
        return True
    if kind == "instance" and ident == instance_id:
        return True
    return False
