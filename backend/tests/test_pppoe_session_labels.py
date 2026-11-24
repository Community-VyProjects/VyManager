"""PPPoE session labels are Prisma overlay rows scoped to the active instance."""

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.pppoe_server.pppoe_server as pppoe_mod

ROUTER = Path(__file__).resolve().parents[1] / "routers" / "pppoe_server" / "pppoe_server.py"


class _Store:
    def __init__(self):
        self.rows = []
        self.sql = []
        self.fail = False


class _Conn:
    def __init__(self, store: _Store):
        self.store = store

    @asynccontextmanager
    async def transaction(self):
        yield self

    async def fetchval(self, sql, *args):
        self.store.sql.append(("fetchval", sql, args))
        if self.store.fail:
            raise RuntimeError("database unavailable")
        instance_id = args[0]
        return sum(1 for row in self.store.rows if row["instanceId"] == instance_id)

    async def fetch(self, sql, *args):
        self.store.sql.append(("fetch", sql, args))
        if self.store.fail:
            raise RuntimeError("database unavailable")
        instance_id = args[0]
        rows = [row for row in self.store.rows if row["instanceId"] == instance_id]
        rows.sort(key=lambda row: (row["priority"], row["code"]))
        return rows

    async def execute(self, sql, *args):
        self.store.sql.append(("execute", sql, args))
        if self.store.fail:
            raise RuntimeError("database unavailable")
        folded = " ".join(sql.split()).upper()
        if "CREATE TABLE" in folded or "ALTER TABLE" in folded:
            raise AssertionError(f"runtime DDL is not allowed: {sql}")
        if folded.startswith("DELETE"):
            instance_id = args[0]
            self.store.rows = [
                row for row in self.store.rows if row["instanceId"] != instance_id
            ]
            return
        if "INSERT" not in folded:
            raise AssertionError(f"unexpected SQL: {sql}")
        row = {
            "id": args[0],
            "instanceId": args[1],
            "code": args[2],
            "name": args[3],
            "description": args[4],
            "severity": args[5],
            "priority": args[6],
            "enabled": args[7],
            "rules": args[8],
        }
        if any(
            existing["instanceId"] == row["instanceId"] and existing["code"] == row["code"]
            for existing in self.store.rows
        ):
            return
        self.store.rows.append(row)


@asynccontextmanager
async def _conn_cm(request):
    yield request.app.state.label_conn


def _build(monkeypatch, instance_id: Optional[str] = "i1", store=None):
    store = store or _Store()
    conn = _Conn(store)

    async def allow(*_a, **_k):
        return None

    monkeypatch.setattr(pppoe_mod, "require_read_permission", allow)
    monkeypatch.setattr(pppoe_mod, "require_write_permission", allow)
    monkeypatch.setattr(pppoe_mod, "request_scoped_conn", _conn_cm)

    app = FastAPI()
    app.state.label_conn = conn

    @app.middleware("http")
    async def _inject_state(request, call_next):
        request.state.user = {"id": "u1"}
        if instance_id is not None:
            request.state.instance = {"id": instance_id, "name": "lab"}
        return await call_next(request)

    app.include_router(pppoe_mod.router)
    return TestClient(app), store


def test_router_does_not_create_tables():
    source = ROUTER.read_text()
    assert "CREATE TABLE" not in source
    assert "_ensure_pppoe_label_table" not in source
    assert "sessionLabel" not in source


def test_get_labels_without_instance_is_404(monkeypatch):
    client, _store = _build(monkeypatch, instance_id=None)
    resp = client.get("/vyos/pppoe-server/labels")
    assert resp.status_code == 404


def test_get_labels_seeds_defaults_once_per_instance(monkeypatch):
    client, store = _build(monkeypatch, "i1")

    first = client.get("/vyos/pppoe-server/labels")
    assert first.status_code == 200, first.text
    body = first.json()
    assert [row["code"] for row in body] == ["traffic-skew"]
    assert all("session_label" not in row for row in body)

    second = client.get("/vyos/pppoe-server/labels")
    assert second.status_code == 200
    inserts = [item for item in store.sql if item[0] == "execute" and "INSERT" in item[1].upper()]
    assert len(inserts) == 1
    assert inserts[0][2][1] == "i1"


