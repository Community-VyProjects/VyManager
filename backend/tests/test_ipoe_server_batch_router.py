"""IPoE server routes: item_name plus "|" values, HTTP 400 on a bad value.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with
a stub service so the emitted ops, the 400 paths and the config response are
checked.
"""

import inspect
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

ROUTER = "routers.ipoe_server.ipoe_server"
BASE = ["service", "ipoe-server"]


def _app(monkeypatch, service):
    async def allow(*_args, **_kwargs):
        return None

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: service)

    from routers.ipoe_server.ipoe_server import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


class Service:
    def __init__(self, version="1.5", status=200, error=None, config=None):
        self.version = version
        self.status = status
        self.error = error
        self.config = config or {}
        self.executed = []

    def get_version(self):
        return self.version

    def get_full_config(self, refresh=False):
        return self.config

    def execute_batch(self, batch):
        if batch.is_empty():
            raise ValueError("Cannot execute empty batch")
        self.executed.append(batch.get_operations())
        return SimpleNamespace(status=self.status, result="", error=self.error)


@pytest.fixture
def client(monkeypatch):
    service = Service()
    return _app(monkeypatch, service), service


def _post(test_client, item_name, operations):
    return test_client.post(
        "/vyos/ipoe-server/batch",
        json={"item_name": item_name, "operations": operations},
    )


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_every_builder_op_takes_the_item_and_at_most_two_values(version):
    from vyos_builders.ipoe_server import IPoEServerBatchBuilder

    builder = IPoEServerBatchBuilder(version)
    arities = {
        name: len(inspect.signature(method).parameters)
        for name, method in inspect.getmembers(builder, inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    }
    assert arities
    assert {name: n for name, n in arities.items() if n not in (1, 2, 3)} == {}
    assert {name for name, n in arities.items() if n == 3} == set(MULTI_VALUE_OPS)


def test_no_builder_op_splits_its_value_itself():
    """Each part is its own parameter, so the router's "|" split can 400."""
    from vyos_builders.ipoe_server import IPoEServerBatchBuilder

    splitting = {
        name
        for name, method in inspect.getmembers(IPoEServerBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
        and ".split(" in inspect.getsource(method)
    }
    assert splitting == set()


def test_batch_binds_item_name_and_value_onto_builder_args(client):
    test_client, service = client
    resp = _post(test_client, "eth1", [
        {"op": "set_interface_mode", "value": "l2"},
        {"op": "set_auth_mac_ip_address", "value": "00:11:22:33:44:55|192.0.2.10"},
        {"op": "set_interface_lua_username", "value": "user|name"},
        {"op": "delete_interface"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "IPoE server configuration updated"},
        "error": None,
    }
    assert service.executed == [[
        {"op": "set", "path": BASE + ["interface", "eth1", "mode", "l2"]},
        {"op": "set", "path": BASE + [
            "authentication", "interface", "eth1", "mac", "00:11:22:33:44:55",
            "ip-address", "192.0.2.10",
        ]},
        {"op": "set", "path": BASE + ["interface", "eth1", "lua-username", "user|name"]},
        {"op": "delete", "path": BASE + ["interface", "eth1"]},
    ]]


def test_batch_global_op_ignores_the_request_item(client):
    test_client, service = client
    resp = _post(test_client, "ipoe", [{"op": "set_description", "value": "lab"}])
    assert resp.status_code == 200, resp.text
    assert service.executed == [[{"op": "set", "path": BASE + ["description", "lab"]}]]


@pytest.mark.parametrize("operation", [
    {"op": "set_description"},
    {"op": "set_description", "value": ""},
    {"op": "set_description", "value": "   "},
    {"op": "set_auth_mac_ip_address"},
    {"op": "set_auth_mac_ip_address", "value": ""},
    {"op": "set_auth_mac_ip_address", "value": "   "},
])
def test_batch_missing_value_is_400(client, operation):
    test_client, service = client
    resp = _post(test_client, "eth1", [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert service.executed == []


@pytest.mark.parametrize("item_name,op,value", [
    ("eth1", "delete_interface", "mode"),
    ("eth1", "delete_auth_interface", "00:11:22:33:44:55"),
    ("192.0.2.1", "delete_radius_server", "key"),
    ("eth1", "set_interface_vlan_mon", "x"),
])
def test_batch_item_only_op_with_a_value_is_400(client, item_name, op, value):
    """A value on an item-only op must not run the wider op on the item."""
    test_client, service = client
    resp = _post(test_client, item_name, [
        {"op": "set_description", "value": "lab"},
        {"op": op, "value": value},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} takes no value"
    assert service.executed == []


MULTI_VALUE_OPS = {
    "set_auth_mac_ip_address": ("00:11:22:33:44:55", "192.0.2.10"),
    "set_auth_mac_vlan": ("00:11:22:33:44:55", "10"),
    "set_auth_mac_rate_limit_download": ("00:11:22:33:44:55", "100"),
    "set_auth_mac_rate_limit_upload": ("00:11:22:33:44:55", "50"),
    "set_ipv6_pool_prefix": ("2001:db8::/48", "64"),
    "set_ipv6_pool_delegate": ("2001:db8:1::/48", "56"),
}


@pytest.mark.parametrize("op", sorted(MULTI_VALUE_OPS))
@pytest.mark.parametrize("shape", ["no_separator", "empty_second", "empty_first", "blank_second", "bare"])
def test_batch_short_multi_value_is_400(client, op, shape):
    first, second = MULTI_VALUE_OPS[op]
    value = {
        "no_separator": first,
        "empty_second": f"{first}|",
        "empty_first": f"|{second}",
        "blank_second": f"{first}| ",
        "bare": "|",
    }[shape]
    test_client, service = client
    resp = _post(test_client, "eth1", [{"op": op, "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} requires 2 values"
    assert service.executed == []


@pytest.mark.parametrize("op", sorted(MULTI_VALUE_OPS))
def test_batch_full_multi_value_is_accepted(client, op):
    first, second = MULTI_VALUE_OPS[op]
    test_client, service = client
    resp = _post(test_client, "p1", [{"op": op, "value": f"{first}|{second}"}])
    assert resp.status_code == 200, resp.text
    path = service.executed[0][0]["path"]
    assert path[-1] == second
    assert first in path


@pytest.mark.parametrize("item_name,op,value,path_tail", [
    ("192.0.2.2", "set_radius_server_key", "abc|", ["server", "192.0.2.2", "key", "abc|"]),
    ("ipoe", "set_radius_dynamic_author_key", "|abc", ["dynamic-author", "key", "|abc"]),
    ("ipoe", "set_description", "WAN || LAN", ["description", "WAN || LAN"]),
    ("eth1", "set_interface_lua_username", "|", ["lua-username", "|"]),
])
def test_batch_non_composite_value_keeps_its_pipes(client, item_name, op, value, path_tail):
    test_client, service = client
    resp = _post(test_client, item_name, [{"op": op, "value": value}])
    assert resp.status_code == 200, resp.text
    path = service.executed[0][0]["path"]
    assert path[-len(path_tail):] == path_tail


@pytest.mark.parametrize("item_name", ["", "   "])
def test_batch_blank_item_name_is_422(client, item_name):
    test_client, service = client
    resp = _post(test_client, item_name, [{"op": "delete_interface"}])
    assert resp.status_code == 422, resp.text
    assert service.executed == []


def test_batch_unknown_op_is_400(client):
    test_client, service = client
    resp = _post(test_client, "eth1", [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert service.executed == []


def test_batch_with_no_ops_returns_success_without_the_device(client):
    test_client, service = client
    resp = _post(test_client, "ipoe", [])
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert resp.json()["data"] == {"message": "No operations to execute"}
    assert service.executed == []


def test_batch_execute_value_error_stays_500(monkeypatch):
    class Failing(Service):
        def execute_batch(self, batch):
            raise ValueError("Cannot execute empty batch")

    test_client = _app(monkeypatch, Failing())
    resp = _post(test_client, "ipoe", [{"op": "set_description", "value": "lab"}])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"


def test_batch_failed_commit_returns_error_without_success_message(monkeypatch):
    service = Service(status=400, error="Commit failed")
    test_client = _app(monkeypatch, service)
    resp = _post(test_client, "ipoe", [{"op": "set_description", "value": "lab"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_config_route_returns_the_parsed_lists(monkeypatch, version):
    service = Service(version=version, config={
        "service": {
            "ipoe-server": {
                "interface": {"eth1": {"mode": "l2"}},
                "authentication": {
                    "mode": "radius",
                    "radius": {"server": {"192.0.2.1": {"key": "s3cret"}}},
                },
            },
        },
    })
    test_client = _app(monkeypatch, service)
    resp = test_client.get("/vyos/ipoe-server/config")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["configured"] is True
    assert [row["interface"] for row in body["interfaces"]] == ["eth1"]
    assert body["authentication"]["radius"]["servers"][0]["key"] == "***"
    assert "s3cret" not in resp.text
    assert body["totals"]["radius_servers"] == 1


def test_config_route_builds_the_response_model_when_unconfigured(monkeypatch):
    test_client = _app(monkeypatch, Service(config={"service": {}}))
    resp = test_client.get("/vyos/ipoe-server/config")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["configured"] is False
    assert body["interfaces"] == []
    assert body["authentication"]["interfaces"] == []
    assert body["authentication"]["radius"]["servers"] == []
    assert body["authentication"]["radius"]["dynamic_author"] == {
        "server": None, "port": None, "key": None,
    }
    assert body["totals"]["interfaces"] == 0


def test_config_route_model_keeps_every_parsed_key():
    """The response model must not drop a key the screen reads."""
    from routers.ipoe_server.ipoe_server import IPoEConfig
    from vyos_mappers.ipoe_server import IPoEServerMapper

    parsed = IPoEServerMapper("1.5").parse_config({"service": {"ipoe-server": {
        "interface": {"eth1": {"external-dhcp": {"giaddr": "192.0.2.1"}}},
        "authentication": {"interface": {"eth1": {"mac": {"00:11:22:33:44:55": {}}}}},
        "client-ip-pool": {"p1": {}},
        "client-ipv6-pool": {"v6": {"prefix": {"2001:db8::/48": {}}}},
    }}})
    assert IPoEConfig(**parsed).model_dump() == parsed


@pytest.mark.parametrize("op,item_name,value,node", [
    ("set_idle_timeout", "ipoe", "300", "idle_timeout"),
    ("delete_idle_timeout", "ipoe", None, "idle_timeout"),
    ("set_interface_vlan_mon", "eth1", None, "vlan_mon"),
    ("delete_interface_vlan_mon", "eth1", None, "vlan_mon"),
])
def test_batch_1_5_only_op_on_1_4_is_400_before_the_device(monkeypatch, op, item_name, value, node):
    service = Service(version="1.4.3")
    test_client = _app(monkeypatch, service)
    operation = {"op": op} if value is None else {"op": op, "value": value}
    resp = _post(test_client, item_name, [
        {"op": "set_description", "value": "lab"},
        operation,
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"ipoe-server {node} is not supported on this device"
    assert service.executed == []


@pytest.mark.parametrize("version", ["1.5", "2026.09.23-0027-rolling"])
def test_batch_1_5_only_ops_reach_the_device_on_1_5(monkeypatch, version):
    service = Service(version=version)
    test_client = _app(monkeypatch, service)
    resp = _post(test_client, "ipoe", [
        {"op": "set_idle_timeout", "value": "300"},
        {"op": "delete_idle_timeout"},
    ])
    assert resp.status_code == 200, resp.text
    resp = _post(test_client, "eth1", [{"op": "set_interface_vlan_mon"}])
    assert resp.status_code == 200, resp.text
    assert service.executed == [
        [
            {"op": "set", "path": BASE + ["idle-timeout", "300"]},
            {"op": "delete", "path": BASE + ["idle-timeout"]},
        ],
        [{"op": "set", "path": BASE + ["interface", "eth1", "vlan-mon"]}],
    ]


@pytest.mark.parametrize("version,expected", [
    ("1.4.3", False),
    ("1.5", True),
    ("2026.09.23-0027-rolling", True),
])
def test_capabilities_read_the_mapper_allowlist(monkeypatch, version, expected):
    test_client = _app(monkeypatch, Service(version=version))
    resp = test_client.get("/vyos/ipoe-server/capabilities")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["features"]["vlan_mon"] is expected
    assert body["features"]["idle_timeout"] is expected
    assert "version_info" not in body
    assert body["values"] == {
        "auth_modes": ["local", "radius", "noauth"],
        "interface_modes": ["l2", "l3"],
        "interface_networks": ["shared", "vlan"],
        "start_session": ["auto", "dhcp", "unclassified-packet"],
        "log_levels": ["0", "1", "2", "3", "4", "5"],
    }


def test_capabilities_do_not_read_the_version_string(monkeypatch):
    """A 1.4 string with the 1.5 mapper still reports the 1.5 leaves."""
    from vyos_mappers.ipoe_server.ipoe_server_versions import IPoEServerMapperV1_5

    monkeypatch.setattr(
        "vyos_builders.ipoe_server.ipoe_server_batch_builder.CommandMapperRegistry.get_mapper",
        lambda _feature, version: IPoEServerMapperV1_5(version),
    )
    from vyos_builders.ipoe_server import IPoEServerBatchBuilder

    features = IPoEServerBatchBuilder("1.4.3").get_capabilities()["features"]
    assert features["vlan_mon"] is True
    assert features["idle_timeout"] is True


@pytest.mark.parametrize("method,path", [
    ("get", "/vyos/ipoe-server/capabilities"),
    ("get", "/vyos/ipoe-server/config"),
    ("post", "/vyos/ipoe-server/batch"),
])
def test_routes_pass_a_session_400_through(monkeypatch, method, path):
    from fastapi import HTTPException

    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active VyOS session")

    test_client = _app(monkeypatch, Service())
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    if method == "post":
        resp = _post(test_client, "ipoe", [{"op": "set_description", "value": "lab"}])
    else:
        resp = test_client.get(path)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active VyOS session"


def test_config_route_reports_bare_sections_and_idle_timeout(monkeypatch):
    service = Service(config={"service": {"ipoe-server": {
        "idle-timeout": "300",
        "shaper": {},
        "limits": {},
        "snmp": {},
    }}})
    test_client = _app(monkeypatch, service)
    body = test_client.get("/vyos/ipoe-server/config").json()
    assert body["idle_timeout"] == "300"
    assert body["shaper"] == {"enabled": True, "fwmark": None}
    assert body["limits"] == {"enabled": True, "burst": None, "connection_limit": None, "timeout": None}
    assert body["snmp"] == {"enabled": True, "master_agent": False}

    service.config = {"service": {"ipoe-server": {"interface": {"eth1": {}}}}}
    body = test_client.get("/vyos/ipoe-server/config").json()
    assert body["idle_timeout"] is None
    assert body["shaper"]["enabled"] is False
    assert body["limits"]["enabled"] is False
    assert body["snmp"]["enabled"] is False
