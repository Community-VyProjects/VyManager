"""PPPoE server routes: typed config response, op-mode reset path and batch 400s.

execute_batch, get_full_config and device.reset run through run_in_threadpool
(locked in test_batch_off_event_loop.py). These tests drive the handlers end to
end with a stub service so the config response model, the emitted ops and the
400 paths are checked.
"""

import inspect
import re
import threading
from types import SimpleNamespace
from typing import cast

import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient

from routers.pppoe_server.pppoe_server import PPPoEConfig
from vyos_builders.pppoe_server import PPPoEServerBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.pppoe_server import PPPoEServerMapper

ROUTER = "routers.pppoe_server.pppoe_server"
BASE = ["service", "pppoe-server"]


class Service:
    def __init__(self, version="1.5", config=None):
        self.version = version
        self.config = config or {}
        self.executed = []
        self.reset_paths = []
        self.threads = []
        self.loop_threads = []
        self.status = 200
        self.error = None
        self.raise_on_execute = None
        self.device = SimpleNamespace(reset=self._reset)

    def get_version(self):
        return self.version

    def get_full_config(self, refresh=False):
        self.threads.append(threading.get_ident())
        return self.config

    def execute_batch(self, batch):
        self.threads.append(threading.get_ident())
        if self.raise_on_execute is not None:
            raise self.raise_on_execute
        if batch.is_empty():
            raise ValueError("Cannot execute empty batch")
        self.executed.append(batch.get_operations())
        return SimpleNamespace(status=self.status, result="", error=self.error)

    def _reset(self, path):
        self.threads.append(threading.get_ident())
        self.reset_paths.append(path)
        return SimpleNamespace(status=self.status, result="", error=self.error)


def _app(monkeypatch, service, checks=None):
    def recorder(kind):
        async def check(_request, feature):
            if checks is not None:
                checks.append((kind, feature))
        return check

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", recorder("write"))
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", recorder("read"))
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: service)

    from routers.pppoe_server.pppoe_server import router

    app = FastAPI()

    @app.middleware("http")
    async def record_loop_thread(request: Request, call_next):
        service.loop_threads.append(threading.get_ident())
        return await call_next(request)

    app.include_router(router)
    return TestClient(app, raise_server_exceptions=False)


def _post(client, item_name, operations):
    return client.post(
        "/vyos/pppoe-server/batch",
        json={"item_name": item_name, "operations": operations},
    )


FULL_TREE = {
    "service": {
        "pppoe-server": {
            "description": "isp",
            "access-concentrator": "ac1",
            "service-name": ["isp", "backup"],
            "gateway-address": "10.0.0.1",
            "name-server": ["1.1.1.1", "8.8.8.8"],
            "mtu": "1492",
            "default-pool": "p4",
            "accept-any-service": {},
            "pado-delay": {"100": {"sessions": "50"}},
            "log": {"level": "3"},
            "snmp": {"master-agent": {}},
            "limits": {"burst": "3"},
            "ppp-options": {"disable-ccp": {}, "mppe": "prefer", "ipv6-peer-interface-id-secret": "psecret"},
            "authentication": {
                "mode": "local",
                "protocols": "mschap-v2",
                "any-login": {},
                "local-users": {"username": {"alice": {
                    "password": "secret",
                    "disable": {},
                    "static-ip": "10.0.0.5",
                    "rate-limit": {"download": "1000"},
                }}},
                "radius": {
                    "server": {"192.0.2.1": {"key": "rkey", "port": "1812", "backup": {}}},
                    "dynamic-author": {"server": "192.0.2.2", "port": "3799", "key": "dkey"},
                    "rate-limit": {"enable": {}, "attribute": "Filter-Id"},
                },
            },
            "client-ip-pool": {"p4": {"range": "10.0.0.0/24", "next-pool": "p5"}, "p5": {"range": ["10.1.0.0/24"]}},
            "client-ipv6-pool": {"p6": {
                "prefix": {"2001:db8::/48": {"mask": "64"}},
                "delegate": {"2001:db8:1::/48": {"delegation-prefix": "56"}},
            }},
            "interface": {"eth1": {"vlan": ["10", "20"], "vlan-mon": {}, "combined": {}}},
        }
    }
}


