"""Commit-confirm state and config snapshots belong to the router (#1701, #1702).

Lab (rolling): a commit during a pending commit-confirm is archived and makes
the pending change permanent, and the router's commit-confirm action defaults
to ``reboot`` (boots the saved config). Before this change the commit-confirm
lock, the snapshots and the banner channel were per instance row, so a second
row on the same router (another site or organization) could commit during the
window; the state lived only in memory, so a backend restart lost the
countdown; and the banner always said "reload".
"""

import asyncio
import os
import threading
import time
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any, cast

import pytest
from fastapi import HTTPException
from pyvyos.core.rest_client import ApiResponse

import commit_confirm_state
import config_state
import device_keys
from events.event_manager import EventManager
from session_vyos_service import require_session_instance
from vyos_service import VyOSDeviceConfig, VyOSService

requires_db = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="commit-confirm persistence tests need DATABASE_URL",
)

ROW_A, ROW_B, ROW_OTHER = "row-a", "row-b", "row-other"
OPS = [{"op": "set", "path": ["interfaces", "dummy", "dum1", "description", "x"]}]


class _Batch:
    def is_empty(self):
        return False

    def get_operations(self):
        return OPS


class _Reply:
    def __init__(self, status_code, body):
        self.status_code = status_code
        self._body = body

    def json(self):
        return self._body


def _service(instance_id, host="router.lab", *, confirm=False, config=None):
    service = VyOSService(VyOSDeviceConfig(
        hostname=host, apikey="k", version="1.5", instance_id=instance_id,
        commit_confirm_enabled=confirm, commit_confirm_minutes=3,
    ))
    service._cached_config = config if config is not None else {}
    service.get_full_config = lambda refresh=False: cast(dict, service._cached_config)
    return service


def _active(instance_id) -> commit_confirm_state.CommitConfirmSession:
    session = commit_confirm_state.get_active(instance_id)
    assert session is not None
    return session


def _ok() -> ApiResponse:
    return ApiResponse(status=200, request={}, result={}, error="")


@pytest.fixture
def router(monkeypatch):
    """Every POST/configure to the fake router, and what it answers."""
    calls = []

    def post(url, data, verify, timeout):
        calls.append(url)
        return _Reply(200, {"success": True, "data": "", "error": None})

    monkeypatch.setattr("vyos_service._requests.post", post)
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)
    return calls


# ---------------------------------------------------------------------------
# The router key
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(("host", "port", "key"), [
    ("Router.Lab", 443, "router.lab:443"),
    ("router.lab.", None, "router.lab:443"),
    ("10.0.0.1", "8443", "10.0.0.1:8443"),
    ("[FD00:0:0::1]", 443, "[fd00::1]:443"),
    ("fd00::1", 443, "[fd00::1]:443"),
])
def test_the_router_key_is_a_normalized_host_and_port(host, port, key):
    assert device_keys.device_key(host, port) == key


def test_an_unregistered_instance_keys_by_its_id():
    assert device_keys.key_for("never-seen") == "never-seen"
    assert device_keys.instances_on("never-seen") == {"never-seen"}


# ---------------------------------------------------------------------------
# One commit-confirm, one block, per router
# ---------------------------------------------------------------------------


def test_a_second_row_on_the_router_cannot_commit_during_the_window(router):
    a = _service(ROW_A, confirm=True)
    b = _service(ROW_B, host="ROUTER.lab")  # same router, plain commits
    assert a.execute_batch(_Batch()).status == 200
    assert len(router) == 1
    cast(Any, b.device).configure_multiple_op = lambda op_path=None: pytest.fail("nothing may reach the router")

    for attempt in (
        lambda: b.execute_batch(_Batch()),
        lambda: b.commit_operations(OPS),  # discard
        lambda: b.config_file_save(),  # save to the boot config
        lambda: b.load_config_file("/config/archive/x"),  # archive restore
    ):
        with pytest.raises(HTTPException) as caught:
            attempt()
        assert caught.value.status_code == 409
        assert "pending on this router" in caught.value.detail

    assert commit_confirm_state.get_active(ROW_B) is commit_confirm_state.get_active(ROW_A)


