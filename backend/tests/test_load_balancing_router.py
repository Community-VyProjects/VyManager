"""Load-balancing routes: typed config response and batch 400s.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with
a stub service so the config response model, the emitted ops and the 400
paths are checked.
"""

import inspect
from types import SimpleNamespace
from typing import cast

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.load_balancing.load_balancing"


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


def _app(monkeypatch, service, checks=None):
    def recorder(kind):
        async def check(_request, feature):
            if checks is not None:
                checks.append((kind, feature))
        return check

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", recorder("write"))
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", recorder("read"))
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: service)

    from routers.load_balancing.load_balancing import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app, raise_server_exceptions=False)


def _post(test_client, item_name, operations):
    return test_client.post(
        "/vyos/load-balancing/batch",
        json={"item_name": item_name, "operations": operations},
    )


def _rp(key):
    return {
        "global-parameters": {
            "max-connections": "1000",
            "ssl-bind-ciphers": ["aes128-gcm-sha256", "aes256-gcm-sha384"],
            "tls-version-min": "1.2",
            "logging": {"facility": {"local0": {"level": "info"}}},
        },
        "vrf": "red",
        "backend": {"bk": {
            "description": "web",
            "balance": "round-robin",
            "mode": "http",
            "health-check": "ldap",
            "http-check": {"method": "get", "uri": "/", "expect": {"status": "200"}},
            "http-response-headers": {"X-A": {"value": "1"}},
            "logging": {"facility": {"local1": {"level": "err"}}},
            "ssl": {"ca-certificate": "ca1", "no-verify": {}},
            "timeout": {"check": "5", "connect": "6", "server": "7"},
            "server": {"s1": {"address": "192.0.2.10", "port": "80", "backup": {},
                              "check": {"port": "8080"} if key == "haproxy" else {},
                              "send-proxy": {}}},
            "rule": {"10": {"domain-name": "a.example", "ssl": "req-ssl-sni",
                            "url-path": {"begin": ["/a", "/b"]},
                            "set": {"server": "s1"}}},
        }},
        "service": {"svc": {
            "description": "front",
            "mode": "http",
            "port": "443",
            "listen-address": (
                {"192.0.2.1": {"accept-proxy": {}}} if key == "haproxy" else ["192.0.2.1", "192.0.2.2"]
            ),
            "backend": "bk",
            "redirect-http-to-https": {},
            "ssl": {"certificate": "cert1"},
            "http-response-headers": {"X-B": {"value": "2"}},
            "logging": {"facility": {"local2": {"level": "debug"}}},
            "tcp-request": {"inspect-delay": "100"},
            "rule": {"20": {"domain-name": ["b.example", "c.example"],
                            "set": {"backend": "bk", "redirect-location": "/x"},
                            **({"wildcard-domain": {}} if key == "haproxy" else {})}},
            **({"http-compression": {"algorithm": "gzip", "mime-type": "text/html"},
                "timeout": {"client": "30"}} if key == "haproxy" else {}),
        }},
        **({"timeout": {"check": "1", "client": "2", "connect": "3", "server": "4"}}
           if key == "haproxy" else {}),
    }


WAN = {
    "disable-source-nat": {},
    "enable-local-traffic": {},
    "flush-connections": {},
    "hook": "/config/hook.sh",
    "sticky-connections": {"inbound": {}},
    "interface-health": {"eth0": {
        "nexthop": "dhcp", "failure-count": "3", "success-count": "2",
        "test": {"10": {"type": "ping", "target": "192.0.2.1", "resp-time": "5",
                        "ttl-limit": "1", "test-script": "/t"}},
    }},
    "rule": {"10": {
        "description": "r10", "inbound-interface": "eth1", "exclude": {}, "failover": {},
        "per-packet-balancing": {}, "protocol": "tcp",
        "interface": {"eth0": {"weight": "2"}, "eth2": {}},
        "limit": {"burst": "5", "period": "second", "rate": "10", "threshold": "above"},
        "source": {"address": "192.0.2.0/24", "port": "80"},
        "destination": {"address": "198.51.100.0/24", "port": "443"},
    }},
}

TREE = {
    "1.4": {"load-balancing": {"reverse-proxy": _rp("reverse-proxy"), "wan": WAN}},
    "1.5": {"load-balancing": {"haproxy": _rp("haproxy"), "wan": {
        **WAN,
        "rule": {"10": {
            **WAN["rule"]["10"],
            "source": {"group": {"address-group": "SRC", "port-group": "SP"}},
            "destination": {"group": {"network-group": "DST", "domain-group": "DOM"}},
        }},
    }}},
}