@pytest.mark.parametrize("version", ["1.4", "1.5", "1.5-rolling-202611"])
def test_registry_mapper_parses_into_the_response_model(version):
    mapper = cast(PPPoEServerMapper, CommandMapperRegistry.get_mapper("pppoe_server", version))
    data = PPPoEConfig(**mapper.parse_config(FULL_TREE)).model_dump()

    assert data["configured"] is True
    assert data["gateway_address"] == "10.0.0.1"
    assert data["service_names"] == ["isp", "backup"]
    assert data["name_servers"] == ["1.1.1.1", "8.8.8.8"]
    assert data["accept_any_service"] is True
    assert data["accept_blank_service"] is False
    assert data["pado_delays"] == [{"delay": "100", "sessions": "50"}]
    assert data["log"] == {"level": "3"}
    assert data["snmp"] == {"master_agent": True}
    assert data["ppp_options"]["disable_ccp"] is True
    assert data["ppp_options"]["ipv6_peer_interface_id_secret"] == "***"
    auth = data["authentication"]
    assert auth["protocols"] == ["mschap-v2"]
    assert auth["any_login"] is True
    assert auth["local_users"] == [{
        "username": "alice",
        "password": "***",
        "disabled": True,
        "static_ip": "10.0.0.5",
        "rate_limit": {"download": "1000", "upload": None},
    }]
    radius = auth["radius"]
    assert radius["servers"][0]["key"] == "***"
    assert radius["servers"][0]["backup"] is True
    assert radius["dynamic_author"] == {"server": "192.0.2.2", "port": "3799", "key": "***"}
    assert radius["rate_limit"]["enable"] is True
    assert data["client_ip_pools"] == [
        {"name": "p4", "ranges": ["10.0.0.0/24"], "next_pool": "p5"},
        {"name": "p5", "ranges": ["10.1.0.0/24"], "next_pool": None},
    ]
    assert data["client_ipv6_pools"] == [{
        "name": "p6",
        "prefixes": [{"prefix": "2001:db8::/48", "mask": "64"}],
        "delegates": [{"prefix": "2001:db8:1::/48", "delegation_prefix": "56"}],
    }]
    assert data["interfaces"] == [{
        "interface": "eth1", "vlans": ["10", "20"], "vlan_mon": True, "combined": True,
    }]
    assert data["totals"] == {
        "local_users": 1, "radius_servers": 1, "client_ip_pools": 2, "client_ipv6_pools": 1, "interfaces": 1,
    }


def test_parse_never_returns_a_plain_secret():
    text = repr(PPPoEServerMapper("1.5").parse_config(FULL_TREE))
    for secret in ("'secret'", "'rkey'", "'dkey'", "'psecret'"):
        assert secret not in text


def test_unconfigured_has_the_same_shape_as_configured():
    mapper = PPPoEServerMapper("1.5")
    empty = mapper.parse_config({})
    full = mapper.parse_config(FULL_TREE)

    def shape(value):
        if isinstance(value, dict):
            return {key: shape(item) for key, item in value.items()}
        return type(value).__name__ if isinstance(value, (list, bool, int)) else "scalar"

    assert empty["configured"] is False
    assert set(empty) == set(full)
    for key in ("log", "shaper", "snmp", "extended_scripts", "limits", "ppp_options", "authentication", "totals"):
        assert set(empty[key]) == set(full[key]), key
    assert shape(empty["authentication"]["radius"]).keys() == shape(full["authentication"]["radius"]).keys()
    assert empty["totals"] == dict.fromkeys(full["totals"], 0)
    PPPoEConfig(**empty)


