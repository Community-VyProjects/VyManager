"""Banner power status: the SSE push and the poller share get_scheduled_power_status.

Both paths check the stored row against `show reboot` off the event loop, keep
the row when the device or the service lookup fails, delete only the row they
read while it is still not cancelled, and report a recent cancel without asking
the device. The SSE push sends power status only with POWER read; the poller
sends the refetch signal for power status (each client re-reads through the
POWER-gated GET /status) and wraps config_diff and commit_confirm under the
key useBannerEvents.ts reads.
"""

import asyncio
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import cast

import pytest
from fastapi import HTTPException, Request

import routers.events as events
from rbac_permissions import FeatureGroup, PermissionLevel

INSTANCE = "i1"


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _row(**overrides):
    row = {
        "id": "r1",
        "actionType": "reboot",
        "scheduledTime": _utcnow() + timedelta(hours=1),
        "scheduledBy": "u1",
        "scheduledByName": "User One",
        "cancelled": False,
        "cancelledBy": None,
        "cancelledByName": None,
        "cancelledAt": None,
    }
    row.update(overrides)
    return row


class Conn:
    def __init__(self, db):
        self.db = db

    async def execute(self, query, *args):
        self.db["executed"].append((" ".join(query.split()), args))

    async def fetchrow(self, _query, *_args):
        return self.db["row"]


@pytest.fixture
def db():
    return {"row": None, "executed": [], "open": False}


@pytest.fixture
def device():
    return {"result": "", "status": 200, "error": False, "calls": [], "threads": [], "conn_open": []}


@pytest.fixture
def loop_thread():
    return {}


@pytest.fixture
def service(device, db):
    def show(path):
        device["calls"].append(path)
        device["threads"].append(threading.current_thread())
        device["conn_open"].append(db["open"])
        return SimpleNamespace(status=device["status"], result=device["result"], error=device["error"])

    return SimpleNamespace(
        device=SimpleNamespace(show=show),
        get_version=lambda: "2026.09.23-0027-rolling",
        get_full_config=lambda refresh=False: {"system": {"host-name": "r1"}},
    )


def _conn_factory(db):
    @asynccontextmanager
    async def factory(*_args):
        db["open"] = True
        try:
            yield Conn(db)
        finally:
            db["open"] = False

    return factory


def _run(coro, loop_thread):
    async def main():
        loop_thread["thread"] = threading.current_thread()
        return await coro

    return asyncio.run(main())


def _deletes(db):
    return [args for query, args in db["executed"] if query.startswith("DELETE")]


def _row_delete_query(db):
    return [query for query, args in db["executed"] if args == ("r1",)]


def _recent_cancel(**overrides):
    return _row(
        cancelled=True,
        cancelledBy="u2",
        cancelledByName="User Two",
        cancelledAt=_utcnow() - timedelta(seconds=5),
        **overrides,
    )


@pytest.fixture
def sse(monkeypatch, db, service, loop_thread):
    lookup = {"service": service}

    def get_service(_request):
        if isinstance(lookup["service"], Exception):
            raise lookup["service"]
        return lookup["service"]

    perm = {"allowed": True, "checks": []}

    async def has_permission(_request, feature, level):
        perm["checks"].append((feature, level))
        return perm["allowed"]

    monkeypatch.setattr(events, "request_scoped_conn", _conn_factory(db))
    monkeypatch.setattr(events, "get_session_vyos_service", get_service)
    monkeypatch.setattr(events, "has_permission", has_permission)
    request = cast(Request, SimpleNamespace(state=SimpleNamespace(instance={"id": INSTANCE})))

    def call():
        return _run(events._get_power_status_state(request), loop_thread)

    return SimpleNamespace(call=call, lookup=lookup, perm=perm)


def test_sse_without_a_row_skips_the_device(sse, device):
    assert sse.call()["scheduled"] is False
    assert device["calls"] == []
    assert sse.perm["checks"] == [(FeatureGroup.POWER, PermissionLevel.READ)]


def test_sse_without_power_read_sends_nothing(sse, device, db):
    db["row"] = _row()
    sse.perm["allowed"] = False
    assert sse.call() == {"scheduled": False}
    assert db["executed"] == []
    assert device["calls"] == []


def test_sse_checks_show_reboot_off_the_event_loop(sse, device, db, loop_thread):
    db["row"] = _row()
    device["result"] = "Reboot is scheduled 2030-01-01 10:00:00\n"
    status = sse.call()
    assert status["scheduled"] is True
    assert status["action_type"] == "reboot"
    assert status["id"] == "r1"
    assert status["scheduled_time"].endswith("Z")
    assert device["calls"] == [["reboot"]]
    assert loop_thread["thread"] not in device["threads"]
    assert device["conn_open"] == [False]


