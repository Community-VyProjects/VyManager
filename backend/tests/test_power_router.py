"""Power routes: device calls reach the stub, malformed schedule values are 400.

reboot, poweroff and show run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with
a stub service and a stub org connection so the device paths and the 400
paths are checked.
"""

import threading
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient

ROUTER = "routers.power"


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Conn:
    """Stub asyncpg connection: records writes, returns one stored row."""

    def __init__(self, row):
        self.row = row
        self.executed = []

    async def execute(self, query, *args):
        self.executed.append((" ".join(query.split()), args))

    async def fetchrow(self, _query, *_args):
        return self.row


@pytest.fixture
def stored():
    """Row the stub fetchrow returns for GET /status (None means nothing stored)."""
    return {"row": None}


@pytest.fixture
def device():
    """Result each stub device call returns, plus the calls it saw."""
    return {"result": "", "status": 200, "error": None, "calls": [], "threads": []}


@pytest.fixture
def client(monkeypatch, device, stored):
    conn = Conn(None)

    async def allow(*_args, **_kwargs):
        return None

    def _call(kind):
        def run(path):
            device["calls"].append((kind, path))
            device["threads"].append(threading.get_ident())
            return SimpleNamespace(
                status=device["status"], result=device["result"], error=device["error"]
            )

        return run

    class Service:
        def __init__(self):
            self.device = SimpleNamespace(
                reboot=_call("reboot"), poweroff=_call("poweroff"), show=_call("show")
            )

        def get_full_config(self, refresh=False):
            return {"system": {"time-zone": "UTC"}}

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())
    monkeypatch.setattr(f"{ROUTER}.event_manager", SimpleNamespace(emit=lambda *_a: None))

    from routers.power import router

    app = FastAPI()

    @app.middleware("http")
    async def state(request: Request, call_next):
        conn.row = stored["row"]
        request.state.user = {"id": "u1", "name": "User One"}
        request.state.instance = {"id": "i1"}
        request.state.org_conn = conn
        return await call_next(request)

    app.include_router(router)
    return TestClient(app), conn


ROUTES = ["/vyos/power/reboot", "/vyos/power/poweroff"]


@pytest.mark.parametrize("route", ROUTES)
@pytest.mark.parametrize(
    "action,value,path",
    [
        ("now", None, ["now"]),
        ("cancel", None, ["cancel"]),
        ("at", "19:30", ["at", "19:30"]),
        ("at", "9:05", ["at", "9:05"]),
        ("in", "5", ["in", "5"]),
    ],
)
def test_action_sends_the_op_path(client, device, route, action, value, path):
    test_client, _conn = client
    resp = test_client.post(route, json={"action": action, "value": value})
    assert resp.status_code == 200, resp.text
    kind = route.rsplit("/", 1)[1]
    assert device["calls"] == [(kind, path)]
    assert device["threads"] != [threading.get_ident()]


@pytest.mark.parametrize("route", ROUTES)
@pytest.mark.parametrize(
    "action,value",
    [
        ("at", None),
        ("at", ""),
        ("at", "1930"),
        ("at", "24:00"),
        ("at", "19:60"),
        ("at", "19:30 date 01/01/2030"),
        ("in", None),
        ("in", ""),
        ("in", "0"),
        ("in", "-5"),
        ("in", "1.5"),
        ("in", "five"),
        ("in", "\u0665"),
        ("in", "9" * 30),
    ],
)
def test_malformed_schedule_value_is_400_before_the_device(client, device, route, action, value):
    test_client, conn = client
    resp = test_client.post(route, json={"action": action, "value": value})
    assert resp.status_code == 400, resp.text
    assert device["calls"] == []
    assert conn.executed == []


@pytest.mark.parametrize("route", ROUTES)
def test_in_stores_the_scheduled_row(client, route):
    test_client, conn = client
    before = _utcnow()
    resp = test_client.post(route, json={"action": "in", "value": "10"})
    assert resp.status_code == 200, resp.text
    inserts = [args for query, args in conn.executed if query.startswith("INSERT")]
    assert len(inserts) == 1
    scheduled = inserts[0][3]
    assert before + timedelta(minutes=10) <= scheduled <= _utcnow() + timedelta(minutes=10)


@pytest.mark.parametrize("route", ROUTES)
def test_failed_device_call_is_500(client, device, route):
    test_client, _conn = client
    device.update(status=400, error="boom")
    resp = test_client.post(route, json={"action": "now"})
    assert resp.status_code == 500
    assert resp.json()["detail"] == "VyOS command failed: boom"


@pytest.mark.parametrize("route", ROUTES)
def test_device_error_text_is_400(client, device, route):
    test_client, _conn = client
    device.update(result='Invalid time "x". The valid format is HH:MM\n')
    resp = test_client.post(route, json={"action": "at", "value": "19:30"})
    assert resp.status_code == 400
    assert resp.json()["detail"] == 'Invalid time "x". The valid format is HH:MM'


def _stored_row():
    return {
        "actionType": "reboot",
        "scheduledTime": _utcnow() + timedelta(hours=1),
        "scheduledBy": "u1",
        "scheduledByName": "User One",
        "cancelled": False,
        "cancelledBy": None,
        "cancelledByName": None,
    }


def test_status_without_a_stored_row_skips_the_device(client, device):
    test_client, _conn = client
    resp = test_client.get("/vyos/power/status")
    assert resp.status_code == 200
    assert resp.json()["scheduled"] is False
    assert device["calls"] == []


def test_status_checks_show_reboot_off_the_event_loop(client, device, stored):
    test_client, _conn = client
    stored["row"] = _stored_row()
    device.update(result={"data": "Reboot is scheduled 2030-01-01 10:00:00\n"})
    resp = test_client.get("/vyos/power/status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["scheduled"] is True
    assert body["action_type"] == "reboot"
    assert device["calls"] == [("show", ["reboot"])]
    assert device["threads"] != [threading.get_ident()]


def test_status_clears_the_row_when_the_device_has_nothing(client, device, stored):
    test_client, conn = client
    stored["row"] = _stored_row()
    device.update(result={"data": "Reboot or poweroff is not scheduled\n"})
    resp = test_client.get("/vyos/power/status")
    assert resp.status_code == 200
    assert resp.json()["scheduled"] is False
    deletes = [args for query, args in conn.executed if query.startswith("DELETE")]
    assert deletes[-1] == ("i1", "reboot")


@pytest.mark.parametrize(
    "method,route,body",
    [
        ("post", "/vyos/power/reboot", {"action": "now"}),
        ("post", "/vyos/power/poweroff", {"action": "now"}),
        ("get", "/vyos/power/status", None),
    ],
)
def test_session_400_passes_through(client, monkeypatch, method, route, body):
    test_client, _conn = client

    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active VyOS session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    kwargs = {"json": body} if body is not None else {}
    resp = getattr(test_client, method)(route, **kwargs)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "No active VyOS session"