def test_a_save_to_another_file_is_not_blocked(router):
    a = _service(ROW_A, confirm=True)
    a.execute_batch(_Batch())
    saved = []
    cast(Any, a.device).config_file_save = lambda file=None: saved.append(file) or _ok()

    assert a.config_file_save(file="/config/backup.boot").status == 200
    assert saved == ["/config/backup.boot"]


def test_another_router_is_not_blocked(router):
    _service(ROW_A, confirm=True).execute_batch(_Batch())
    other = _service(ROW_OTHER, host="other.lab")
    cast(Any, other.device).configure_multiple_op = lambda op_path=None: _ok()

    assert other.execute_batch(_Batch()).status == 200


def test_a_second_commit_confirm_from_another_row_gets_a_409_and_sends_nothing(router):
    _service(ROW_A, confirm=True).execute_batch(_Batch())

    with pytest.raises(HTTPException) as caught:
        _service(ROW_B, confirm=True).execute_batch(_Batch())

    assert caught.value.status_code == 409
    assert len(router) == 1


def test_any_row_on_the_router_can_confirm(router):
    _service(ROW_A, confirm=True).execute_batch(_Batch())

    assert _service(ROW_B).confirm_commit(ROW_B).status == 200
    assert commit_confirm_state.is_active(ROW_A) is False


def test_two_rows_committing_at_once_arm_exactly_one_timer(monkeypatch):
    """The check and the commit are one step under the router's write lock."""
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)
    posts = []
    inside = threading.Event()

    def slow_post(url, data, verify, timeout):
        posts.append(url)
        inside.set()
        time.sleep(0.3)  # the router takes a while to commit
        return _Reply(200, {"success": True, "data": "", "error": None})

    monkeypatch.setattr("vyos_service._requests.post", slow_post)
    services = [_service(ROW_A, confirm=True), _service(ROW_B, confirm=True)]
    results = []

    def save(service):
        try:
            results.append(service.execute_batch(_Batch()).status)
        except HTTPException as exc:
            results.append(exc.status_code)

    threads = [threading.Thread(target=save, args=(s,)) for s in services]
    threads[0].start()
    inside.wait(2)
    threads[1].start()
    for thread in threads:
        thread.join(5)

    assert sorted(results) == [200, 409]
    assert len(posts) == 1


# ---------------------------------------------------------------------------
# The router's action and who started it
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(("config", "action"), [
    ({}, "reboot"),
    ({"system": {"config-management": {"commit-confirm": {"action": "reload"}}}}, "reload"),
    ({"system": {"config-management": {}}}, "reboot"),
])
def test_the_session_carries_the_routers_action(router, config, action):
    _service(ROW_A, confirm=True, config=config).execute_batch(_Batch())

    assert _active(ROW_A).action == action


def test_an_unreadable_router_config_assumes_reboot(router):
    service = _service(ROW_A, confirm=True)
    service._cached_config = None
    def unreadable(refresh=False):
        raise ConnectionError("down")

    service.get_full_config = unreadable

    service.execute_batch(_Batch())

    assert _active(ROW_A).action == "reboot"


def _request(instance_id, host, org_id, user=None) -> Any:
    return SimpleNamespace(state=SimpleNamespace(
        instance={"id": instance_id, "host": host, "port": 443, "api_key": "k"},
        org={"id": org_id, "name": org_id},
        user=user,
    ))


def test_the_starter_is_named_to_rows_of_the_same_organization(router):
    ctx = _run_in_request(_request(ROW_A, "router.lab", "org-1", {"id": "u1", "name": "Alice"}), ROW_A)
    require_session_instance(_request(ROW_B, "router.lab", "org-1"))

    session = _active(ROW_B)
    assert ctx["started"] is True
    assert (session.started_by_id, session.to_dict()["started_by_name"]) == ("u1", "Alice")