def test_sse_clears_the_row_when_the_device_has_nothing(sse, device, db):
    db["row"] = _row()
    device["result"] = "Reboot or poweroff is not scheduled\n"
    assert sse.call()["scheduled"] is False
    assert _deletes(db)[-1] == ("r1",)
    assert "WHERE id = $1 AND cancelled = false" in _row_delete_query(db)[0]


@pytest.mark.parametrize("status,error", [(400, False), (400, "boom"), (200, "boom")])
def test_sse_keeps_the_row_when_the_device_check_fails(sse, device, db, status, error):
    db["row"] = _row()
    device.update(status=status, error=error, result={})
    assert sse.call()["scheduled"] is True
    assert _deletes(db) == [(INSTANCE,)]


def test_sse_keeps_the_row_when_the_service_lookup_fails(sse, device, db):
    db["row"] = _row()
    sse.lookup["service"] = HTTPException(status_code=400, detail="No active VyOS session")
    status = sse.call()
    assert status["scheduled"] is True
    assert status["action_type"] == "reboot"
    assert device["calls"] == []
    assert _deletes(db) == [(INSTANCE,)]


def test_sse_reports_a_recent_cancel_without_the_device(sse, device, db):
    db["row"] = _recent_cancel()
    status = sse.call()
    assert status["scheduled"] is False
    assert status["cancelled"] is True
    assert status["cancelled_by_name"] == "User Two"
    assert status["id"] == "r1"
    assert status["action_type"] == "reboot"
    assert device["calls"] == []
    assert _deletes(db) == [(INSTANCE,)]


def test_sse_reads_an_old_cancel_as_nothing_scheduled(sse, device, db):
    db["row"] = _row(cancelled=True, cancelledAt=_utcnow() - timedelta(minutes=5))
    status = sse.call()
    assert status["scheduled"] is False
    assert status["cancelled"] is False
    assert status["action_type"] is None
    assert status["id"] is None
    assert device["calls"] == []


@pytest.fixture
def poller(monkeypatch, db, service, loop_thread):
    emitted = []
    states = {}
    registry = {"service": service}

    class Registry:
        def get(self, _instance_id):
            if registry["service"] is None:
                raise KeyError(_instance_id)
            return registry["service"]

    monkeypatch.setattr(events, "_session_device_registry", Registry())
    monkeypatch.setattr(
        events,
        "event_manager",
        SimpleNamespace(
            update_last_state=lambda _iid, kind, value: states.update({kind: value}) or True,
            emit_to_instance=lambda instance_id, kind, data: emitted.append((instance_id, kind, data)),
        ),
    )
    import config_state

    monkeypatch.setattr(config_state, "reconcile_baseline", lambda _iid, cfg: cfg)
    app_state = SimpleNamespace(db_pool=SimpleNamespace(acquire=_conn_factory(db)))

    def call():
        _run(events._poll_banner_state_for_device([INSTANCE], app_state), loop_thread)
        return {kind: data for _iid, kind, data in emitted}

    return SimpleNamespace(call=call, registry=registry, states=states)


def test_poller_wraps_config_events_and_signals_power(poller, db, device):
    db["row"] = _row()
    device["result"] = "Reboot is scheduled 2030-01-01 10:00:00\n"
    sent = poller.call()
    assert set(sent) == {"config_diff", "commit_confirm", "power_status"}
    assert sent["config_diff"]["config_diff"]["has_changes"] is False
    assert sent["commit_confirm"] == {"commit_confirm": {"active": False}}
    # power status names and ids never go to subscribers without POWER read
    assert sent["power_status"] is None
    assert poller.states["power_status"]["scheduled"] is True


def test_poller_clears_the_row_off_the_event_loop(poller, db, device, loop_thread):
    db["row"] = _row()
    device["result"] = "Reboot or poweroff is not scheduled\n"
    poller.call()
    assert poller.states["power_status"]["scheduled"] is False
    assert _deletes(db)[-1] == ("r1",)
    assert "WHERE id = $1 AND cancelled = false" in _row_delete_query(db)[0]
    assert loop_thread["thread"] not in device["threads"]
    assert device["conn_open"] == [False]


def test_poller_keeps_the_row_without_a_registered_service(poller, db, device):
    db["row"] = _row()
    poller.registry["service"] = None
    poller.call()
    assert poller.states["power_status"]["scheduled"] is True
    assert device["calls"] == []
    assert _deletes(db) == [(INSTANCE,)]


def test_poller_reports_a_recent_cancel_without_the_device(poller, db, device):
    db["row"] = _recent_cancel()
    poller.call()
    power = poller.states["power_status"]
    assert power["scheduled"] is False
    assert power["cancelled"] is True
    assert power["cancelled_by_name"] == "User Two"
    assert device["calls"] == []