def test_bare_root_is_configured_and_flags_parse_false():
    data = PPPoEConfig(**PPPoEServerMapper("1.5").parse_config({"service": {"pppoe-server": {}}}))

    assert data.configured is True
    assert data.accept_any_service is False
    assert data.snmp.master_agent is False
    assert data.authentication.any_login is False
    assert data.authentication.radius.preallocate_vif is False
    assert data.service_names == []
    assert data.gateway_address is None


def test_get_config_returns_the_typed_model(monkeypatch):
    checks = []
    client = _app(monkeypatch, Service(config=FULL_TREE), checks)

    response = client.get("/vyos/pppoe-server/config")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == set(PPPoEConfig.model_fields)
    assert body["authentication"]["local_users"][0]["password"] == "***"
    assert checks == [("read", checks[0][1])]
    assert str(checks[0][1]).lower().endswith("pppoe")


def test_get_config_unconfigured_returns_totals(monkeypatch):
    client = _app(monkeypatch, Service(config={"service": {}}))

    body = client.get("/vyos/pppoe-server/config").json()

    assert body["configured"] is False
    assert body["totals"]["interfaces"] == 0
    assert body["interfaces"] == []


def test_device_calls_run_off_the_event_loop(monkeypatch):
    service = Service(config=FULL_TREE)
    client = _app(monkeypatch, service)

    client.get("/vyos/pppoe-server/config")
    _post(client, "pppoe", [{"op": "set_description", "value": "x"}])
    client.post("/vyos/pppoe-server/sessions/alice/reset")

    assert len(service.threads) == 3
    assert service.loop_threads
    assert not set(service.loop_threads) & set(service.threads)


def test_reset_uses_the_mapper_op_path(monkeypatch):
    service = Service()
    checks = []
    client = _app(monkeypatch, service, checks)

    response = client.post("/vyos/pppoe-server/sessions/al%20ice/reset")

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert service.reset_paths == [["pppoe-server", "username", "al ice"]]
    assert PPPoEServerMapper("1.4").session_reset_path("bob") == ["pppoe-server", "username", "bob"]
    assert [kind for kind, _ in checks] == ["write"]


def test_reset_rejects_a_bad_username(monkeypatch):
    service = Service()
    client = _app(monkeypatch, service)

    response = client.post("/vyos/pppoe-server/sessions/%20/reset")

    assert response.status_code == 400
    assert service.reset_paths == []


def test_batch_binds_item_name_and_value(monkeypatch):
    service = Service()
    checks = []
    client = _app(monkeypatch, service, checks)

    response = _post(client, "alice", [
        {"op": "create_local_user"},
        {"op": "set_local_user_password", "value": "a|b c"},
    ])

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": {"message": "PPPoE server configuration updated"},
        "error": None,
    }
    users = BASE + ["authentication", "local-users", "username", "alice"]
    assert [op["path"] for op in service.executed[0]] == [users, users + ["password", "a|b c"]]
    assert [kind for kind, _ in checks] == ["write"]


def test_global_op_ignores_item_name(monkeypatch):
    service = Service()
    client = _app(monkeypatch, service)

    response = _post(client, "pppoe", [{"op": "set_description", "value": "isp"}])

    assert response.status_code == 200
    assert [op["path"] for op in service.executed[0]] == [BASE + ["description", "isp"]]


@pytest.mark.parametrize(
    "operation,detail",
    [
        ({"op": "set_description"}, "Operation set_description requires a value"),
        ({"op": "set_description", "value": ""}, "Operation set_description requires a value"),
        ({"op": "set_description", "value": "  "}, "Operation set_description requires a value"),
        ({"op": "delete_description", "value": "x"}, "Operation delete_description takes no value"),
        ({"op": "nope"}, "Unknown operation: nope"),
        ({"op": "_mapper"}, "Invalid operation: _mapper"),
        ({"op": "get_capabilities"}, "Invalid operation: get_capabilities"),
    ],
)
def test_batch_rejects_bad_operations(monkeypatch, operation, detail):
    service = Service()
    client = _app(monkeypatch, service)

    response = _post(client, "pppoe", [{"op": "set_mtu", "value": "1492"}, operation])

    assert response.status_code == 400
    assert response.json()["detail"] == detail
    assert service.executed == []


