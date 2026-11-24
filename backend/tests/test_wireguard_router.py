"""WireGuard routes: batch args bound by name with HTTP 400s, the typed config
read-model, and the op-mode key/status routes running off the event loop with
mapper paths, a 400 for a bad interface name and 502/504 for device failures.

Op-mode text below was captured from the labs (VyOS 1.4.3 at 100.64.64.4 and
2026.09 rolling at 100.64.64.5) with a throwaway ``wg97`` interface.
"""

import inspect
import threading
from types import SimpleNamespace

import pytest
import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient

from vyos_builders.wireguard import WireGuardBatchBuilder
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.wireguard import WireGuardMapper

ROUTER = "routers.wireguard.wireguard"
WG = ["interfaces", "wireguard"]

KEY_A = "MhOQQw6DYRPAgoQ3m1vCq27EsyXi1/m0W/rfa9jAYEU="
KEY_B = "QpTGilLkaoTJHqMzRCP5sY/k5hUD1rhsOTlLZN+fjTc="

SUMMARY_14 = f"""interface: wg97
  public key: {KEY_A}
  private key: ***
  listening port: 51997

peer: {KEY_B}
  endpoint: 192.0.2.10:51998
  allowed ips: 10.254.97.2/32
  latest handshake: 1 minute, 32 seconds ago
  transfer: 1.20 KiB received, 3.40 KiB sent

"""

SUMMARY_15 = f"""interface: wg97
  address: 10.254.97.1/30
  public key: {KEY_A}
  private key: ***
  listening port: 51997

  peer: T1
    public key: {KEY_B}
    endpoint: 192.0.2.10:51998
    allowed ips: 10.254.97.2/32
    latest handshake: 0:00:48
    transfer: 1.20 KiB received, 3.40 KiB sent



"""

KEYPAIR_TEXT = f"Private key: {KEY_A}\nPublic key: {KEY_B}\n\n"
PSK_TEXT = f"Pre-shared key: {KEY_A}\n\n"


def _reply(result="", status=200, error=None):
    return SimpleNamespace(status=status, error=error, result=result)


class Device:
    def __init__(self):
        self.calls = []
        self.threads = []
        self.reply = _reply()
        self.raises = None

    def _run(self, kind, path):
        self.calls.append((kind, path))
        self.threads.append(threading.current_thread())
        if self.raises is not None:
            raise self.raises
        return self.reply

    def show(self, path=None):
        return self._run("show", path)

    def generate(self, path=None):
        return self._run("generate", path)


class Service:
    def __init__(self, version="1.5"):
        self.version = version
        self.status = 200
        self.error = None
        self.executed = []
        self.full_config = {}
        self.device = Device()

    def get_version(self):
        return self.version

    def get_full_config(self, refresh=False):
        return self.full_config

    def execute_batch(self, batch):
        if batch.is_empty():
            raise ValueError("Cannot execute empty batch")
        self.executed.append(batch.get_operations())
        return SimpleNamespace(status=self.status, result="", error=self.error)


async def _allow(*_args, **_kwargs):
    return None


def _app(monkeypatch, get_service):
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", _allow)
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", _allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", get_service)

    from routers.wireguard.wireguard import router

    app = FastAPI()
    app.state.loop_threads = []

    @app.middleware("http")
    async def record_loop_thread(request: Request, call_next):
        request.app.state.loop_threads.append(threading.current_thread())
        return await call_next(request)

    app.include_router(router)
    return app


@pytest.fixture
def commit():
    return {"status": 200, "error": None, "version": "1.5"}


@pytest.fixture
def client(monkeypatch, commit):
    service = Service()

    def get_service(_req):
        service.status = commit["status"]
        service.error = commit["error"]
        service.version = commit["version"]
        return service

    app = _app(monkeypatch, get_service)
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client, service, app


def _iface_batch(test_client, operations, peers=None):
    body = {"interface": "wg0", "operations": operations}
    if peers is not None:
        body["peers"] = peers
    return test_client.post("/vyos/vpn/wireguard/interface/batch", json=body)


def _peer_batch(test_client, operations):
    return test_client.post(
        "/vyos/vpn/wireguard/peer/batch",
        json={"interface": "wg0", "peer": "phone", "operations": operations},
    )