def test_the_starter_is_anonymous_when_another_organization_shares_the_router(router):
    _run_in_request(_request(ROW_A, "router.lab", "org-1", {"id": "u1", "name": "Alice"}), ROW_A)
    require_session_instance(_request(ROW_B, "router.lab", "org-2"))

    data = _active(ROW_B).to_dict()
    assert data["started_by_id"] == "u1"
    assert data["started_by_name"] is None
    with pytest.raises(HTTPException) as caught:
        _service(ROW_B).execute_batch(_Batch())
    assert "Alice" not in caught.value.detail


def _run_in_request(request, instance_id):
    """What a route does: resolve the instance, then commit from the threadpool."""
    import contextvars

    result = {}

    def handler():
        require_session_instance(request)
        ctx = contextvars.copy_context()  # run_in_threadpool copies the context
        thread = threading.Thread(target=lambda: ctx.run(
            lambda: result.update(started=_service(instance_id, confirm=True).execute_batch(_Batch()).status == 200),
        ))
        thread.start()
        thread.join(5)

    contextvars.copy_context().run(handler)
    return result


def test_a_row_with_no_known_organization_does_not_hide_the_starter(router):
    """A service or a startup load registers a row before its org is known."""
    _run_in_request(_request(ROW_A, "router.lab", "org-1", {"id": "u1", "name": "Alice"}), ROW_A)
    _service(ROW_B)  # registered without an org

    assert _active(ROW_B).to_dict()["started_by_name"] == "Alice"


def test_require_session_instance_registers_the_router():
    require_session_instance(_request(ROW_A, "Router.Lab", "org-1"))
    require_session_instance(_request(ROW_B, "router.lab", "org-1"))

    assert device_keys.key_for(ROW_A) == device_keys.key_for(ROW_B) == "router.lab:443"


# ---------------------------------------------------------------------------
# Snapshots and banner events are shared by the router's rows
# ---------------------------------------------------------------------------


def test_one_rows_edit_is_not_an_external_change_for_the_other_row():
    device_keys.register(ROW_A, "router.lab", 443)
    device_keys.register(ROW_B, "router.lab", 443)
    before = {"system": {"host-name": "lab"}}
    after = {"system": {"host-name": "edited-in-vymanager"}}
    config_state.set_saved_config(ROW_A, before)

    config_state.set_managed_config(ROW_A, after)  # row A's save
    baseline = config_state.reconcile_baseline(ROW_B, after)  # row B's banner

    assert baseline == before  # still unsaved, not folded in as external


def test_events_reach_every_row_on_the_router():
    async def main():
        manager = EventManager()
        device_keys.register(ROW_A, "router.lab", 443)
        device_keys.register(ROW_B, "router.lab", 443)
        device_keys.register(ROW_OTHER, "other.lab", 443)
        queues = {iid: manager.subscribe(iid) for iid in (ROW_A, ROW_B, ROW_OTHER)}

        manager.emit(ROW_A, "config_diff", None)
        manager.emit_to_instance(ROW_A, "power_status", None)
        await asyncio.sleep(0)

        return {iid: [q.get_nowait() for _ in range(q.qsize())] for iid, q in queues.items()}

    got = asyncio.run(main())
    assert len(got[ROW_A]) == 2
    assert len(got[ROW_B]) == 1 and "config_diff" in got[ROW_B][0]
    assert got[ROW_OTHER] == []


def test_the_poller_reads_each_router_once(monkeypatch):
    import routers.events as events

    device_keys.register(ROW_A, "router.lab", 443)
    device_keys.register(ROW_B, "router.lab", 443)
    reads, emitted = [], []

    async def diff_for(instance_id, service):
        reads.append(instance_id)
        return {"has_changes": False}

    class Registry:
        def get(self, instance_id):
            return object()

    monkeypatch.setattr(events, "_config_diff_for", diff_for)
    monkeypatch.setattr(events, "_session_device_registry", Registry())
    monkeypatch.setattr(events.event_manager, "update_last_state", lambda iid, kind, value: True)
    monkeypatch.setattr(events.event_manager, "emit_to_instance", lambda iid, kind, data: emitted.append((iid, kind)))

    asyncio.run(events._poll_banner_state_for_device([ROW_A, ROW_B], SimpleNamespace(db_pool=None)))

    assert reads == [ROW_A]
    assert sorted(emitted) == sorted([
        (ROW_A, "config_diff"), (ROW_B, "config_diff"),
        (ROW_A, "commit_confirm"), (ROW_B, "commit_confirm"),
    ])


