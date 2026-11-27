"""Power and system-updates op paths come from mappers, not the routers.

Both lab op trees have the same ``reboot``/``poweroff`` children,
``show reboot`` and ``show system updates``, so each mapper is one class for
every version. The routers load the mapper and send its path unchanged.
"""

import ast
import asyncio
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace
from typing import cast

import asyncpg
import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient

import routers.show as show
import routers.site_updates.site_updates as site_updates
from rbac_permissions import FeatureGroup, PermissionLevel
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.power import PowerMapper
from vyos_mappers.system.updates import SystemUpdatesMapper

BACKEND = Path(__file__).resolve().parents[1]
ROLLING = "2026.09.23-0027-rolling"
VERSIONS = ["1.4.3", "1.5", ROLLING, ""]
UPDATES = (
    "Current version: 2026.09.23-0027-rolling\n\n"
    "Update available: 2026.11.22-0018-rolling\n"
    "Update URL: https://example.invalid/vyos.iso\n"
)
NOT_CONFIGURED = "system update-check not configured\n"


# ==================== Mappers ====================


@pytest.mark.parametrize("version", VERSIONS)
def test_registry_returns_one_class_for_every_version(version):
    assert type(CommandMapperRegistry.get_mapper("power", version)) is PowerMapper
    assert type(CommandMapperRegistry.get_mapper("system_updates", version)) is SystemUpdatesMapper


@pytest.mark.parametrize("version", VERSIONS)
def test_paths_match_the_op_tree(version):
    power = PowerMapper(version)
    assert power.get_now_path() == ["now"]
    assert power.get_cancel_path() == ["cancel"]
    assert power.get_at_path("19:30") == ["at", "19:30"]
    assert power.get_in_path("5") == ["in", "5"]
    assert power.get_status_show_path() == ["reboot"]
    assert SystemUpdatesMapper(version).get_updates_show_path() == ["system", "updates"]


def _function(rel: str, name: str) -> ast.FunctionDef | ast.AsyncFunctionDef:
    tree = ast.parse((BACKEND / rel).read_text())
    return next(
        node
        for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name
    )


@pytest.mark.parametrize(
    "rel,name",
    [
        ("routers/power/power.py", "_action_path"),
        ("routers/power/power.py", "_run_power_action"),
        ("routers/power/power.py", "get_scheduled_power_status"),
        ("routers/show.py", "get_system_updates"),
        ("routers/site_updates/site_updates.py", "_check_one_instance"),
    ],
    ids=lambda value: value,
)
def test_routers_build_no_op_path(rel, name):
    body = _function(rel, name).body  # the signature's Callable[[], ...] is not a path
    for node in (inner for stmt in body for inner in ast.walk(stmt)):
        assert not isinstance(node, ast.List), f"{rel} {name} builds a path list"
        if isinstance(node, ast.Compare):
            for side in ast.walk(node):
                if isinstance(side, ast.Constant) and isinstance(side.value, str):
                    assert "1.4" not in side.value and "1.5" not in side.value, name


# ==================== GET /vyos/show/system-updates ====================


class StubDevice:
    def __init__(self, holder):
        self.holder = holder

    def show(self, path):
        self.holder["paths"].append(path)
        self.holder["threads"].append(threading.current_thread())
        reply = self.holder["reply"]
        if isinstance(reply, Exception):
            raise reply
        return reply


@pytest.fixture
def holder():
    return {
        "version": "1.4.3",
        "reply": SimpleNamespace(status=200, result=UPDATES, error=None),
        "paths": [],
        "threads": [],
        "permissions": [],
        "loop_threads": set(),
    }


@pytest.fixture
def client(monkeypatch, holder):
    async def read(_request, feature):
        holder["permissions"].append(("read", feature))

    def service(_request):
        return SimpleNamespace(
            device=StubDevice(holder), get_version=lambda: holder["version"]
        )

    monkeypatch.setattr(show, "require_read_permission", read)
    monkeypatch.setattr(show, "get_session_vyos_service", service)

    app = FastAPI()

    @app.middleware("http")
    async def loop_thread(request: Request, call_next):
        holder["loop_threads"].add(threading.current_thread())
        return await call_next(request)

    app.include_router(show.router)
    return TestClient(app)


@pytest.mark.parametrize("version", ["1.4.3", ROLLING])
def test_system_updates_reads_the_mapper_path_off_the_event_loop(client, holder, version):
    holder["version"] = version
    response = client.get("/vyos/show/system-updates")
    assert response.status_code == 200, response.text
    assert response.json() == {
        "configured": True,
        "current_version": "2026.09.23-0027-rolling",
        "update_available": True,
        "available_version": "2026.11.22-0018-rolling",
        "update_url": "https://example.invalid/vyos.iso",
    }
    assert holder["paths"] == [["system", "updates"]]
    assert holder["loop_threads"], "middleware did not record the event-loop thread"
    assert not set(holder["threads"]) & holder["loop_threads"]
    assert holder["permissions"] == [("read", show.FeatureGroup.SYSTEM)]


def test_system_updates_unset_url_is_not_configured(client, holder):
    # The 1.4 lab answers HTTP 200 with this line when update-check url is unset.
    holder["reply"] = SimpleNamespace(status=200, result=NOT_CONFIGURED, error=None)
    response = client.get("/vyos/show/system-updates")
    assert response.status_code == 200
    assert response.json()["configured"] is False


@pytest.mark.parametrize(
    "reply,detail",
    [
        (SimpleNamespace(status=200, result={}, error="API Error 200: refused"), "Unable to read system updates"),
        (SimpleNamespace(status=500, result={}, error="HTTP Error 500: boom"), "Unable to read system updates"),
        (ConnectionError("device unreachable"), "Internal server error"),
    ],
)
def test_system_updates_failed_read_is_a_500(client, holder, reply, detail):
    holder["reply"] = reply
    response = client.get("/vyos/show/system-updates")
    assert response.status_code == 500
    assert response.json()["detail"] == detail