# ========================================================================
# Batch
# ========================================================================


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_every_op_binds_interface_then_peer_then_one_value(version):
    """The handlers bind ``interface``, then ``peer``, then at most one value."""
    builder = WireGuardBatchBuilder(version=version)
    ops = [
        (name, member)
        for name, member in inspect.getmembers(builder, inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    ]
    assert ops
    for name, method in ops:
        params = list(inspect.signature(method).parameters)
        assert params[0] == "interface", name
        rest = params[2:] if params[1:2] == ["peer"] else params[1:]
        assert len(rest) <= 1, name
        assert "peer" not in rest, name


def test_interface_batch_binds_interface_and_peer_groups(client):
    test_client, service, _app_ = client
    resp = _iface_batch(
        test_client,
        [
            {"op": "create_interface"},
            {"op": "set_interface_address", "value": "10.0.0.1/24"},
            {"op": "set_interface_description", "value": "a|b"},
        ],
        peers=[{"peer": "phone", "operations": [
            {"op": "create_peer"},
            {"op": "set_peer_public_key", "value": KEY_B},
        ]}],
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "Interface configuration updated"},
        "error": None,
    }
    assert service.executed == [[
        {"op": "set", "path": WG + ["wg0"]},
        {"op": "set", "path": WG + ["wg0", "address", "10.0.0.1/24"]},
        {"op": "set", "path": WG + ["wg0", "description", "a|b"]},
        {"op": "set", "path": WG + ["wg0", "peer", "phone"]},
        {"op": "set", "path": WG + ["wg0", "peer", "phone", "public-key", KEY_B]},
    ]]


