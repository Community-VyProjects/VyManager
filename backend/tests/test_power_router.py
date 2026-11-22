"""Power routes: device calls run off the event loop, bad values are 400.

reboot, poweroff and show run through run_in_threadpool (also locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with
a stub service and a stub org connection so the device paths, the 400/500
paths and the stored schedule are checked.
"""

import threading
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient

from rbac_permissions import FeatureGroup
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.power import PowerMapper

ROUTER = "routers.power"
ROUTES = ["/vyos/power/reboot", "/vyos/power/poweroff"]


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Conn:
    """Stub asyncpg connection: records writes, returns one stored row."""

    def __init__(self, state):
        self.state = state

    async def execute(self, query, *args):
        self.state["executed"].append((" ".join(query.split()), args))

    async def fetchrow(self, _query, *_args):
        return self.state["row"]


@pytest.fixture
def db():
    """Row the stub fetchrow returns, the writes it saw, and whether a connection is open."""
    return {"row": None, "executed": [], "open": False}


@pytest.fixture
def device():
    """Reply each stub device call returns, plus the calls and threads it saw."""
    return {
        "version": "1.4.3",
        "result": "",
        "status": 200,
        "error": False,
        "calls": [],
        "threads": [],
        "conn_open": [],
    }


@pytest.fixture
def client(monkeypatch, device, db):
    loop_threads = set()
    checks = []

    def _gate(kind):
        async def check(_request, feature):
            checks.append((kind, feature))

        return check

    def _call(kind):
        def run(path):
            device["calls"].append((kind, path))
            device["threads"].append(threading.current_thread())
            device["conn_open"].append(db["open"])
            return SimpleNamespace(
                status=device["status"], result=device["result"], error=device["error"]
            )

        return run

    class Service:
        def __init__(self):
            self.device = SimpleNamespace(
                reboot=_call("reboot"), poweroff=_call("poweroff"), show=_call("show")
            )

        def get_version(self):
            return device["version"]

        def get_full_config(self, refresh=False):
            return {"system": {"time-zone": "UTC"}}

    @asynccontextmanager
    async def scoped_conn(_request):
        db["open"] = True
        try:
            yield Conn(db)
        finally:
            db["open"] = False

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", _gate("write"))
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", _gate("read"))
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())
    monkeypatch.setattr(f"{ROUTER}.request_scoped_conn", scoped_conn)
    monkeypatch.setattr(f"{ROUTER}.event_manager", SimpleNamespace(emit=lambda *_a: None))

    from routers.power import router

    app = FastAPI()

    @app.middleware("http")
    async def state(request: Request, call_next):
        loop_threads.add(threading.current_thread())
        request.state.user = {"id": "u1", "name": "User One"}
        request.state.instance = {"id": "i1"}
        return await call_next(request)

    app.include_router(router)
    return SimpleNamespace(http=TestClient(app), loop_threads=loop_threads, checks=checks)


def _off_loop(client, device):
    assert client.loop_threads, "middleware did not record the event-loop thread"
    assert device["threads"], "no device call was made"
    assert not set(device["threads"]) & client.loop_threads


@pytest.mark.parametrize("version", ["1.4.3", "2026.09.23-0027-rolling"])
@pytest.mark.parametrize("route", ROUTES)
@pytest.mark.parametrize(
    "action,value,path",
    [
        ("now", None, ["now"]),
        ("cancel", None, ["cancel"]),
        ("at", "19:30", ["at", "19:30"]),
        ("at", "9:5", ["at", "9:5"]),
        ("in", "5", ["in", "5"]),
        ("in", "05", ["in", "5"]),
        ("in", "9999999", ["in", "9999999"]),
        ("in", "0" * 4300 + "5", ["in", "5"]),
    ],
)
def test_action_sends_the_op_path_off_the_event_loop(
    client, device, version, route, action, value, path
):
    device.update(
        version=version,
        result="Reboot is scheduled 2030-01-01 19:30:00\n" if action == "at" else "",
    )
    resp = client.http.post(route, json={"action": action, "value": value})
    assert resp.status_code == 200, resp.text
    kind = route.rsplit("/", 1)[1]
    assert device["calls"] == [(kind, path)]
    _off_loop(client, device)
    assert client.checks == [("write", FeatureGroup.POWER)]