# ---------------------------------------------------------------------------
# Persistence across a backend restart
# ---------------------------------------------------------------------------


def _utc_naive(minutes):
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).replace(tzinfo=None)


@requires_db
def test_a_pending_commit_confirm_survives_a_restart():
    import asyncpg

    async def main():
        pool = await asyncpg.create_pool(os.environ["DATABASE_URL"], min_size=1, max_size=2)
        suffix = os.urandom(4).hex()
        org, site, row = f"org-{suffix}", f"site-{suffix}", f"inst-{suffix}"
        key = device_keys.device_key(f"r-{suffix}.lab", 443)
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    'INSERT INTO organizations (id, name, "updatedAt") VALUES ($1, $1, now())', org)
                await conn.execute(
                    'INSERT INTO sites (id, name, "orgId", "updatedAt") VALUES ($1, $1, $2, now())', site, org)
                await conn.execute(
                    'INSERT INTO instances (id, "siteId", name, host, username, password, "updatedAt") '
                    "VALUES ($1, $2, $1, $3, '', '', now())", row, site, f"r-{suffix}.lab")
                # An expired leftover from before the restart.
                await conn.execute(
                    'INSERT INTO commit_confirm_sessions ("deviceKey", "instanceId", "startedAt", "expiresAt", '
                    '"confirmMinutes", action) VALUES ($1, $2, $3, $4, 1, $5)',
                    f"gone-{suffix}:443", row,
                    _utc_naive(-5), _utc_naive(-4), "reboot")

            await commit_confirm_state.load_and_attach(pool)
            device_keys.register(row, f"r-{suffix}.lab", 443)
            token = commit_confirm_state.current_actor.set(
                commit_confirm_state.Actor(user_id=None, name="Alice", org_id=org))
            try:
                # From a worker thread, as execute_batch runs.
                started = await asyncio.to_thread(commit_confirm_state.set_active, row, 3, "reload")
            finally:
                commit_confirm_state.current_actor.reset(token)
            await asyncio.sleep(0.3)

            # "Restart": forget everything in memory and load again.
            commit_confirm_state.detach_store()
            with commit_confirm_state._lock:
                commit_confirm_state._sessions.clear()
            with device_keys._lock:
                device_keys._key_by_instance.clear()
            assert commit_confirm_state.get_active(row) is None

            await commit_confirm_state.load_and_attach(pool)
            loaded = commit_confirm_state.get_active(row)
            assert loaded is not None
            assert (loaded.device_key, loaded.action, loaded.started_by_name) == (key, "reload", "Alice")
            assert abs((loaded.expires_at - started.expires_at).total_seconds()) < 0.01
            assert 170 <= loaded.seconds_remaining() <= 180
            async with pool.acquire() as conn:
                assert await conn.fetchval(
                    'SELECT count(*) FROM commit_confirm_sessions WHERE "deviceKey" = $1', f"gone-{suffix}:443") == 0

            # Confirming deletes the row.
            await asyncio.to_thread(commit_confirm_state.clear, row)
            await asyncio.sleep(0.3)
            async with pool.acquire() as conn:
                assert await conn.fetchval(
                    'SELECT count(*) FROM commit_confirm_sessions WHERE "deviceKey" = $1', key) == 0
        finally:
            commit_confirm_state.detach_store()
            async with pool.acquire() as conn:
                await conn.execute("DELETE FROM instances WHERE id = $1", row)
                await conn.execute("DELETE FROM sites WHERE id = $1", site)
                await conn.execute("DELETE FROM organizations WHERE id = $1", org)
            await pool.close()

    asyncio.run(main())


def test_without_a_database_the_state_still_works_in_memory():
    device_keys.register(ROW_A, "router.lab", 443)
    commit_confirm_state.detach_store()

    commit_confirm_state.set_active(ROW_A, 1, "reboot")

    assert _active(ROW_A).expires_at > datetime.now(timezone.utc)