def test_peer_batch_binds_interface_and_peer(client):
    test_client, service, _app_ = client
    resp = _peer_batch(test_client, [
        {"op": "set_peer_allowed_ips", "value": "10.0.0.2/32"},
        {"op": "delete_peer_port"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"] == {"message": "Peer configuration updated"}
    assert service.executed == [[
        {"op": "set", "path": WG + ["wg0", "peer", "phone", "allowed-ips", "10.0.0.2/32"]},
        {"op": "delete", "path": WG + ["wg0", "peer", "phone", "port"]},
    ]]


@pytest.mark.parametrize("send,operation,detail", [
    ("iface", {"op": "set_interface_mtu"}, "Operation set_interface_mtu requires a value"),
    ("iface", {"op": "set_interface_mtu", "value": ""}, "Operation set_interface_mtu requires a value"),
    ("iface", {"op": "set_interface_mtu", "value": "  "}, "Operation set_interface_mtu requires a value"),
    ("iface", {"op": "set_interface_disable", "value": "x"}, "Operation set_interface_disable takes no value"),
    ("iface", {"op": "delete_peer", "value": "phone"}, "Operation delete_peer requires peer"),
    ("peer", {"op": "set_peer_port"}, "Operation set_peer_port requires a value"),
    ("peer", {"op": "delete_peer", "value": "x"}, "Operation delete_peer takes no value"),
    ("peer", {"op": "delete_interface"}, "Operation delete_interface takes no peer"),
    ("peer", {"op": "no_such_op"}, "Unknown operation: no_such_op"),
    ("peer", {"op": "get_capabilities"}, "Invalid operation: get_capabilities"),
    ("iface", {"op": "_mapper"}, "Invalid operation: _mapper"),
])
def test_bad_operation_is_400(client, send, operation, detail):
    test_client, service, _app_ = client
    post = _iface_batch if send == "iface" else _peer_batch
    resp = post(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert service.executed == []


def test_bad_peer_group_operation_is_400(client):
    test_client, service, _app_ = client
    resp = _iface_batch(
        test_client,
        [{"op": "create_interface"}],
        peers=[{"peer": "phone", "operations": [{"op": "delete_interface"}]}],
    )
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation delete_interface takes no peer"
    assert service.executed == []


def test_unsupported_leaf_is_400(client, commit):
    """1.4 has no peer host-name; the mapper's ValueError is a client 400."""
    test_client, service, _app_ = client
    commit.update(version="1.4.3")
    resp = _peer_batch(test_client, [{"op": "set_peer_host_name", "value": "vpn.example.com"}])
    assert resp.status_code == 400, resp.text
    assert "not supported on this device" in resp.json()["detail"]
    assert service.executed == []


@pytest.mark.parametrize("send", ["iface", "peer"])
def test_empty_batch_stays_500(client, send):
    """execute_batch raises ValueError for an empty batch; that stays a 500."""
    test_client, service, _app_ = client
    post = _iface_batch if send == "iface" else _peer_batch
    resp = post(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"


@pytest.mark.parametrize("send", ["iface", "peer"])
def test_failed_commit_returns_success_false(client, commit, send):
    test_client, _service, _app_ = client
    commit.update(status=400, error="Commit failed")
    if send == "iface":
        resp = _iface_batch(test_client, [{"op": "create_interface"}])
    else:
        resp = _peer_batch(test_client, [{"op": "create_peer"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}


# ========================================================================
# Config
# ========================================================================

FULL_TREE = {
    "interfaces": {
        "wireguard": {
            "wg0": {
                "address": ["10.0.0.1/24", "fd00::1/64"],
                "description": "office",
                "port": "51820",
                "private-key": KEY_A,
                "mtu": "1420",
                "fwmark": "7",
                "per-client-thread": {},
                "disable": {},
                "ip": {"adjust-mss": "clamp-mss-to-pmtu"},
                "peer": {
                    "phone": {
                        "public-key": KEY_B,
                        "preshared-key": KEY_A,
                        "allowed-ips": "10.0.0.2/32",
                        "address": "192.0.2.10",
                        "port": "51998",
                        "persistent-keepalive": "25",
                        "description": "mobile",
                        "disable": {},
                        "host-name": "vpn.example.com",
                    },
                },
            },
            "wg1": {"address": "10.1.0.1/24"},
        },
    },
}


def test_config_returns_every_leaf_with_secrets_masked(client):
    test_client, service, _app_ = client
    service.full_config = FULL_TREE
    resp = test_client.get("/vyos/vpn/wireguard/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "interfaces": [
            {
                "name": "wg0",
                "description": "office",
                "addresses": ["10.0.0.1/24", "fd00::1/64"],
                "port": "51820",
                "private_key": "***",
                "mtu": "1420",
                "fwmark": "7",
                "per_client_thread": True,
                "disabled": True,
                "mss_clamping": "clamp-mss-to-pmtu",
                "peers": [{
                    "name": "phone",
                    "public_key": KEY_B,
                    "preshared_key": "***",
                    "allowed_ips": ["10.0.0.2/32"],
                    "address": "192.0.2.10",
                    "port": "51998",
                    "persistent_keepalive": "25",
                    "description": "mobile",
                    "disabled": True,
                    "host_name": "vpn.example.com",
                }],
                "peer_count": 1,
            },
            {
                "name": "wg1",
                "description": None,
                "addresses": ["10.1.0.1/24"],
                "port": None,
                "private_key": None,
                "mtu": None,
                "fwmark": None,
                "per_client_thread": False,
                "disabled": False,
                "mss_clamping": None,
                "peers": [],
                "peer_count": 0,
            },
        ],
        "total": 2,
    }
    assert KEY_A not in resp.text


@pytest.mark.parametrize("tree", [{}, {"interfaces": {}}, {"interfaces": {"wireguard": {}}}])
def test_config_without_wireguard_is_empty(client, tree):
    test_client, service, _app_ = client
    service.full_config = tree
    resp = test_client.get("/vyos/vpn/wireguard/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"interfaces": [], "total": 0}


def test_mapper_parse_config_is_the_read_model():
    assert WireGuardMapper("1.5").parse_config(FULL_TREE)["total"] == 2


# ========================================================================
# Op-mode routes
# ========================================================================


@pytest.mark.parametrize("version", ["1.4", "1.4.3", "1.5", "2026.09.23-0027-rolling"])
def test_op_mode_paths(version):
    """Both labs: generate pki wireguard key-pair|preshared-key and
    show interfaces wireguard <if> summary."""
    mapper = CommandMapperRegistry.get_mapper("wireguard", version)
    assert isinstance(mapper, WireGuardMapper)
    assert mapper.get_keypair_generate_path() == ["pki", "wireguard", "key-pair"]
    assert mapper.get_preshared_key_generate_path() == ["pki", "wireguard", "preshared-key"]
    assert mapper.get_interface_summary_show_path("wg97") == WG + ["wg97", "summary"]


def test_op_routes_read_the_registered_mapper(client, monkeypatch):
    """A path handwritten in the router would ignore this subclass."""
    test_client, service, _app_ = client

    class Tagged(WireGuardMapper):
        def get_keypair_generate_path(self):
            return ["tagged", "key-pair"]

        def get_preshared_key_generate_path(self):
            return ["tagged", "psk"]

        def get_interface_summary_show_path(self, interface):
            return ["tagged", interface]

    monkeypatch.setitem(CommandMapperRegistry._features, "wireguard", Tagged)
    service.device.reply = _reply(KEYPAIR_TEXT)
    test_client.post("/vyos/vpn/wireguard/generate-keypair")
    service.device.reply = _reply(PSK_TEXT)
    test_client.post("/vyos/vpn/wireguard/generate-psk")
    service.device.reply = _reply(SUMMARY_14)
    test_client.get("/vyos/vpn/wireguard/interface/wg97/status")
    test_client.get("/vyos/vpn/wireguard/interface/wg97/public-key")
    assert service.device.calls == [
        ("generate", ["tagged", "key-pair"]),
        ("generate", ["tagged", "psk"]),
        ("show", ["tagged", "wg97"]),
        ("show", ["tagged", "wg97"]),
    ]


def test_generate_keypair(client):
    test_client, service, _app_ = client
    service.device.reply = _reply(KEYPAIR_TEXT)
    resp = test_client.post("/vyos/vpn/wireguard/generate-keypair")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"private_key": KEY_A, "public_key": KEY_B, "raw_output": KEYPAIR_TEXT},
        "error": None,
    }
    assert service.device.calls == [("generate", ["pki", "wireguard", "key-pair"])]


def test_generate_psk_returns_only_the_key(client):
    """The device prints ``Pre-shared key: <key>``; the label is not part of the key."""
    test_client, service, _app_ = client
    service.device.reply = _reply(PSK_TEXT)
    resp = test_client.post("/vyos/vpn/wireguard/generate-psk")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"preshared_key": KEY_A}, "error": None}
    assert service.device.calls == [("generate", ["pki", "wireguard", "preshared-key"])]


def test_generate_psk_without_a_key_is_502(client):
    test_client, service, _app_ = client
    service.device.reply = _reply("something else\n")
    resp = test_client.post("/vyos/vpn/wireguard/generate-psk")
    assert resp.status_code == 502, resp.text
    assert resp.json()["detail"] == "VyOS returned no preshared key"


@pytest.mark.parametrize("text,handshake,seconds", [
    (SUMMARY_14, "1 minute, 32 seconds ago", 92),
    (SUMMARY_15, "0:00:48", 48),
])
def test_status_parses_both_lab_formats(client, text, handshake, seconds):
    test_client, service, _app_ = client
    service.device.reply = _reply(text)
    resp = test_client.get("/vyos/vpn/wireguard/interface/wg97/status")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["interface"] == "wg97"
    assert body["data"]["peers"] == {
        KEY_B: {
            "public_key": KEY_B,
            "latest_handshake": handshake,
            "latest_handshake_seconds": seconds,
            "transfer_rx": "1.20 KiB",
            "transfer_tx": "3.40 KiB",
            "endpoint": "192.0.2.10:51998",
        },
    }
    assert service.device.calls == [("show", WG + ["wg97", "summary"])]


@pytest.mark.parametrize("text", [SUMMARY_14, SUMMARY_15])
def test_public_key_is_the_interface_key_not_a_peer_key(client, text):
    test_client, service, _app_ = client
    service.device.reply = _reply(text)
    resp = test_client.get("/vyos/vpn/wireguard/interface/wg97/public-key")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"interface": "wg97", "public_key": KEY_A},
        "error": None,
    }


@pytest.mark.parametrize("text", [
    "Unable to access interface: No such device\n",
    "WireGuard interface wg97 is not configured!\n",
])
def test_public_key_of_an_unconfigured_interface(client, text):
    """Both labs answer HTTP 200 with this text for an absent interface."""
    test_client, service, _app_ = client
    service.device.reply = _reply(text)
    resp = test_client.get("/vyos/vpn/wireguard/interface/wg97/public-key")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": False,
        "data": {"raw_output": text},
        "error": "Could not extract public key from interface summary",
    }