@pytest.mark.parametrize("route", ROUTES)
@pytest.mark.parametrize(
    "action,value",
    [
        ("at", None),
        ("at", ""),
        ("at", "1930"),
        ("at", "24:00"),
        ("at", "19:60"),
        ("at", "1\u0665:30"),
        ("at", "19:30 date 01/01/2030"),
        ("in", None),
        ("in", ""),
        ("in", "0"),
        ("in", "00"),
        ("in", "-5"),
        ("in", "1.5"),
        ("in", "five"),
        ("in", "\u0665"),
        ("in", "9" * 30),
        ("in", "10000000"),
        ("in", "1" * 5000),
    ],
)
def test_malformed_schedule_value_is_400_before_the_device(client, device, db, route, action, value):
    resp = client.http.post(route, json={"action": action, "value": value})
    assert resp.status_code == 400, resp.text
    assert device["calls"] == []
    assert db["executed"] == []


@pytest.mark.parametrize("route", ROUTES)
def test_in_stores_the_scheduled_row(client, db, route):
    before = _utcnow()
    resp = client.http.post(route, json={"action": "in", "value": "10"})
    assert resp.status_code == 200, resp.text
    kind = route.rsplit("/", 1)[1]
    deletes = [args for query, args in db["executed"] if query.startswith("DELETE")]
    assert deletes == [("i1",)]
    inserts = [args for query, args in db["executed"] if query.startswith("INSERT")]
    assert len(inserts) == 1
    assert inserts[0][2] == kind
    scheduled = inserts[0][3]
    assert before + timedelta(minutes=10) <= scheduled <= _utcnow() + timedelta(minutes=10)


@pytest.mark.parametrize("route", ROUTES)
def test_at_stores_the_time_the_device_reports(client, device, db, route):
    device.update(result="Reboot is scheduled 2030-01-01 19:30:00\n")
    resp = client.http.post(route, json={"action": "at", "value": "19:30"})
    assert resp.status_code == 200, resp.text
    inserts = [args for query, args in db["executed"] if query.startswith("INSERT")]
    assert inserts[0][3] == datetime(2030, 1, 1, 19, 30)
    assert resp.json()["scheduled_time"].startswith("2030-01-01T19:30:00")


@pytest.mark.parametrize("route", ROUTES)
@pytest.mark.parametrize("status,error", [(400, "boom"), (200, "boom")])
def test_failed_device_call_is_500(client, device, db, route, status, error):
    device.update(status=status, error=error)
    resp = client.http.post(route, json={"action": "now"})
    assert resp.status_code == 500
    assert resp.json()["detail"] == "VyOS command failed: boom"
    assert db["executed"] == []


@pytest.mark.parametrize("route", ROUTES)
@pytest.mark.parametrize(
    "reply",
    [
        'Invalid time "x". The valid format is HH:MM',
        "Could not cancel a reboot or poweroff: denied",
        "Incorrect format! Use HH:MM",
    ],
)
def test_rejected_reply_is_400(client, device, db, route, reply):
    device.update(result=reply + "\n")
    resp = client.http.post(route, json={"action": "cancel"})
    assert resp.status_code == 400
    assert resp.json()["detail"] == reply
    assert db["executed"] == []


@pytest.mark.parametrize("route", ROUTES)
def test_cancel_marks_every_pending_action(client, db, route):
    resp = client.http.post(route, json={"action": "cancel"})
    assert resp.status_code == 200, resp.text
    updates = [(query, args) for query, args in db["executed"] if query.startswith("UPDATE")]
    assert len(updates) == 1
    query, args = updates[0]
    assert '"actionType"' not in query
    assert args[:3] == ("u1", "User One", "i1")
    # cancelledAt is naive UTC from the app, like scheduledTime
    assert args[3].tzinfo is None
    assert abs(args[3] - _utcnow()) < timedelta(seconds=5)