def test_system_updates_session_400_survives(client, monkeypatch):
    def no_session(_request):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(show, "get_session_vyos_service", no_session)
    response = client.get("/vyos/show/system-updates")
    assert response.status_code == 400
    assert response.json()["detail"] == "No active session"


def test_system_updates_path_comes_from_the_mapper(client, holder, monkeypatch):
    class Marked(SystemUpdatesMapper):
        def get_updates_show_path(self):
            return ["system", "updates", "mapper"]

    monkeypatch.setitem(CommandMapperRegistry._features, "system_updates", Marked)
    client.get("/vyos/show/system-updates")
    assert holder["paths"] == [["system", "updates", "mapper"]]


# ==================== Site updates fan-out ====================


INSTANCE = {
    "id": "i1",
    "name": "r1",
    "host": "192.0.2.1",
    "apiKey": "k",
    "vyosVersion": "1.4.3",
    "protocol": "https",
    "port": 443,
    "verifySsl": False,
    "isActive": True,
    "timeout": 10,
}


@pytest.fixture
def site(monkeypatch, holder):
    seen = {}

    class Service:
        def __init__(self, config):
            seen["version"] = config.version
            self.device = StubDevice(holder)

    monkeypatch.setattr(site_updates, "VyOSService", Service)
    return seen


def test_site_check_reads_the_mapper_path(site, holder):
    status = site_updates._check_one_instance(cast(asyncpg.Record, INSTANCE))
    assert status.status == "ok"
    assert status.available_version == "2026.11.22-0018-rolling"
    assert holder["paths"] == [["system", "updates"]]
    assert site["version"] == "1.4.3"


def test_site_check_unset_url_is_not_configured(site, holder):
    holder["reply"] = SimpleNamespace(status=200, result=NOT_CONFIGURED, error=None)
    assert site_updates._check_one_instance(cast(asyncpg.Record, INSTANCE)).status == "not_configured"


@pytest.mark.parametrize(
    "reply,status",
    [
        (SimpleNamespace(status=200, result=UPDATES, error="API Error 200: refused"), "error"),
        (SimpleNamespace(status=400, result=None, error="HTTP Error 400"), "error"),
        (ConnectionError("device unreachable"), "unreachable"),
    ],
)
def test_site_check_refused_or_failed_reply(site, holder, reply, status):
    holder["reply"] = reply
    result = site_updates._check_one_instance(cast(asyncpg.Record, INSTANCE))
    assert result.status == status
    assert result.update_available is False


def test_site_check_path_comes_from_the_mapper(site, holder, monkeypatch):
    class Marked(SystemUpdatesMapper):
        def get_updates_show_path(self):
            return ["system", "updates", "mapper"]

    monkeypatch.setitem(CommandMapperRegistry._features, "system_updates", Marked)
    site_updates._check_one_instance(cast(asyncpg.Record, INSTANCE))
    assert holder["paths"] == [["system", "updates", "mapper"]]


class SiteConn:
    """Stub org connection: the caller's site role and the site's instances."""

    def __init__(self, role):
        self.role = role

    async def fetchval(self, query, *_args):
        return self.role if "FROM users" in query else None

    async def fetch(self, _query, *_args):
        return [dict(INSTANCE, id="i1", name="r1"), dict(INSTANCE, id="i2", name="r2")]


@pytest.fixture
def fan_out(monkeypatch, site, holder):
    state = {"role": "VIEWER", "readable": {"i1"}, "checks": []}

    @asynccontextmanager
    async def scoped(_request):
        yield SiteConn(state["role"])

    async def allow(_request, _feature):
        return None

    async def check_permission(_conn, user_id, instance_id, feature, level, org_id=None):
        state["checks"].append((user_id, instance_id, feature, level))
        return instance_id in state["readable"]

    monkeypatch.setattr(site_updates, "_cache", {})
    monkeypatch.setattr(site_updates, "request_scoped_conn", scoped)
    monkeypatch.setattr(site_updates, "require_read_permission", allow)
    monkeypatch.setattr(site_updates, "check_permission", check_permission)
    monkeypatch.setattr("org_scope.ORG_ENFORCEMENT", False)
    request = SimpleNamespace(state=SimpleNamespace(user={"id": "u1"}))

    def call():
        return asyncio.run(site_updates.get_site_updates(cast(Request, request), "s1"))

    state["call"] = call
    return state


def test_site_rollup_skips_instances_without_system_read(fan_out, holder):
    summary = fan_out["call"]()
    assert [i.instance_id for i in summary.instances] == ["i1"]
    assert summary.total == 1
    assert holder["paths"] == [["system", "updates"]]
    assert fan_out["checks"] == [
        ("u1", "i1", FeatureGroup.SYSTEM, PermissionLevel.READ),
        ("u1", "i2", FeatureGroup.SYSTEM, PermissionLevel.READ),
    ]


def test_site_rollup_serves_no_cached_status_without_system_read(fan_out, holder):
    fan_out["readable"] = {"i1", "i2"}
    fan_out["call"]()
    fan_out["readable"] = {"i1"}
    holder["paths"].clear()
    summary = fan_out["call"]()
    assert [i.instance_id for i in summary.instances] == ["i1"]
    assert summary.instances[0].cached is True
    assert holder["paths"] == []


def test_site_admin_sees_every_instance_without_feature_checks(fan_out):
    fan_out["role"] = "ADMIN"
    fan_out["readable"] = set()
    summary = fan_out["call"]()
    assert [i.instance_id for i in summary.instances] == ["i1", "i2"]
    assert fan_out["checks"] == []
