"""Banner power status: the SSE push and the poller share get_scheduled_power_status.

Both paths check the stored row against `show reboot` off the event loop, keep
the row when the device or the service lookup fails, report a cancelled row
without asking the device, and the poller emits each event wrapped under the
key useBannerEvents.ts reads (config_diff, commit_confirm, power_status).
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

INSTANCE = "i1"


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _row(**overrides):
    row = {
        "actionType": "reboot",
        "scheduledTime": _utcnow() + timedelta(hours=1),
        "scheduledBy": "u1",
        "scheduledByName": "User One",
        "cancelled": False,
        "cancelledBy": None,
        "cancelledByName": None,
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
        device["threads"].append(threading.get_ident())
        device["conn_open"].append(db["open"])
        return SimpleNamespace(status=device["status"], result=device["result"], error=device["error"])

    return SimpleNamespace(
        device=SimpleNamespace(show=show),
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
        loop_thread["id"] = threading.get_ident()
        return await coro

    return asyncio.run(main())


def _deletes(db):
    return [args for query, args in db["executed"] if query.startswith("DELETE")]


@pytest.fixture
def sse(monkeypatch, db, service, loop_thread):
    lookup = {"service": service}

    def get_service(_request):
        if isinstance(lookup["service"], Exception):
            raise lookup["service"]
        return lookup["service"]

    monkeypatch.setattr(events, "request_scoped_conn", _conn_factory(db))
    monkeypatch.setattr(events, "get_session_vyos_service", get_service)
    request = cast(Request, SimpleNamespace(state=SimpleNamespace(instance={"id": INSTANCE})))

    def call():
        return _run(events._get_power_status_state(request), loop_thread)

    return SimpleNamespace(call=call, lookup=lookup)


def test_sse_without_a_row_skips_the_device(sse, device):
    assert sse.call()["scheduled"] is False
    assert device["calls"] == []


def test_sse_checks_show_reboot_off_the_event_loop(sse, device, db, loop_thread):
    db["row"] = _row()
    device["result"] = "Reboot is scheduled 2030-01-01 10:00:00\n"
    status = sse.call()
    assert status["scheduled"] is True
    assert status["action_type"] == "reboot"
    assert status["scheduled_time"].endswith("Z")
    assert device["calls"] == [["reboot"]]
    assert loop_thread["id"] not in device["threads"]
    assert device["conn_open"] == [False]


def test_sse_clears_the_row_when_the_device_has_nothing(sse, device, db):
    db["row"] = _row()
    device["result"] = "Reboot or poweroff is not scheduled\n"
    assert sse.call()["scheduled"] is False
    assert _deletes(db)[-1] == (INSTANCE, "reboot")


@pytest.mark.parametrize("status,error", [(400, "boom"), (200, "boom")])
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


def test_sse_reports_a_cancelled_row_without_the_device(sse, device, db):
    db["row"] = _row(cancelled=True, cancelledBy="u2", cancelledByName="User Two")
    status = sse.call()
    assert status["scheduled"] is False
    assert status["cancelled"] is True
    assert status["cancelled_by_name"] == "User Two"
    assert status["action_type"] == "reboot"
    assert device["calls"] == []
    assert _deletes(db) == [(INSTANCE,)]


@pytest.fixture
def poller(monkeypatch, db, service, loop_thread):
    emitted = []
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
            update_last_state=lambda *_a: True,
            emit=lambda instance_id, kind, data: emitted.append((instance_id, kind, data)),
        ),
    )
    import config_state

    monkeypatch.setattr(config_state, "reconcile_baseline", lambda _iid, cfg: cfg)
    app_state = SimpleNamespace(db_pool=SimpleNamespace(acquire=_conn_factory(db)))

    def call():
        _run(events._poll_banner_state_for_instance(INSTANCE, app_state), loop_thread)
        return {kind: data for _iid, kind, data in emitted}

    return SimpleNamespace(call=call, registry=registry)


def test_poller_wraps_each_event_under_the_key_the_client_reads(poller, db, device):
    db["row"] = _row()
    device["result"] = "Reboot is scheduled 2030-01-01 10:00:00\n"
    sent = poller.call()
    assert set(sent) == {"config_diff", "commit_confirm", "power_status"}
    assert sent["config_diff"]["config_diff"]["has_changes"] is False
    assert sent["commit_confirm"] == {"commit_confirm": {"active": False}}
    assert sent["power_status"]["power_status"]["scheduled"] is True


def test_poller_clears_the_row_off_the_event_loop(poller, db, device, loop_thread):
    db["row"] = _row()
    device["result"] = "Reboot or poweroff is not scheduled\n"
    sent = poller.call()
    assert sent["power_status"]["power_status"]["scheduled"] is False
    assert _deletes(db)[-1] == (INSTANCE, "reboot")
    assert loop_thread["id"] not in device["threads"]
    assert device["conn_open"] == [False]


def test_poller_keeps_the_row_without_a_registered_service(poller, db, device):
    db["row"] = _row()
    poller.registry["service"] = None
    sent = poller.call()
    assert sent["power_status"]["power_status"]["scheduled"] is True
    assert device["calls"] == []


def test_poller_reports_a_cancelled_row_without_the_device(poller, db, device):
    db["row"] = _row(cancelled=True, cancelledByName="User Two")
    sent = poller.call()
    power = sent["power_status"]["power_status"]
    assert power["scheduled"] is False
    assert power["cancelled"] is True
    assert power["cancelled_by_name"] == "User Two"
    assert device["calls"] == []