def _stored_row():
    return {
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


def test_status_without_a_stored_row_skips_the_device(client, device):
    resp = client.http.get("/vyos/power/status")
    assert resp.status_code == 200
    assert resp.json()["scheduled"] is False
    assert device["calls"] == []
    assert client.checks == [("read", FeatureGroup.POWER)]


def test_status_checks_show_reboot_off_the_event_loop(client, device, db):
    db["row"] = _stored_row()
    device.update(result="Reboot is scheduled 2030-01-01 10:00:00\n")
    resp = client.http.get("/vyos/power/status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["scheduled"] is True
    assert body["action_type"] == "reboot"
    assert device["calls"] == [("show", ["reboot"])]
    _off_loop(client, device)
    assert device["conn_open"] == [False]


def test_status_clears_the_row_when_the_device_has_nothing(client, device, db):
    db["row"] = _stored_row()
    device.update(result="Reboot or poweroff is not scheduled\n")
    resp = client.http.get("/vyos/power/status")
    assert resp.status_code == 200
    assert resp.json()["scheduled"] is False
    deletes = [args for query, args in db["executed"] if query.startswith("DELETE")]
    assert deletes[-1] == ("r1",)
    query = [q for q, args in db["executed"] if args == ("r1",)][0]
    assert "WHERE id = $1 AND cancelled = false" in query


@pytest.mark.parametrize("status,error", [(400, "boom"), (200, "boom")])
def test_status_keeps_the_row_when_the_device_check_fails(client, device, db, status, error):
    db["row"] = _stored_row()
    device.update(status=status, error=error, result={})
    resp = client.http.get("/vyos/power/status")
    assert resp.status_code == 200
    assert resp.json()["scheduled"] is True
    deletes = [args for query, args in db["executed"] if query.startswith("DELETE")]
    assert deletes == [("i1",)]


def test_status_reports_a_recent_cancel_without_the_device(client, device, db):
    db["row"] = {
        **_stored_row(),
        "cancelled": True,
        "cancelledBy": "u2",
        "cancelledByName": "User Two",
        "cancelledAt": _utcnow() - timedelta(seconds=5),
    }
    resp = client.http.get("/vyos/power/status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["scheduled"] is False
    assert body["cancelled"] is True
    assert body["cancelled_by_name"] == "User Two"
    assert body["id"] == "r1"
    assert body["action_type"] == "reboot"
    assert device["calls"] == []
    deletes = [args for query, args in db["executed"] if query.startswith("DELETE")]
    assert deletes == [("i1",)]


def test_status_reads_an_old_cancel_as_nothing_scheduled(client, device, db):
    db["row"] = {
        **_stored_row(),
        "cancelled": True,
        "cancelledByName": "User Two",
        "cancelledAt": _utcnow() - timedelta(minutes=5),
    }
    body = client.http.get("/vyos/power/status").json()
    assert body["scheduled"] is False
    assert body["cancelled"] is False
    assert body["action_type"] is None
    assert device["calls"] == []


@pytest.mark.parametrize(
    "method,route,body",
    [
        ("post", "/vyos/power/reboot", {"action": "now"}),
        ("post", "/vyos/power/poweroff", {"action": "now"}),
        ("get", "/vyos/power/status", None),
    ],
)
def test_session_400_passes_through(client, monkeypatch, method, route, body):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active VyOS session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    kwargs = {"json": body} if body is not None else {}
    resp = getattr(client.http, method)(route, **kwargs)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "No active VyOS session"


class _MarkedPowerMapper(PowerMapper):
    """Stand-in that tags every path, so a path the router builds itself shows up."""

    def get_now_path(self):
        return ["now", "mapper"]

    def get_cancel_path(self):
        return ["cancel", "mapper"]

    def get_at_path(self, time):
        return ["at", time, "mapper"]

    def get_in_path(self, minutes):
        return ["in", minutes, "mapper"]

    def get_status_show_path(self):
        return ["reboot", "mapper"]


@pytest.mark.parametrize(
    "action,value,path",
    [
        ("now", None, ["now", "mapper"]),
        ("cancel", None, ["cancel", "mapper"]),
        ("at", "19:30", ["at", "19:30", "mapper"]),
        ("in", "05", ["in", "5", "mapper"]),
    ],
)
def test_action_paths_come_from_the_power_mapper(client, device, monkeypatch, action, value, path):
    monkeypatch.setitem(CommandMapperRegistry._features, "power", _MarkedPowerMapper)
    resp = client.http.post(ROUTES[0], json={"action": action, "value": value})
    assert resp.status_code == 200, resp.text
    assert device["calls"] == [("reboot", path)]


def test_status_path_comes_from_the_power_mapper(client, device, db, monkeypatch):
    monkeypatch.setitem(CommandMapperRegistry._features, "power", _MarkedPowerMapper)
    db["row"] = _stored_row()
    device.update(result="Reboot is scheduled 2030-01-01 10:00:00\n")
    assert client.http.get("/vyos/power/status").json()["scheduled"] is True
    assert device["calls"] == [("show", ["reboot", "mapper"])]