@pytest.mark.parametrize("version", ["1.4", "1.5"])
@pytest.mark.parametrize("configured", [False, True], ids=["unconfigured", "full"])
def test_config_route_returns_every_parsed_field(monkeypatch, version, configured):
    from vyos_mappers import CommandMapperRegistry
    from vyos_mappers.load_balancing import LoadBalancingMapper

    tree = TREE[version] if configured else {}
    mapper = cast(LoadBalancingMapper, CommandMapperRegistry.get_mapper("load_balancing", version))
    resp = _app(monkeypatch, Service(version=version, config=tree)).get("/vyos/load-balancing/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == mapper.parse_config(tree)
    if configured:
        assert resp.json()["reverse_proxy"]["backends"][0]["http_response_headers"] == {"X-A": "1"}
        assert resp.json()["wan"]["rules"][0]["interfaces"] == [
            {"interface": "eth0", "weight": "2"},
            {"interface": "eth2", "weight": None},
        ]


def test_config_route_declares_the_response_model(monkeypatch):
    schema = _app(monkeypatch, Service()).get("/openapi.json").json()
    ok = schema["paths"]["/vyos/load-balancing/config"]["get"]["responses"]["200"]
    assert ok["content"]["application/json"]["schema"] == {"$ref": "#/components/schemas/LBConfig"}


def test_config_model_rejects_a_parse_shape_change():
    from pydantic import ValidationError

    from routers.load_balancing.load_balancing import LBConfig

    with pytest.raises(ValidationError):
        LBConfig.model_validate({"reverse_proxy": {}, "wan": {}})


@pytest.mark.parametrize(
    "method,path",
    [
        ("get", "/vyos/load-balancing/capabilities"),
        ("get", "/vyos/load-balancing/config"),
        ("post", "/vyos/load-balancing/batch"),
    ],
)
def test_session_400_passes_through(monkeypatch, method, path):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    test_client = _app(monkeypatch, Service())
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    kwargs = {"json": {"item_name": "", "operations": []}} if method == "post" else {}
    resp = getattr(test_client, method)(path, **kwargs)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "No active session"


def test_routes_check_the_load_balancing_permission(monkeypatch):
    from rbac_permissions import FeatureGroup

    checks = []
    test_client = _app(monkeypatch, Service(), checks)
    test_client.get("/vyos/load-balancing/capabilities")
    test_client.get("/vyos/load-balancing/config")
    _post(test_client, "", [{"op": "set_wan_hook", "value": "/h"}])
    assert checks == [
        ("read", FeatureGroup.LOAD_BALANCING),
        ("read", FeatureGroup.LOAD_BALANCING),
        ("write", FeatureGroup.LOAD_BALANCING),
    ]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_every_builder_op_takes_the_item_and_at_most_one_value(version):
    from vyos_builders.load_balancing import LoadBalancingBatchBuilder

    builder = LoadBalancingBatchBuilder(version)
    params = {
        name: list(inspect.signature(method).parameters)
        for name, method in inspect.getmembers(builder, inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    }
    assert params
    for name, names in params.items():
        assert 1 <= len(names) <= 2, name
        assert names[0] in ("name", "_name"), name


def test_batch_emits_item_and_value_ops(monkeypatch):
    service = Service(version="1.5")
    test_client = _app(monkeypatch, service)
    resp = _post(test_client, "bk", [
        {"op": "create_rp_backend"},
        {"op": "set_rp_backend_mode", "value": "http"},
        {"op": "create_rp_service", "item_name": "svc"},
        {"op": "set_wan_hook", "item_name": "", "value": "/h"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": None, "error": None}
    paths = [op["path"] for op in service.executed[0]]
    assert paths == [
        ["load-balancing", "haproxy", "backend", "bk"],
        ["load-balancing", "haproxy", "backend", "bk", "mode", "http"],
        ["load-balancing", "haproxy", "service", "svc"],
        ["load-balancing", "wan", "hook", "/h"],
    ]


@pytest.mark.parametrize("op", ["set_rp_backend_mode", "set_wan_hook"])
@pytest.mark.parametrize("value", [None, "", "   "])
def test_missing_value_is_400(monkeypatch, op, value):
    service = Service()
    resp = _post(_app(monkeypatch, service), "bk", [{"op": op, "value": value}])
    assert resp.status_code == 400
    assert resp.json()["detail"] == f"Operation {op} requires a value"
    assert service.executed == []


@pytest.mark.parametrize(
    "op,item",
    [("delete_rp_backend", "bk"), ("delete_rp_global_ssl_bind_ciphers", "")],
)
def test_value_on_an_item_only_op_is_400(monkeypatch, op, item):
    service = Service()
    resp = _post(_app(monkeypatch, service), item, [{"op": op, "value": "s1"}])
    assert resp.status_code == 400
    assert resp.json()["detail"] == f"Operation {op} takes no value"
    assert service.executed == []


@pytest.mark.parametrize("name", ["", "   "])
def test_blank_item_name_on_an_object_op_is_400(monkeypatch, name):
    service = Service()
    resp = _post(_app(monkeypatch, service), name, [{"op": "create_wan_rule"}])
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Operation create_wan_rule requires an item name"
    assert service.executed == []


def test_global_op_takes_a_blank_item_name(monkeypatch):
    service = Service()
    resp = _post(_app(monkeypatch, service), "", [{"op": "delete_wan_hook"}])
    assert resp.status_code == 200, resp.text
    assert [op["path"] for op in service.executed[0]] == [["load-balancing", "wan", "hook"]]


def test_unknown_op_is_400(monkeypatch):
    service = Service()
    resp = _post(_app(monkeypatch, service), "bk", [{"op": "nope"}])
    assert resp.status_code == 400
    assert service.executed == []


def test_mapper_gate_is_400_on_1_4(monkeypatch):
    service = Service(version="1.4")
    resp = _post(_app(monkeypatch, service), "svc", [
        {"op": "set_rp_service_mode", "value": "http"},
        {"op": "set_rp_service_http_compression_algorithm", "value": "gzip"},
    ])
    assert resp.status_code == 400
    assert "not supported on this device" in resp.json()["detail"]
    assert service.executed == []


def test_failed_commit_reports_the_error(monkeypatch):
    service = Service(status=400, error="Commit failed")
    resp = _post(_app(monkeypatch, service), "", [{"op": "set_wan_hook", "value": "/h"}])
    assert resp.status_code == 200
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}


def test_empty_batch_succeeds_without_the_device(monkeypatch):
    service = Service()
    resp = _post(_app(monkeypatch, service), "", [])
    assert resp.status_code == 200
    assert resp.json() == {"success": True, "data": None, "error": None}
    assert service.executed == []