OP_ROUTES = [
    ("post", "/vyos/vpn/wireguard/generate-keypair", "VyOS could not generate a keypair"),
    ("post", "/vyos/vpn/wireguard/generate-psk", "VyOS could not generate a preshared key"),
    ("get", "/vyos/vpn/wireguard/interface/wg97/status", "VyOS could not read interface wg97 status"),
    ("get", "/vyos/vpn/wireguard/interface/wg97/public-key", "VyOS could not read interface wg97 summary"),
]


@pytest.mark.parametrize("method,path,detail", OP_ROUTES)
@pytest.mark.parametrize("status,error", [(400, "Not authorized"), (200, "Invalid command"), (500, None)])
def test_failed_op_reply_is_502(client, method, path, detail, status, error):
    test_client, service, _app_ = client
    service.device.reply = _reply("", status=status, error=error)
    resp = getattr(test_client, method)(path)
    assert resp.status_code == 502, resp.text
    assert resp.json()["detail"] == detail


@pytest.mark.parametrize("method,path,detail", OP_ROUTES)
def test_unreachable_device_is_502(client, method, path, detail):
    test_client, service, _app_ = client
    service.device.raises = requests.exceptions.ConnectionError("refused")
    resp = getattr(test_client, method)(path)
    assert resp.status_code == 502, resp.text
    assert resp.json()["detail"] == detail