def test_batch_rejects_a_blank_item_name(monkeypatch):
    service = Service()
    client = _app(monkeypatch, service)

    response = _post(client, "  ", [{"op": "delete_local_user"}])

    assert response.status_code == 422
    assert service.executed == []


def test_batch_version_gate_is_400_on_1_4(monkeypatch):
    service = Service(version="1.4")
    client = _app(monkeypatch, service)

    response = _post(client, "pppoe", [
        {"op": "set_mtu", "value": "1492"},
        {"op": "set_auth_any_login"},
    ])

    assert response.status_code == 400
    assert response.json()["detail"] == "pppoe-server any_login is not supported on this device"
    assert service.threads == []


def test_batch_failed_commit_returns_no_data(monkeypatch):
    service = Service()
    service.status = 400
    service.error = "Commit failed"
    client = _app(monkeypatch, service)

    response = _post(client, "pppoe", [{"op": "set_mtu", "value": "1492"}])

    assert response.status_code == 200
    assert response.json() == {"success": False, "data": None, "error": "Commit failed"}


def test_batch_empty_returns_success_without_the_device(monkeypatch):
    service = Service()
    client = _app(monkeypatch, service)

    response = _post(client, "pppoe", [])

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert service.threads == []


def test_batch_value_error_from_execute_batch_is_500(monkeypatch):
    service = Service()
    service.raise_on_execute = ValueError("boom")
    client = _app(monkeypatch, service)

    response = _post(client, "pppoe", [{"op": "set_mtu", "value": "1492"}])

    assert response.status_code == 500
    assert response.json()["detail"] == "Internal server error"


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("get", "/vyos/pppoe-server/capabilities", None),
        ("get", "/vyos/pppoe-server/config", None),
        ("get", "/vyos/pppoe-server/sessions", None),
        ("post", "/vyos/pppoe-server/sessions/alice/reset", None),
        ("post", "/vyos/pppoe-server/batch", {"item_name": "pppoe", "operations": [{"op": "set_mtu", "value": "1"}]}),
    ],
)
def test_session_lookup_400_survives(monkeypatch, method, path, body):
    client = _app(monkeypatch, Service())

    def missing(_request):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", missing)

    response = getattr(client, method)(path, **({"json": body} if body is not None else {}))

    assert response.status_code == 400
    assert response.json()["detail"] == "No active session"


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_every_op_takes_the_item_and_at_most_two_values(version):
    builder = PPPoEServerBatchBuilder(version=version)
    ops = [
        (name, len(inspect.signature(method).parameters))
        for name, method in inspect.getmembers(builder, inspect.ismethod)
        if re.match(r"(set|delete|create)_", name)
    ]

    assert ops
    assert {name: count for name, count in ops if count not in (1, 2, 3)} == {}


def test_three_part_op_splits_on_the_bar(monkeypatch):
    service = Service()
    client = _app(monkeypatch, service)

    response = _post(client, "P6", [{"op": "set_ipv6_pool_delegate", "value": "2001:db8::/48|56"}])

    assert response.status_code == 200
    assert [op["path"] for op in service.executed[0]] == [
        BASE + ["client-ipv6-pool", "P6", "delegate", "2001:db8::/48", "delegation-prefix", "56"],
    ]


def test_three_part_op_short_value_is_400(monkeypatch):
    service = Service()
    client = _app(monkeypatch, service)

    response = _post(client, "P6", [{"op": "set_ipv6_pool_prefix_mask", "value": "2001:db8::/48"}])

    assert response.status_code == 400
    assert response.json()["detail"] == "Operation set_ipv6_pool_prefix_mask requires 2 values"
    assert service.executed == []
