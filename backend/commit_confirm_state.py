"""
Commit-Confirm State Tracker

Tracks the pending commit-confirm of each router. While one is pending, no
other VyManager write reaches that router until someone confirms or the timer
runs out (and VyOS reverts).

The state is per router (see ``device_keys``), so every instance row that
points at the router sees the same countdown and the same block. It is kept
in memory and written through to the ``commit_confirm_sessions`` table, so a
backend restart keeps the countdown: the router has no call that reports a
pending timer.

Callers pass an instance id; it is mapped to the router here.
"""

import asyncio
import contextvars
import logging
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import device_keys

logger = logging.getLogger(__name__)

# What VyOS does when the timer runs out if the router sets no action.
DEFAULT_ACTION = "reboot"


@dataclass(frozen=True)
class Actor:
    """Who is making the current request (set per request, read in the threadpool)."""

    user_id: Optional[str]
    name: Optional[str]
    org_id: Optional[str]


current_actor: contextvars.ContextVar[Optional[Actor]] = contextvars.ContextVar(
    "commit_confirm_actor", default=None,
)


@dataclass
class CommitConfirmSession:
    device_key: str
    instance_id: str
    started_at: datetime
    expires_at: datetime
    confirm_time_minutes: int
    action: str  # the router's commit-confirm action: "reboot" or "reload"
    started_by_id: Optional[str] = None
    started_by_name: Optional[str] = None
    started_by_org: Optional[str] = None

    def seconds_remaining(self) -> int:
        delta = self.expires_at - datetime.now(timezone.utc)
        return max(0, int(delta.total_seconds()))

    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) >= self.expires_at

    def starter_label(self) -> Optional[str]:
        """The starter's name, unless another organization's row shares the router.

        A row whose organization is not known yet (registered by a service or
        a startup load, before any request for it) does not count: every row
        that shows the banner has made a request, which records its org.
        """
        if not self.started_by_name:
            return None
        if device_keys.orgs_on(self.device_key) - {self.started_by_org, None}:
            return None
        return self.started_by_name

    def to_dict(self) -> dict:
        return {
            "active": True,
            "instance_id": self.instance_id,
            "confirm_time_minutes": self.confirm_time_minutes,
            "action": self.action,
            "started_at": self.started_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "seconds_remaining": self.seconds_remaining(),
            "started_by_id": self.started_by_id,
            "started_by_name": self.starter_label(),
        }


def supports_commit_confirm(version: Optional[str]) -> bool:
    """Whether the VyOS HTTP API on this version can arm a commit-confirm.

    The 1.4 API ignores ``confirm_time`` and commits with no timer, and has no
    ``confirm`` op. Only a string that contains ``1.4`` is 1.4; a rolling
    string is 1.5, as the version-gated mappers read it.
    """
    return "1.4" not in (version or "")


def router_action(config: Optional[Dict[str, Any]]) -> str:
    """The router's ``system config-management commit-confirm action``."""
    node: Any = config or {}
    for name in ("system", "config-management", "commit-confirm", "action"):
        if not isinstance(node, dict):
            return DEFAULT_ACTION
        node = node.get(name)
    return node if isinstance(node, str) and node else DEFAULT_ACTION


_lock = threading.Lock()
# In-memory store keyed by router (device_keys.key_for).
_sessions: Dict[str, CommitConfirmSession] = {}


def set_active(
    instance_id: str,
    confirm_time_minutes: int,
    action: str = DEFAULT_ACTION,
) -> CommitConfirmSession:
    """Record a new pending commit-confirm on this instance's router."""
    now = datetime.now(timezone.utc)
    actor = current_actor.get()
    session = CommitConfirmSession(
        device_key=device_keys.key_for(instance_id),
        instance_id=instance_id,
        started_at=now,
        expires_at=now + timedelta(minutes=confirm_time_minutes),
        confirm_time_minutes=confirm_time_minutes,
        action=action,
        started_by_id=actor.user_id if actor else None,
        started_by_name=actor.name if actor else None,
        started_by_org=actor.org_id if actor else None,
    )
    with _lock:
        _sessions[session.device_key] = session
    _store.save(session)
    logger.info(
        "Commit-confirm started on %s via instance %s (%d min, action=%s)",
        session.device_key, instance_id, confirm_time_minutes, action,
    )
    return session


def get_active(instance_id: str) -> Optional[CommitConfirmSession]:
    """Return the pending session on this instance's router, if not expired."""
    key = device_keys.key_for(instance_id)
    with _lock:
        session = _sessions.get(key)
        if session is None:
            return None
        if not session.is_expired():
            return session
        del _sessions[key]
    logger.info("Commit-confirm expired on %s — VyOS should have reverted", key)
    _store.delete(key)
    return None


