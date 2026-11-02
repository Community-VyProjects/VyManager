"""BGP GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.bgp.bgp_versions import get_bgp_mapper


def _tree():
    return {
        "protocols": {
            "bgp": {
                "system-as": "65001",
                "timers": {"keepalive": "3", "holdtime": "9"},
                "parameters": {
                    "router-id": "1.1.1.1",
                    "bestpath": {
                        "as-path": {"multipath-relax": {}},
                        "compare-routerid": {},
                    },
                    "log-neighbor-changes": {},
                    "default": {"local-pref": "200"},
                    "distance": {
                        "global": {"external": "20", "internal": "200", "local": "200"}
                    },
                },
                "neighbor": {
                    "192.0.2.1": {
                        "remote-as": "65002",
                        "port": "not-a-number",
                        "local-as": {"65001": {"no-prepend": {"replace-as": {}}}},
                        "bfd": {"profile": "fast"},
                        "address-family": {
                            "ipv4-unicast": {
                                "route-map": {"export": "OUT", "import": "IN"},
                                "maximum-prefix": "1000",
                                "nexthop-self": {"force": {}},
                            }
                        },
                        "timers": {"keepalive": "5"},
                        "ttl-security": {"hops": "2"},
                    }
                },
                "peer-group": {"PG": {"remote-as": "65003", "shutdown": {}}},
                "address-family": {
                    "ipv4-unicast": {
                        "network": {"192.0.2.0/24": {"route-map": "NET", "backdoor": {}}},
                        "aggregate-address": {
                            "10.0.0.0/8": {"summary-only": {}, "as-set": {}}
                        },
                        "redistribute": {
                            "static": {"metric": "10"},
                            "table": {"100": {"route-map": "T"}},
                        },
                        "maximum-paths": {"ebgp": "4", "ibgp": "8"},
                    },
                    "l2vpn-evpn": {"advertise-all-vni": {}, "rd": "1:1"},
                },
                "listen": {
                    "limit": "10",
                    "range": {"192.0.2.0/24": {"peer-group": "PG"}},
                },
                "srv6": {"locator": "LOC1"},
                "sid": {"vpn": {"per-vrf": {"export": "100"}}},
            }
        }
    }


def test_empty_tree():
    assert get_bgp_mapper("1.5").parse_config({}) == {}
    assert get_bgp_mapper("1.4").parse_config({"protocols": {}}) == {}


def test_parse_nested_bgp_config():
    parsed_15 = get_bgp_mapper("1.5").parse_config(_tree())
    parsed_14 = get_bgp_mapper("1.4").parse_config(_tree())
    assert parsed_14 == parsed_15
    parsed = parsed_15
    assert parsed["system_as"] == "65001"
    assert parsed["timers"]["keepalive"] == 3
    assert parsed["parameters"]["default_local_pref"] == 200
    assert parsed["parameters"]["bestpath"]["as_path_multipath_relax"] is True
    assert parsed["parameters"]["log_neighbor_changes"] is True
    assert parsed["parameters"]["distance_global"]["external"] == 20
    neighbor = parsed["neighbors"][0]
    assert neighbor["address"] == "192.0.2.1"
    assert neighbor["port"] is None
    assert neighbor["local_as"]["asn"] == "65001"
    assert neighbor["local_as"]["no_prepend_replace_as"] is True
    assert neighbor["bfd"]["profile"] == "fast"
    assert neighbor["ttl_security_hops"] == 2
    af = neighbor["address_families"]["ipv4-unicast"]
    assert af["maximum_prefix"] == 1000
    assert af["nexthop_self_force"] is True
    assert af["route_map_export"] == "OUT"
    assert parsed["peer_groups"][0]["name"] == "PG"
    assert parsed["peer_groups"][0]["shutdown"] is True
    by_afi = {item["afi"]: item for item in parsed["address_families"]}
    assert by_afi["ipv4-unicast"]["networks"][0]["prefix"] == "192.0.2.0/24"
    assert by_afi["ipv4-unicast"]["networks"][0]["backdoor"] is True
    assert by_afi["ipv4-unicast"]["maximum_paths_ebgp"] == 4
    tables = [
        item
        for item in by_afi["ipv4-unicast"]["redistribute"]
        if item["protocol"] == "table"
    ]
    assert tables[0]["table"] == "100"
    assert "advertise-all-vni" in by_afi["l2vpn-evpn"]["evpn_flags"]
    assert parsed["listen"]["limit"] == 10
    assert parsed["listen"]["ranges"][0]["peer_group"] == "PG"
    assert parsed["srv6_locator"] == "LOC1"
    assert parsed["sid_vpn_per_vrf_export"] == "100"



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_bgp_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.bgp.bgp.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.bgp.bgp.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.bgp.bgp import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/bgp/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["system_as"] == expected["system_as"]
    assert body["neighbors"][0]["local_as"]["asn"] == "65001"
    assert body["srv6_locator"] == "LOC1"
    assert body["sid_vpn_per_vrf_export"] == "100"
