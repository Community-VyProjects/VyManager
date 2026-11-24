"""Service monitoring router: comma-split args, a value on a zero-arg op, version gates, failed commits.

A stub service records what the handler sends. Device calls must run off the
event loop: the app middleware records the loop thread and the stub compares
its own thread against it.
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.service_monitoring.service_monitoring"
BASE = ["service", "monitoring"]
BLACKBOX = BASE + ["prometheus", "blackbox-exporter"]


@pytest.fixture
def commit():
    return {"status": 200, "error": None, "version": "1.5"}


@pytest.fixture
def client(monkeypatch, commit):
    executed = []
    loop_threads = set()
    device_threads = []
    permissions = []

    async def read(_req, feature):
        permissions.append(("read", feature))

    async def write(_req, feature):
        permissions.append(("write", feature))

    class Service:
        def get_version(self):
            return commit["version"]

        def get_full_config(self, refresh=False):
            device_threads.append(threading.current_thread())
            return {"service": {"monitoring": {
                "telegraf": {"loki": {
                    "url": "https://loki.example",
                    "authentication": {"username": "loki", "password": "T-secret"},
                }},
            }}}

        def execute_batch(self, batch):
            device_threads.append(threading.current_thread())
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", read)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", write)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.service_monitoring.service_monitoring import router

    app = FastAPI()

    @app.middleware("http")
    async def record_loop(request, call_next):
        loop_threads.add(threading.current_thread())
        return await call_next(request)

    app.include_router(router)
    with TestClient(app) as test_client:
        yield SimpleNamespace(
            http=test_client,
            executed=executed,
            loop_threads=loop_threads,
            device_threads=device_threads,
            permissions=permissions,
        )


def _post(c, operations):
    return c.http.post("/vyos/service-monitoring/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    resp = _post(client, [
        {"op": "set_telegraf_source", "value": "network"},
        {"op": "delete_telegraf_loki_auth"},
        {"op": "set_zabbix_server_active_port", "value": "192.0.2.1,10051"},
        {"op": "set_prometheus_blackbox_icmp_timeout", "value": "probe1,5"},
        {"op": "set_prometheus_blackbox_dns_query_name", "value": "probe2,example.com"},
        {"op": "delete_prometheus_blackbox_dns_module", "value": "probe3"},
        {"op": "delete_zabbix_auth"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "Service monitoring configuration updated"},
        "error": None,
    }
    assert client.executed == [[
        {"op": "set", "path": BASE + ["telegraf", "source", "network"]},
        {"op": "delete", "path": BASE + ["telegraf", "loki", "authentication"]},
        {"op": "set", "path": BASE + ["zabbix-agent", "server-active", "192.0.2.1", "port", "10051"]},
        {"op": "set", "path": BLACKBOX + ["modules", "icmp", "name", "probe1", "timeout", "5"]},
        {"op": "set", "path": BLACKBOX + ["modules", "dns", "name", "probe2", "query-name", "example.com"]},
        {"op": "delete", "path": BLACKBOX + ["modules", "dns", "name", "probe3"]},
        {"op": "delete", "path": BASE + ["zabbix-agent", "authentication"]},
    ]]
    assert client.permissions == [("write", "SERVICE_MONITORING")]


def test_last_arg_keeps_commas(client):
    resp = _post(client, [{"op": "set_telegraf_loki_auth_password", "value": "a,b"}])
    assert resp.status_code == 200, resp.text
    assert client.executed == [[
        {"op": "set", "path": BASE + ["telegraf", "loki", "authentication", "password", "a,b"]},
    ]]


def test_device_calls_run_off_the_event_loop(client):
    assert client.http.get("/vyos/service-monitoring/config").status_code == 200
    assert _post(client, [{"op": "delete_telegraf_vrf"}]).status_code == 200
    assert len(client.device_threads) == 2
    assert client.loop_threads
    for thread in client.device_threads:
        assert thread not in client.loop_threads


def test_config_masks_secrets(client):
    resp = client.http.get("/vyos/service-monitoring/config")
    assert resp.status_code == 200, resp.text
    loki = resp.json()["telegraf"]["loki"]
    assert loki["authentication"] == {"username": "loki", "password": "***"}
    assert "T-secret" not in resp.text
    assert client.permissions == [("read", "SERVICE_MONITORING")]


@pytest.mark.parametrize("version,supported", [("1.4", False), ("1.5", True)])
def test_capabilities_require_read(client, commit, version, supported):
    commit["version"] = version
    resp = client.http.get("/vyos/service-monitoring/capabilities")
    assert resp.status_code == 200, resp.text
    assert resp.json()["features"]["prometheus"]["supported"] is supported
    assert client.permissions == [("read", "SERVICE_MONITORING")]


@pytest.mark.parametrize("operation", [
    {"op": "set_telegraf_source"},
    {"op": "set_telegraf_vrf", "value": ""},
    {"op": "delete_telegraf_source"},
    {"op": "delete_prometheus_blackbox_icmp_module", "value": ""},
    {"op": "set_zabbix_server_active_port"},
])
def test_batch_missing_value_is_400(client, operation):
    """A missing value is 400, not a skipped op that still reports success."""
    resp = _post(client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert client.executed == []


@pytest.mark.parametrize("op", [
    "delete_service_monitoring",
    "delete_telegraf",
    "delete_telegraf_vrf",
    "delete_telegraf_loki_auth",
    "delete_zabbix_all_servers",
    "delete_network_event_all_events",
])
def test_batch_value_on_zero_arg_op_is_400(client, op):
    """A value on a zero-arg op is 400, not the value dropped and the wider op run."""
    resp = _post(client, [
        {"op": "set_telegraf_source", "value": "network"},
        {"op": op, "value": "x"},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} takes no value"
    assert client.executed == []


@pytest.mark.parametrize("value", ["192.0.2.1", "192.0.2.1,", ",10051"])
def test_batch_short_value_is_400(client, value):
    resp = _post(client, [{"op": "set_zabbix_server_active_port", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_zabbix_server_active_port requires 2 values"
    assert client.executed == []


@pytest.mark.parametrize("op, detail", [
    ("no_such_op", "Unknown operation: no_such_op"),
    ("add_set", "Invalid operation: add_set"),
    ("_versioned_path", "Invalid operation: _versioned_path"),
])
def test_batch_unknown_op_is_400(client, op, detail):
    resp = _post(client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert client.executed == []


@pytest.mark.parametrize("op, value, node", [
    ("set_prometheus_node_exporter_port", "9100", "prometheus"),
    ("delete_network_event", None, "network-event"),
    ("set_zabbix_auth_psk_id", "id1", "zabbix-agent authentication"),
    ("delete_zabbix_auth", None, "zabbix-agent authentication"),
])
def test_batch_v15_node_on_1_4_is_400(client, commit, op, value, node):
    """A 1.5-only node on 1.4 is a 400 from the mapper gate and nothing commits."""
    commit["version"] = "1.4"
    operation = {"op": op} if value is None else {"op": op, "value": value}
    resp = _post(client, [{"op": "set_telegraf_source", "value": "network"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"service monitoring {node} is not supported on this device"
    assert client.executed == []


def test_failed_commit_reports_the_error(client, commit):
    commit.update(status=400, error="Commit failed: T-err")
    resp = _post(client, [{"op": "delete_telegraf_vrf"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: T-err"}


def test_batch_empty_is_500(client):
    resp = _post(client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert client.executed == []


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/service-monitoring/capabilities", None),
    ("get", "/vyos/service-monitoring/config", None),
    ("post", "/vyos/service-monitoring/batch", {"operations": []}),
])
def test_session_400_passes_through(client, monkeypatch, method, path, body):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = getattr(client.http, method)(path, **({"json": body} if body is not None else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