@pytest.mark.parametrize("method,path,_detail", OP_ROUTES)
def test_device_timeout_is_504(client, method, path, _detail):
    test_client, service, _app_ = client
    service.device.raises = requests.exceptions.Timeout("slow")
    resp = getattr(test_client, method)(path)
    assert resp.status_code == 504, resp.text
    assert "timed out" in resp.json()["detail"]


@pytest.mark.parametrize("suffix", ["status", "public-key"])
@pytest.mark.parametrize("name", ["eth0", "wg", "wg0x", "wg٣", "wg0 summary"])
def test_bad_interface_name_is_400(client, suffix, name):
    test_client, service, _app_ = client
    resp = test_client.get(f"/vyos/vpn/wireguard/interface/{name}/{suffix}")
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "WireGuard interface must be named wgN"
    assert service.device.calls == []


@pytest.mark.parametrize("method,path,_detail", OP_ROUTES)
def test_device_call_runs_off_the_event_loop(client, method, path, _detail):
    test_client, service, app = client
    service.device.reply = _reply(PSK_TEXT if "psk" in path else KEYPAIR_TEXT if "keypair" in path else SUMMARY_14)
    resp = getattr(test_client, method)(path)
    assert resp.status_code == 200, resp.text
    assert len(service.device.threads) == 1
    assert app.state.loop_threads
    assert service.device.threads[0] not in app.state.loop_threads


# ========================================================================
# Every route
# ========================================================================

ALL_ROUTES = [
    ("get", "/vyos/vpn/wireguard/capabilities", "read"),
    ("get", "/vyos/vpn/wireguard/config", "read"),
    ("post", "/vyos/vpn/wireguard/interface/batch", "write"),
    ("post", "/vyos/vpn/wireguard/peer/batch", "write"),
    ("post", "/vyos/vpn/wireguard/generate-keypair", "write"),
    ("post", "/vyos/vpn/wireguard/generate-psk", "write"),
    ("get", "/vyos/vpn/wireguard/interface/wg0/status", "read"),
    ("get", "/vyos/vpn/wireguard/interface/wg0/public-key", "read"),
]

BODIES = {
    "/vyos/vpn/wireguard/interface/batch": {"interface": "wg0", "operations": [{"op": "create_interface"}]},
    "/vyos/vpn/wireguard/peer/batch": {"interface": "wg0", "peer": "p", "operations": [{"op": "create_peer"}]},
}


@pytest.mark.parametrize("method,path,_kind", ALL_ROUTES)
def test_session_lookup_400_survives_every_route(monkeypatch, method, path, _kind):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    test_client = TestClient(_app(monkeypatch, no_session), raise_server_exceptions=False)
    kwargs = {"json": BODIES[path]} if path in BODIES else {}
    resp = getattr(test_client, method)(path, **kwargs)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"


@pytest.mark.parametrize("method,path,kind", ALL_ROUTES)
def test_routes_check_the_wireguard_permission(monkeypatch, method, path, kind):
    from rbac_permissions import FeatureGroup

    seen = []

    def recorder(name):
        async def check(_request, feature):
            seen.append((name, feature))
            raise HTTPException(status_code=403, detail="Forbidden")
        return check

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", recorder("read"))
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", recorder("write"))

    from routers.wireguard.wireguard import router

    app = FastAPI()
    app.include_router(router)
    kwargs = {"json": BODIES[path]} if path in BODIES else {}
    resp = getattr(TestClient(app), method)(path, **kwargs)
    assert resp.status_code == 403, resp.text
    assert seen == [(kind, FeatureGroup.WIREGUARD)]