def is_active(instance_id: str) -> bool:
    """Return True if this instance's router has a pending commit-confirm."""
    return get_active(instance_id) is not None


def clear(instance_id: str) -> None:
    """Clear the router's session (after confirm)."""
    key = device_keys.key_for(instance_id)
    with _lock:
        found = _sessions.pop(key, None)
    if found is not None:
        _store.delete(key)
        logger.info("Commit-confirm cleared on %s", key)


# ============================================================================
# Persistence
# ============================================================================

class _Store:
    """Write-through to ``commit_confirm_sessions``.

    set_active and clear run on threadpool workers, so a write is scheduled
    on the app's event loop and not waited for: the in-memory state stays the
    authority while the process lives, and a failed write is logged.
    """

    def __init__(self) -> None:
        self._pool: Any = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def attach(self, pool: Any, loop: asyncio.AbstractEventLoop) -> None:
        self._pool, self._loop = pool, loop

    def detach(self) -> None:
        self._pool, self._loop = None, None

    def _schedule(self, make_coro) -> None:
        pool, loop = self._pool, self._loop
        if pool is None or loop is None or loop.is_closed():
            return
        coro = make_coro(pool)
        try:
            running = asyncio.get_running_loop()
        except RuntimeError:
            running = None
        if running is loop:
            future: Any = loop.create_task(coro)
        else:
            future = asyncio.run_coroutine_threadsafe(coro, loop)
        future.add_done_callback(_log_failure)

    def save(self, session: CommitConfirmSession) -> None:
        async def write(pool):
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO commit_confirm_sessions
                        ("deviceKey", "instanceId", "startedAt", "expiresAt", "confirmMinutes",
                         "action", "startedById", "startedByName", "startedByOrgId")
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT ("deviceKey") DO UPDATE SET
                        "instanceId" = EXCLUDED."instanceId",
                        "startedAt" = EXCLUDED."startedAt",
                        "expiresAt" = EXCLUDED."expiresAt",
                        "confirmMinutes" = EXCLUDED."confirmMinutes",
                        "action" = EXCLUDED."action",
                        "startedById" = EXCLUDED."startedById",
                        "startedByName" = EXCLUDED."startedByName",
                        "startedByOrgId" = EXCLUDED."startedByOrgId"
                    """,
                    session.device_key, session.instance_id,
                    _naive_utc(session.started_at), _naive_utc(session.expires_at),
                    session.confirm_time_minutes, session.action,
                    session.started_by_id, session.started_by_name, session.started_by_org,
                )
        self._schedule(write)

    def delete(self, key: str) -> None:
        async def remove(pool):
            async with pool.acquire() as conn:
                await conn.execute('DELETE FROM commit_confirm_sessions WHERE "deviceKey" = $1', key)
        self._schedule(remove)


def _naive_utc(moment: datetime) -> datetime:
    # Prisma DateTime columns are TIMESTAMP(3) without time zone, in UTC.
    return moment.astimezone(timezone.utc).replace(tzinfo=None)


def _log_failure(future: Any) -> None:
    if future.cancelled():
        return
    exc = future.exception()
    if exc is not None:
        logger.error("Could not persist commit-confirm state: %s", exc)


_store = _Store()


async def load_and_attach(pool: Any) -> int:
    """Load the pending commit-confirms after a restart and start writing through.

    Expired rows are deleted: VyOS already acted on them. Returns the number
    of sessions loaded.
    """
    loaded = 0
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM commit_confirm_sessions WHERE \"expiresAt\" <= (now() AT TIME ZONE 'utc')"
            )
            rows = await conn.fetch(
                'SELECT "deviceKey", "instanceId", "startedAt", "expiresAt", "confirmMinutes", '
                '"action", "startedById", "startedByName", "startedByOrgId" FROM commit_confirm_sessions'
            )
    except Exception:
        logger.exception("Could not load pending commit-confirms")
        rows = []
    for row in rows:
        session = CommitConfirmSession(
            device_key=row["deviceKey"],
            instance_id=row["instanceId"],
            started_at=row["startedAt"].replace(tzinfo=timezone.utc),
            expires_at=row["expiresAt"].replace(tzinfo=timezone.utc),
            confirm_time_minutes=row["confirmMinutes"],
            action=row["action"],
            started_by_id=row["startedById"],
            started_by_name=row["startedByName"],
            started_by_org=row["startedByOrgId"],
        )
        if session.is_expired():
            continue
        device_keys.register_key(session.instance_id, session.device_key)
        with _lock:
            _sessions[session.device_key] = session
        loaded += 1
    _store.attach(pool, asyncio.get_running_loop())
    if loaded:
        logger.info("Loaded %d pending commit-confirm(s) after restart", loaded)
    return loaded


def detach_store() -> None:
    _store.detach()