def test_labels_are_scoped_per_instance(monkeypatch):
    store = _Store()
    client_a, _ = _build(monkeypatch, "i1", store)
    client_b, _ = _build(monkeypatch, "i2", store)

    assert client_a.get("/vyos/pppoe-server/labels").status_code == 200
    assert client_b.get("/vyos/pppoe-server/labels").status_code == 200
    assert {row["instanceId"] for row in store.rows} == {"i1", "i2"}

    emptied = client_a.post("/vyos/pppoe-server/labels", json=[])
    assert emptied.status_code == 200, emptied.text
    assert emptied.json() == []
    assert [row["instanceId"] for row in store.rows] == ["i2"]


def test_save_does_not_reinsert_shipped_default(monkeypatch):
    client, store = _build(monkeypatch, "i1")
    assert client.get("/vyos/pppoe-server/labels").status_code == 200

    custom = {
        "code": "hot",
        "name": "Hot",
        "severity": "danger",
        "priority": 1,
        "enabled": True,
        "rules": {"type": "ratio", "numerator": "rx_bytes", "denominator": "tx_bytes", "operator": ">", "factor": 0.5},
    }
    resp = client.post("/vyos/pppoe-server/labels", json=[custom])
    assert resp.status_code == 200, resp.text
    codes = [row["code"] for row in resp.json()]
    assert codes == ["hot"]
    assert [row["code"] for row in store.rows if row["instanceId"] == "i1"] == ["hot"]


def test_get_labels_returns_500_on_database_error(monkeypatch):
    client, store = _build(monkeypatch, "i1")
    store.fail = True
    resp = client.get("/vyos/pppoe-server/labels")
    assert resp.status_code == 500
    assert resp.json() == {"detail": "Unable to read PPPoE session label registry"}


def _label(code, name="Name", **extra):
    return {"code": code, "name": name, "severity": "info", "priority": 10, "enabled": True, "rules": {}, **extra}


@pytest.mark.parametrize(
    "rows,detail",
    [
        ([_label("ok"), _label("  ", "Named")], "Label 'Named' needs both a code and a name"),
        ([_label(" ", " ")], "A label needs both a code and a name"),
        ([_label("hot", priority=2**31)], "Label 'hot' priority is out of range"),
        ([_label("hot", rules={"factor": -0.5})], "Label 'hot' ratio factor must be a number of 0 or more"),
        ([_label("hot", rules={"factor": "x"})], "Label 'hot' ratio factor must be a number of 0 or more"),
        ([_label("hot", rules={"factor": True})], "Label 'hot' ratio factor must be a number of 0 or more"),
        ([_label("hot", rules={"factor": -(10**400)})], "Label 'hot' ratio factor must be a number of 0 or more"),
        ([_label("hot", rules={"factor": 10**400})], "Label 'hot' ratio factor must be a number of 0 or more"),
        ([_label("hot", priority=-(2**31) - 1)], "Label 'hot' priority is out of range"),
        ([_label("hot", "  ")], "Label 'hot' needs both a code and a name"),
        ([_label("hot"), _label(" hot ", "Other")], "Duplicate label code 'hot'"),
        ([_label("x" * 81)], f"Label {'x' * 81!r} is too long"),
        ([_label("hot", "n" * 121)], "Label 'hot' is too long"),
        ([_label("hot", severity="s" * 41)], "Label 'hot' is too long"),
    ],
)
def test_save_rejects_a_bad_row_and_keeps_the_catalog(monkeypatch, rows, detail):
    client, store = _build(monkeypatch, "i1")
    assert client.get("/vyos/pppoe-server/labels").status_code == 200
    before = list(store.rows)

    resp = client.post("/vyos/pppoe-server/labels", json=rows)

    assert resp.status_code == 400
    assert resp.json() == {"detail": detail}
    assert store.rows == before



def test_save_keeps_priority_zero(monkeypatch):
    client, _store = _build(monkeypatch, "i1")

    resp = client.post("/vyos/pppoe-server/labels", json=[_label("hot", priority=0)])

    assert resp.status_code == 200, resp.text
    assert [row["priority"] for row in resp.json()] == [0]


def test_save_trims_code_and_name(monkeypatch):
    client, store = _build(monkeypatch, "i1")

    resp = client.post("/vyos/pppoe-server/labels", json=[_label(" hot ", " Hot ")])

    assert resp.status_code == 200, resp.text
    assert [(row["code"], row["name"]) for row in resp.json()] == [("hot", "Hot")]
