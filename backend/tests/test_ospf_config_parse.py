"""OSPF GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.ospf.ospf_versions import get_ospf_mapper


def _tree():
    return {
        "protocols": {
            "ospf": {
                "parameters": {"router-id": "1.1.1.1", "opaque-lsa": {}},
                "area": {
                    "0": {
                        "area-type": {"nssa": {"no-summary": {}, "default-cost": "20"}},
                        "network": {"10.0.0.0/24": {}},
                        "range": {"10.0.0.0/16": {"cost": "10", "not-advertise": {}}},
                        "virtual-link": {
                            "192.0.2.1": {"retransmit-window": "8", "hello-interval": "5"}
                        },
                        "authentication": "md5",
                    }
                },
                "interface": {
                    "eth0": {
                        "area": "1",
                        "cost": "10",
                        "ldp-sync": {"disable": {}, "holddown": "5"},
                        "retransmit-window": "5",
                        "authentication": {
                            "md5": {"key-id": {"1": {"md5-key": "secret"}}},
                            "plaintext-password": "pw",
                        },
                        "passive": {"disable": {}},
                    },
                    "eth1": {"area": "0"},
                },
                "redistribute": {
                    "connected": {"metric": "10", "metric-type": "2", "route-map": "RM"},
                    "table": {"100": {"metric": "5", "route-map": "T"}},
                },
                "default-information": {
                    "originate": {
                        "always": {},
                        "metric": "20",
                        "metric-type": "2",
                        "route-map": "DEF",
                    }
                },
                "distance": {
                    "global": "110",
                    "ospf": {"external": "120", "inter-area": "110", "intra-area": "100"},
                },
                "timers": {
                    "throttle": {
                        "spf": {
                            "delay": "200",
                            "initial-holdtime": "400",
                            "max-holdtime": "10000",
                        }
                    }
                },
                "max-metric": {"router-lsa": {"administrative": {}, "on-startup": "60"}},
                "graceful-restart": {
                    "grace-period": "120",
                    "helper": {
                        "enable": {"router-id": ["192.0.2.1", "192.0.2.2"]},
                        "planned-only": {},
                    },
                },
                "neighbor": {"192.0.2.9": {"poll-interval": "30", "priority": "1"}},
                "mpls-te": {"enable": {}, "router-address": "192.0.2.1"},
                "summary-address": {"10.1.0.0/16": {"no-advertise": {}, "tag": "7"}},
                "segment-routing": {
                    "global-block": {
                        "low-label-value": "16000",
                        "high-label-value": "23999",
                    },
                    "maximum-label-depth": "3",
                },
                "auto-cost": {"reference-bandwidth": "100000"},
                "log-adjacency-changes": {"detail": {}},
                "passive-interface": {"default": {}},
                "maximum-paths": "4",
                "ldp-sync": {"holddown": "15"},
                "refresh": {"timers": "10"},
                "aggregation": {"timer": "5"},
                "capability": {"opaque": {}},
            }
        }
    }


def test_empty_tree_leaves_absent_flags_unset():
    assert get_ospf_mapper("1.5").parse_config({}) == {}
    assert get_ospf_mapper("1.4").parse_config({"protocols": {"ospf": {}}}) == {}


def test_present_node_without_log_flag_is_false():
    parsed = get_ospf_mapper("1.5").parse_config(
        {"protocols": {"ospf": {"parameters": {"router-id": "1.1.1.1"}}}}
    )
    assert parsed["log_adjacency_changes"] is False
    assert parsed["parameters"]["router_id"] == "1.1.1.1"


def test_parse_nested_ospf_config():
    parsed_15 = get_ospf_mapper("1.5").parse_config(_tree())
    parsed_14 = get_ospf_mapper("1.4").parse_config(_tree())
    assert parsed_14 == parsed_15
    parsed = parsed_15
    assert parsed["parameters"]["router_id"] == "1.1.1.1"
    assert parsed["parameters"]["opaque_lsa"] is True
    area0 = next(area for area in parsed["areas"] if area["area_id"] == "0")
    assert area0["area_type"] == "nssa"
    assert area0["area_type_no_summary"] is True
    assert area0["area_type_default_cost"] == 20
    assert area0["networks"] == ["10.0.0.0/24"]
    assert area0["ranges"][0]["cost"] == 10
    assert area0["virtual_links"][0]["retransmit_window"] == 8
    synthesized = next(area for area in parsed["areas"] if area["area_id"] == "1")
    assert set(synthesized) == {"area_id"}
    eth0 = next(iface for iface in parsed["interfaces"] if iface["name"] == "eth0")
    assert eth0["cost"] == 10
    assert eth0["ldp_sync"] is True
    assert eth0["ldp_sync_disable"] is True
    assert eth0["ldp_sync_holddown"] == 5
    assert eth0["passive"] is False
    assert eth0["passive_disable"] is True
    assert eth0["authentication"]["md5_key_ids"] == {"1": "secret"}
    assert eth0["authentication"]["plaintext_password"] == "pw"
    tables = [item for item in parsed["redistribute"] if item["protocol"] == "table"]
    assert tables[0]["table"] == "100"
    assert tables[0]["metric"] == "5"
    assert parsed["default_information"]["enabled"] is True
    assert parsed["default_information"]["metric"] == 20
    assert parsed["distance"]["ospf"]["external"] == 120
    assert parsed["timers_throttle_spf"]["delay"] == 200
    assert parsed["max_metric_router_lsa"]["administrative"] is True
    assert parsed["max_metric_router_lsa"]["on_startup"] == 60
    assert parsed["graceful_restart"]["helper"]["router_ids"] == [
        "192.0.2.1",
        "192.0.2.2",
    ]
    assert parsed["neighbors"][0]["poll_interval"] == 30
    assert parsed["mpls_te"]["enable"] is True
    assert parsed["summary_addresses"][0]["tag"] == 7
    assert parsed["segment_routing"]["global_block_low"] == 16000
    assert parsed["auto_cost_reference_bandwidth"] == 100000
    assert parsed["log_adjacency_changes"] is True
    assert parsed["log_adjacency_changes_detail"] is True
    assert parsed["passive_interface_default"] is True
    assert parsed["maximum_paths"] == 4
    assert parsed["ldp_sync_holddown"] == 15
    assert parsed["refresh_timers"] == 10
    assert parsed["aggregation_timer"] == 5
    assert parsed["capability_opaque"] is True



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_ospf_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.ospf.ospf.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.ospf.ospf.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.ospf.ospf import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/ospf/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["parameters"]["router_id"] == expected["parameters"]["router_id"]
    assert body["log_adjacency_changes"] is True
    assert body["log_adjacency_changes_detail"] is True
    area_ids = {area["area_id"] for area in body["areas"]}
    assert area_ids == {"0", "1"}
    assert body["auto_cost_reference_bandwidth"] == 100000
