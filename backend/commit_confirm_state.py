"""
Commit-Confirm State Tracker

Tracks the pending commit-confirm of each router. While one is pending, no
other VyManager commit reaches that router until someone confirms or the timer
runs out (and VyOS reverts).

The state is per router (see ``device_keys``), so every verified instance row
that points at the router sees the same countdown and the same block. It is
kept in memory and written through to the ``commit_confirm_sessions`` table,
so a backend restart keeps the countdown: the router has no call that reports
a pending timer.

Callers pass an instance id; it is mapped to the router here.
"""

import asyncio
import contextvars
import logging
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Set

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
    instance_id: Optional[str]  # the row it was started from; None once that row is deleted
    started_at: datetime
    expires_at: datetime
    confirm_time_minutes: int
    action: str  # the router's commit-confirm action: "reboot" or "reload"
    started_by_id: Optional[str] = None
    started_by_name: Optional[str] = None
    started_by_org: Optional[str] = None
    # Unsaved changes were already on the router when it was armed: a reboot
    # revert boots the saved config and loses them too.
    unsaved_before: bool = False

    def seconds_remaining(self) -> int:
        delta = self.expires_at - datetime.now(timezone.utc)
        return max(0, int(delta.total_seconds()))

    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) >= self.expires_at

    def starter_label(self) -> Optional[str]:
        """The starter's name, unless another organization's row shares the router.

        A row whose organization is not known yet (noted by a service or a
        startup load, before any request for it) does not count: every row
        that shows the banner has made a request, which records its org.
        """
        if not self.started_by_name:
            return None
        if device_keys.orgs_on(self.device_key) - {self.started_by_org, None}:
            return None
        return self.started_by_name

    def to_dict(self) -> dict:
        """What every row on the router may see: no user or instance ids
        (``status`` adds the row's own ``enabled``).

        ``started_by_known`` says someone was recorded as the starter, so the
        banner can say "another VyManager user" when the name is withheld.
        """
        return {
            "active": True,
            "confirm_time_minutes": self.confirm_time_minutes,
            "action": self.action,
            "started_at": self.started_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "seconds_remaining": self.seconds_remaining(),
            "started_by_name": self.starter_label(),
            "started_by_known": bool(self.started_by_id or self.started_by_name),
            "unsaved_before": self.unsaved_before,
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
# The action each router's last config read showed, keyed like _sessions, so
# every verified row on it shows the same action without its own fresh read.
_known_actions: Dict[str, str] = {}


def note_router_config(instance_id: str, config: Dict[str, Any]) -> None:
    """Record the action a config read through this row showed (after the read)."""
    key = device_keys.key_for(instance_id)
    if key == instance_id:
        return  # not verified: nothing shared to record
    with _lock:
        _known_actions[key] = router_action(config)


def known_action(instance_id: str) -> Optional[str]:
    """The action the router's last read showed; None before any read."""
    with _lock:
        return _known_actions.get(device_keys.key_for(instance_id))


def set_active(
    instance_id: str,
    confirm_time_minutes: int,
    action: str = DEFAULT_ACTION,
    unsaved_before: bool = False,
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
        unsaved_before=unsaved_before,
    )
    with _lock:
        _sessions[session.device_key] = session
    _store.save(session)
    logger.info(
        "Commit-confirm started on %s via instance %s (%d min, action=%s)",
        session.device_key, instance_id, confirm_time_minutes, action,
    )
    return session


def _active_on(key: str) -> Optional[CommitConfirmSession]:
    with _lock:
        session = _sessions.get(key)
        if session is None:
            return None
        if not session.is_expired():
            return session
        del _sessions[key]
    logger.info("Commit-confirm expired on %s — VyOS should have reverted", key)
    _store.delete(session)
    return None


def get_active(instance_id: str) -> Optional[CommitConfirmSession]:
    """Return the pending session on this instance's router, if not expired."""
    return _active_on(device_keys.key_for(instance_id))


def blocking(instance_id: str) -> Optional[CommitConfirmSession]:
    """The pending session that blocks this row's commits.

    That is the router the row names, even if its credentials have not been
    verified yet: the router would archive the commit whoever sent it.
    """
    return get_active(instance_id) or _active_on(device_keys.candidate_key(instance_id))


def is_active(instance_id: str) -> bool:
    """Return True if this instance's router has a pending commit-confirm."""
    return get_active(instance_id) is not None


def clear(instance_id: str) -> None:
    """Clear the router's session (after confirm)."""
    key = device_keys.key_for(instance_id)
    with _lock:
        found = _sessions.pop(key, None)
    if found is not None:
        _store.delete(found)
        logger.info("Commit-confirm cleared on %s", key)


def status(instance_id: str, service: Any = None, enabled: Optional[bool] = None) -> Dict[str, Any]:
    """The banner's commit-confirm state for one row (SSE and the status route).

    With nothing pending it still says whether this row arms one on every
    save (``enabled``: given by the caller from the instance row, or read from
    the service's settings) and what the router does when a timer runs out,
    so the unsaved-changes banner can warn before arming. The action is the
    one the router's last config read showed (``known_action``, no router
    I/O here); None before any read.
    """
    if enabled is None:
        config = getattr(service, "config", None)
        enabled = bool(
            config is not None
            and getattr(config, "commit_confirm_enabled", False)
            and supports_commit_confirm(getattr(config, "version", None))
        )
    session = get_active(instance_id)
    if session is not None:
        return {**session.to_dict(), "enabled": enabled}
    return {
        "active": False,
        "enabled": enabled,
        "action": known_action(instance_id) if enabled else None,
    }


# ============================================================================
# Persistence
# ============================================================================

class _Store:
    """Write-through to ``commit_confirm_sessions``.

    set_active and clear run on threadpool workers, so a write is handed to
    the app's event loop and not waited for: the in-memory state stays the
    authority while the process lives, and a failed write is logged. Writes
    run one after another in the order they were made (each waits for the
    previous one), so a delete never overtakes the save of a newer session.
    """

    def __init__(self) -> None:
        self._pool: Any = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._last: Optional[asyncio.Task] = None
        self._tasks: Set[asyncio.Task] = set()

    def attach(self, pool: Any, loop: asyncio.AbstractEventLoop) -> None:
        self._pool, self._loop = pool, loop

    async def flush_and_detach(self) -> None:
        """Wait for the writes already made (shutdown, before the pool closes)."""
        await asyncio.sleep(0)  # let writes handed over from workers start
        last = self._last
        self.detach()
        if last is not None:
            await asyncio.wait({last}, timeout=5)

    def detach(self) -> None:
        # The chain belongs to this loop; a later attach starts a new one.
        self._pool, self._loop, self._last = None, None, None
        self._tasks = set()

    def _start(self, pool: Any, write) -> None:
        """Runs on the loop: chain the write after the previous one."""
        previous = self._last

        async def ordered():
            if previous is not None:
                await asyncio.wait({previous})
            await write(pool)

        task = asyncio.get_running_loop().create_task(ordered())
        self._last = task
        self._tasks.add(task)
        task.add_done_callback(self._done)

    def _done(self, task: asyncio.Task) -> None:
        self._tasks.discard(task)
        if not task.cancelled() and task.exception() is not None:
            logger.error("Could not persist commit-confirm state: %s", task.exception())

    def _schedule(self, write) -> None:
        pool, loop = self._pool, self._loop
        if pool is None or loop is None:
            return
        try:
            try:
                running = asyncio.get_running_loop()
            except RuntimeError:
                running = None
            if running is loop:
                self._start(pool, write)
            else:
                loop.call_soon_threadsafe(self._start, pool, write)
        except RuntimeError:
            # The loop is closing (shutdown); the in-memory state still holds.
            logger.warning("Commit-confirm state not persisted: the event loop is closed")

    def save(self, session: CommitConfirmSession) -> None:
        async def write(pool):
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO commit_confirm_sessions
                        ("deviceKey", "instanceId", "startedAt", "expiresAt", "confirmMinutes",
                         "action", "startedById", "startedByName", "startedByOrgId", "unsavedBefore")
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT ("deviceKey") DO UPDATE SET
                        "instanceId" = EXCLUDED."instanceId",
                        "startedAt" = EXCLUDED."startedAt",
                        "expiresAt" = EXCLUDED."expiresAt",
                        "confirmMinutes" = EXCLUDED."confirmMinutes",
                        "action" = EXCLUDED."action",
                        "startedById" = EXCLUDED."startedById",
                        "startedByName" = EXCLUDED."startedByName",
                        "startedByOrgId" = EXCLUDED."startedByOrgId",
                        "unsavedBefore" = EXCLUDED."unsavedBefore"
                    """,
                    session.device_key, session.instance_id,
                    _naive_utc(session.started_at), _naive_utc(session.expires_at),
                    session.confirm_time_minutes, session.action,
                    session.started_by_id, session.started_by_name, session.started_by_org,
                    session.unsaved_before,
                )
        self._schedule(write)

    def delete(self, session: CommitConfirmSession) -> None:
        """Delete this session's row only, never a newer one on the same router."""
        async def remove(pool):
            async with pool.acquire() as conn:
                await conn.execute(
                    'DELETE FROM commit_confirm_sessions WHERE "deviceKey" = $1 AND "startedAt" = $2',
                    session.device_key, _naive_utc(session.started_at),
                )
        self._schedule(remove)


def _naive_utc(moment: datetime) -> datetime:
    # Prisma DateTime columns are TIMESTAMP(3) without time zone, in UTC; the
    # value is cut to milliseconds so it matches what the column stores.
    moment = moment.astimezone(timezone.utc).replace(tzinfo=None)
    return moment.replace(microsecond=moment.microsecond // 1000 * 1000)


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
                'SELECT "deviceKey", "instanceId", "startedAt", "expiresAt", "confirmMinutes", "action", '
                '"startedById", "startedByName", "startedByOrgId", "unsavedBefore" FROM commit_confirm_sessions'
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
            unsaved_before=row["unsavedBefore"],
        )
        if session.is_expired():
            continue
        if session.instance_id:
            device_keys.register_key(session.instance_id, session.device_key)
        with _lock:
            _sessions[session.device_key] = session
        loaded += 1
    _store.attach(pool, asyncio.get_running_loop())
    if loaded:
        logger.info("Loaded %d pending commit-confirm(s) after restart", loaded)
    return loaded


async def flush_and_detach_store() -> None:
    """Shutdown: finish the writes already made, then stop writing."""
    await _store.flush_and_detach()


def detach_store() -> None:
    _store.detach()
