"""Firewall global-options routes driven through the handlers with a stub service.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests check the parsed config, the
emitted ops and the 400/500 paths of POST /batch, and that every route
passes a session lookup's HTTPException through.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

MODULE = "routers.firewall_global_options.firewall_global_options"
ROLLING = "2026.09.23-0027-rolling"
BASE = ["firewall", "global-options"]

FULL_TREE = {
    "firewall": {
        "global-options": {
            "all-ping": "enable",
            "broadcast-ping": "disable",
            "directed-broadcast": "disable",
            "ip-src-route": "disable",
            "ipv6-src-route": "disable",
            "receive-redirects": "disable",
            "ipv6-receive-redirects": "disable",
            "send-redirects": "enable",
            "log-martians": "enable",
            "source-validation": "strict",
            "ipv6-source-validation": "loose",
            "syn-cookies": "enable",
            "twa-hazards-protection": "enable",
            "resolver-cache": {},
            "resolver-interval": "60",
            "state-policy": {
                "established": {"action": "accept", "log": {}, "log-level": "info"},
                "invalid": {"action": "drop"},
                "related": {"log": {}},
                "offload": {"offload-target": "FT1"},
            },
            "apply-to-bridged-traffic": {
                "ipv4": {},
                "ipv6": {},
                "accept-invalid": {"ethernet-type": ["arp", "802.1q"]},
            },
            "geoip": {
                "provider": "maxmind",
                "maxmind-account-id": "123456",
                "maxmind-license-key": "SECRETKEY",
                "maxmind-lite": {},
                "source-address": "192.0.2.1",
                "vrf": "RED",
            },
            "timeout": {
                "icmp": "30",
                "other": "600",
                "tcp": {
                    "close": "10",
                    "close-wait": "60",
                    "established": "3600",
                    "fin-wait": "120",
                    "last-ack": "30",
                    "syn-recv": "60",
                    "syn-sent": "120",
                    "time-wait": "120",
                },
                "udp": {"other": "30", "stream": "180"},
            },
        }
    }
}


def global_options_client(monkeypatch, version, commit, full_config=None):
    """Return (client, executed); executed holds one [(op, path), ...] per commit."""
    executed = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return version

        def get_full_config(self, refresh=False):
            return full_config if full_config is not None else {}

        def execute_batch(self, batch):
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append([(item["op"], item["path"]) for item in batch.get_operations()])
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{MODULE}.require_read_permission", allow)
    monkeypatch.setattr(f"{MODULE}.require_write_permission", allow)
    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", lambda _req: Service())

    router = __import__(MODULE, fromlist=["router"]).router
    app = FastAPI()
    app.include_router(router)
    return TestClient(app, raise_server_exceptions=False), executed


@pytest.fixture
def commit():
    return {"status": 200, "error": None}


@pytest.fixture
def client(monkeypatch, commit):
    return global_options_client(monkeypatch, ROLLING, commit)


@pytest.fixture
def client_14(monkeypatch, commit):
    return global_options_client(monkeypatch, "1.4.3", commit)


def _batch(test_client, operations):
    return test_client.post("/vyos/firewall/global-options/batch", json={"operations": operations})


# ---------------------------------------------------------------- config


def test_config_parses_every_leaf_and_masks_the_license_key(monkeypatch, commit):
    test_client, _executed = global_options_client(monkeypatch, ROLLING, commit, full_config=FULL_TREE)
    resp = test_client.get("/vyos/firewall/global-options/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "configured": True,
        "all_ping": "enable",
        "broadcast_ping": "disable",
        "directed_broadcast": "disable",
        "ip_src_route": "disable",
        "ipv6_src_route": "disable",
        "receive_redirects": "disable",
        "ipv6_receive_redirects": "disable",
        "send_redirects": "enable",
        "log_martians": "enable",
        "source_validation": "strict",
        "ipv6_source_validation": "loose",
        "syn_cookies": "enable",
        "twa_hazards_protection": "enable",
        "resolver_cache": True,
        "resolver_interval": 60,
        "state_policy": {
            "established": {"action": "accept", "log": True, "log_level": "info"},
            "invalid": {"action": "drop", "log": False, "log_level": None},
            "related": {"action": None, "log": True, "log_level": None},
            "offload_target": "FT1",
        },
        "bridged_traffic": {"ipv4": True, "ipv6": True, "accept_invalid_ethernet_types": ["arp", "802.1q"]},
        "geoip": {
            "provider": "maxmind",
            "maxmind_account_id": "123456",
            "maxmind_license_key": "***",
            "maxmind_lite": True,
            "source_address": "192.0.2.1",
            "vrf": "RED",
        },
        "timeouts": {
            "icmp": 30,
            "other": 600,
            "tcp_close": 10,
            "tcp_close_wait": 60,
            "tcp_established": 3600,
            "tcp_fin_wait": 120,
            "tcp_last_ack": 30,
            "tcp_syn_recv": 60,
            "tcp_syn_sent": 120,
            "tcp_time_wait": 120,
            "udp_other": 30,
            "udp_stream": 180,
        },
    }
    assert "SECRETKEY" not in resp.text


def test_config_reads_a_single_ethernet_type_as_a_list(monkeypatch, commit):
    tree = {"firewall": {"global-options": {"apply-to-bridged-traffic": {"accept-invalid": {"ethernet-type": "arp"}}}}}
    test_client, _executed = global_options_client(monkeypatch, ROLLING, commit, full_config=tree)
    body = test_client.get("/vyos/firewall/global-options/config").json()
    assert body["bridged_traffic"]["accept_invalid_ethernet_types"] == ["arp"]


@pytest.mark.parametrize(
    "tree, configured",
    [
        ({}, False),
        ({"firewall": {"group": {}}}, False),
        ({"firewall": {"global-options": {}}}, True),
    ],
)
def test_unconfigured_and_bare_root_keep_the_same_shape(monkeypatch, commit, tree, configured):
    test_client, _executed = global_options_client(monkeypatch, ROLLING, commit, full_config=tree)
    body = test_client.get("/vyos/firewall/global-options/config").json()
    assert body["configured"] is configured
    assert body["all_ping"] is None
    assert body["resolver_cache"] is False
    assert body["state_policy"]["established"] == {"action": None, "log": False, "log_level": None}
    assert body["state_policy"]["offload_target"] is None
    assert body["bridged_traffic"] == {"ipv4": False, "ipv6": False, "accept_invalid_ethernet_types": []}
    assert body["geoip"]["maxmind_license_key"] is None
    assert body["geoip"]["maxmind_lite"] is False
    assert set(body["timeouts"].values()) == {None}


# ---------------------------------------------------------------- batch


def test_batch_runs_value_and_flag_ops_in_one_commit(client):
    test_client, executed = client
    resp = _batch(
        test_client,
        [
            {"op": "set_all_ping", "value": "disable"},
            {"op": "set_resolver_cache"},
            {"op": "set_geoip_maxmind_license_key", "value": "KEY,WITH,COMMAS"},
            {"op": "delete_apply_to_bridged_traffic_accept_invalid_ethernet_type", "value": "arp"},
            {"op": "set_timeout_tcp_close", "value": "10"},
            {"op": "delete_state_policy_offload"},
        ],
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "Firewall global options updated"},
        "error": None,
    }
    assert executed == [
        [
            ("set", BASE + ["all-ping", "disable"]),
            ("set", BASE + ["resolver-cache"]),
            ("set", BASE + ["geoip", "maxmind-license-key", "KEY,WITH,COMMAS"]),
            ("delete", BASE + ["apply-to-bridged-traffic", "accept-invalid", "ethernet-type", "arp"]),
            ("set", BASE + ["timeout", "tcp", "close", "10"]),
            ("delete", BASE + ["state-policy", "offload"]),
        ]
    ]


@pytest.mark.parametrize(
    "operation, detail",
    [
        ({"op": "set_all_ping"}, "Operation set_all_ping requires a value"),
        ({"op": "set_all_ping", "value": ""}, "Operation set_all_ping requires a value"),
        ({"op": "set_resolver_cache", "value": "x"}, "Operation set_resolver_cache takes no value"),
        ({"op": "delete_global_options", "value": "x"}, "Operation delete_global_options takes no value"),
    ],
)
def test_batch_400s_on_a_missing_or_extra_value(client, operation, detail):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "set_all_ping", "value": "enable"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert executed == []


@pytest.mark.parametrize("op", ["set_unknown", "_mapper", "get_capabilities"])
def test_batch_400s_on_an_op_that_is_not_a_builder_op(client, op):
    test_client, executed = client
    resp = _batch(test_client, [{"op": op}])
    assert resp.status_code == 400, resp.text
    assert executed == []


def test_batch_400s_on_a_1_5_only_op_on_1_4(client_14):
    test_client, executed = client_14
    resp = _batch(
        test_client,
        [{"op": "set_all_ping", "value": "enable"}, {"op": "set_timeout_icmp", "value": "30"}],
    )
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "firewall global-options timeout is not supported on this device"
    assert executed == []


def test_batch_reports_a_rejected_commit(client, commit):
    test_client, executed = client
    commit.update(status=400, error="Commit failed")
    resp = _batch(test_client, [{"op": "set_all_ping", "value": "enable"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}
    assert len(executed) == 1


def test_empty_batch_stays_500(client):
    test_client, executed = client
    resp = _batch(test_client, [])
    assert resp.status_code == 500, resp.text
    assert executed == []


def test_update_route_is_gone(client):
    test_client, _executed = client
    resp = test_client.post("/vyos/firewall/global-options/update", json={"all_ping": "enable"})
    assert resp.status_code in (404, 405)


# ---------------------------------------------------------------- capabilities and errors


@pytest.mark.parametrize("version, supported", [("1.4.3", False), ("1.5", True), (ROLLING, True)])
def test_capabilities_follow_the_device(monkeypatch, commit, version, supported):
    test_client, _executed = global_options_client(monkeypatch, version, commit)
    resp = test_client.get("/vyos/firewall/global-options/capabilities")
    assert resp.status_code == 200, resp.text
    features = resp.json()["features"]
    for flag in ("bridged_traffic", "geoip", "state_policy_offload", "timeouts"):
        assert features[flag]["supported"] is supported
    assert "version_notes" not in resp.json()


@pytest.mark.parametrize(
    "method, path, body",
    [
        ("get", "/vyos/firewall/global-options/capabilities", None),
        ("get", "/vyos/firewall/global-options/config", None),
        ("post", "/vyos/firewall/global-options/batch", {"operations": [{"op": "set_resolver_cache"}]}),
    ],
)
def test_every_route_passes_a_session_http_error_through(monkeypatch, commit, method, path, body):
    test_client, _executed = global_options_client(monkeypatch, ROLLING, commit)

    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", no_session)
    resp = test_client.request(method, path, json=body)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
