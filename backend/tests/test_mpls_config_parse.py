"""MPLS GET /config parse lives on the mapper."""

from pathlib import Path

from vyos_mappers.mpls.mpls_versions import get_mpls_mapper


def _tree():
    return {
        "protocols": {
            "mpls": {
                "interface": {"eth1": {}, "eth0": {}},
                "parameters": {
                    "maximum-ttl": "32",
                    "no-propagate-ttl": {},
                },
                "ldp": {
                    "router-id": "1.1.1.1",
                    "interface": {
                        "eth2": {"disable-establish-hello": {}},
                        "eth0": None,
                    },
                    "neighbor": {
                        "10.0.0.2": {
                            "password": "secret",
                            "session-holdtime": "30",
                            "ttl-security": 2,
                        }
                    },
                    "discovery": {
                        "hello-ipv4-holdtime": "15",
                        "hello-ipv6-holdtime": "bad",
                        "transport-ipv4-address": "1.1.1.1",
                    },
                    "allocation": {
                        "ipv4": {"access-list": "ACL4"},
                        "ipv6": {"access-list6": "ACL6"},
                    },
                    "export": {
                        "ipv4": {
                            "explicit-null": {},
                            "export-filter": {
                                "filter-access-list": "F4",
                                "neighbor-access-list": "N4",
                            },
                        },
                        "ipv6": {
                            "export-filter": {"filter-access-list6": "F6"},
                        },
                    },
                    "import": {
                        "ipv4": {
                            "import-filter": {
                                "filter-access-list": "IF4",
                                "neighbor-access-list": "IN4",
                            }
                        }
                    },
                    "targeted-neighbor": {
                        "ipv4": {
                            "enable": {},
                            "address": {"10.1.1.1": {}, "10.0.0.1": {}},
                            "hello-holdtime": "40",
                        },
                        "ipv6": {"address": "2001:db8::1"},
                    },
                    "parameters": {
                        "cisco-interop-tlv": {},
                        "ordered-control": {},
                        "transport-prefer-ipv4": {},
                    },
                },
            }
        }
    }


def test_empty_protocols_mpls_is_disabled():
    parsed = get_mpls_mapper("1.5").parse_config({"protocols": {"mpls": {}}})
    assert parsed["enabled"] is False
    assert parsed["interfaces"] == []
    assert parsed["ldp"] is None
    assert get_mpls_mapper("1.4").parse_config({})["enabled"] is False


def test_present_mpls_node_parses_interfaces_parameters_and_ldp():
    parsed = get_mpls_mapper("1.5").parse_config(_tree())
    assert parsed["enabled"] is True
    assert parsed["interfaces"] == ["eth0", "eth1"]
    assert parsed["parameters"]["maximum_ttl"] == 32
    assert parsed["parameters"]["no_propagate_ttl"] is True
    ldp = parsed["ldp"]
    assert ldp["router_id"] == "1.1.1.1"
    assert [iface["name"] for iface in ldp["interfaces"]] == ["eth0", "eth2"]
    assert ldp["interfaces"][1]["disable_establish_hello"] is True
    assert ldp["neighbors"][0]["session_holdtime"] == 30
    assert ldp["neighbors"][0]["ttl_security"] == "2"
    assert ldp["discovery"]["hello_ipv4_holdtime"] == 15
    assert ldp["discovery"]["hello_ipv6_holdtime"] is None
    assert ldp["allocation"]["ipv4_access_list"] == "ACL4"
    assert ldp["allocation"]["ipv6_access_list"] == "ACL6"
    assert ldp["export"]["ipv4_explicit_null"] is True
    assert ldp["export"]["ipv4_export_filter"]["filter_access_list"] == "F4"
    assert ldp["export"]["ipv6_export_filter"]["filter_access_list"] == "F6"
    assert ldp["ldp_import"]["ipv4_import_filter"]["neighbor_access_list"] == "IN4"
    assert ldp["targeted_neighbor_ipv4"]["enable"] is True
    assert ldp["targeted_neighbor_ipv4"]["addresses"] == ["10.0.0.1", "10.1.1.1"]
    assert ldp["targeted_neighbor_ipv4"]["hello_holdtime"] == 40
    assert ldp["targeted_neighbor_ipv6"]["addresses"] == ["2001:db8::1"]
    assert ldp["parameters"]["cisco_interop_tlv"] is True
    assert ldp["parameters"]["transport_prefer_ipv4"] is True


def test_mpls_router_has_no_parse_helpers():
    text = Path(__file__).resolve().parents[1].joinpath("routers/mpls/mpls.py").read_text()
    assert "def _parse_" not in text


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_mpls_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.mpls.mpls.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.mpls.mpls.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.mpls.mpls import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/mpls/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["enabled"] is True
    assert body["interfaces"] == expected["interfaces"]
    assert body["parameters"]["maximum_ttl"] == 32
    assert body["ldp"]["router_id"] == "1.1.1.1"
    assert body["ldp"]["neighbors"][0]["ttl_security"] == "2"
