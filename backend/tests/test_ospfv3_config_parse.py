"""OSPFv3 GET /config parse lives on the mapper (issue #966).

Parse does not branch on version. Both 1.4 and 1.5 are asserted.
"""

from pathlib import Path

from vyos_mappers.ospfv3.ospfv3_versions import get_ospfv3_mapper


def _tree():
    return {
        "protocols": {
            "ospfv3": {
                "parameters": {"router-id": "1.1.1.1"},
                "area": {
                    "0": {
                        "area-type": {
                            "nssa": {
                                "no-summary": {},
                                "default-cost": "10",
                                "default-information-originate": {},
                            }
                        },
                        "range": {"2001:db8::/32": {"advertise": {}, "not-advertise": {}}},
                        "export-list": "OUT",
                    }
                },
                "interface": {
                    "eth0": {
                        "area": "1",
                        "cost": "20",
                        "bfd": {"profile": "fast"},
                        "ifmtu": "1400",
                        "instance-id": "0",
                        "passive": {},
                    }
                },
                "redistribute": {
                    "connected": {"metric": "10", "metric-type": "2", "route-map": "RM"}
                },
                "default-information": {"originate": {"always": {}, "metric": "1"}},
                "distance": {"global": "110", "ospfv3": {"external": "120"}},
                "graceful-restart": {
                    "grace-period": "60",
                    "helper": {
                        "enable": {"router-id": ["192.0.2.1"]},
                        "lsa-check-disable": {},
                    },
                },
                "auto-cost": {"reference-bandwidth": "10000"},
                "log-adjacency-changes": {"detail": {}},
            }
        }
    }


def test_empty_tree_leaves_absent_flags_unset():
    assert get_ospfv3_mapper("1.5").parse_config({}) == {}
    assert get_ospfv3_mapper("1.4").parse_config({"protocols": {"ospfv3": {}}}) == {}


def test_present_node_without_log_flag_is_false():
    parsed = get_ospfv3_mapper("1.4").parse_config(
        {"protocols": {"ospfv3": {"parameters": {"router-id": "2001:db8::1"}}}}
    )
    assert parsed["log_adjacency_changes"] is False
    assert parsed["parameters"]["router_id"] == "2001:db8::1"


def test_parse_nested_ospfv3_config_both_versions():
    parsed_15 = get_ospfv3_mapper("1.5").parse_config(_tree())
    parsed_14 = get_ospfv3_mapper("1.4").parse_config(_tree())
    assert parsed_14 == parsed_15
    parsed = parsed_15
    assert parsed["parameters"]["router_id"] == "1.1.1.1"
    area0 = next(area for area in parsed["areas"] if area["area_id"] == "0")
    assert area0["area_type"] == "nssa"
    assert area0["area_type_no_summary"] is True
    assert area0["area_type_default_cost"] == 10
    assert area0["nssa_default_information_originate"] is True
    assert area0["ranges"][0]["advertise"] is True
    assert area0["ranges"][0]["not_advertise"] is True
    assert area0["export_list"] == "OUT"
    synthesized = next(area for area in parsed["areas"] if area["area_id"] == "1")
    assert set(synthesized) == {"area_id"}
    iface = parsed["interfaces"][0]
    assert iface["name"] == "eth0"
    assert iface["cost"] == 20
    assert iface["bfd"] is True
    assert iface["bfd_profile"] == "fast"
    assert iface["ifmtu"] == 1400
    assert iface["instance_id"] == 0
    assert iface["passive"] is True
    assert parsed["redistribute"][0]["route_map"] == "RM"
    assert parsed["default_information"]["always"] is True
    assert parsed["default_information"]["metric"] == 1
    assert parsed["distance"]["ospfv3"]["external"] == 120
    assert parsed["graceful_restart"]["grace_period"] == 60
    assert parsed["graceful_restart"]["helper"]["enable"] is True
    assert parsed["graceful_restart"]["helper"]["router_ids"] == ["192.0.2.1"]
    assert parsed["graceful_restart"]["helper"]["lsa_check_disable"] is True
    assert parsed["auto_cost_reference_bandwidth"] == 10000
    assert parsed["log_adjacency_changes"] is True
    assert parsed["log_adjacency_changes_detail"] is True


def test_ospfv3_router_has_no_config_parsers():
    text = (
        Path(__file__).resolve().parents[1].joinpath("routers/ospfv3/ospfv3.py").read_text()
    )
    assert "Config Parsers" not in text


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_ospfv3_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.ospfv3.ospfv3.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.ospfv3.ospfv3.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.ospfv3.ospfv3 import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/ospfv3/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["parameters"]["router_id"] == expected["parameters"]["router_id"]
    assert body["interfaces"][0]["bfd_profile"] == "fast"
    assert body["graceful_restart"]["helper"]["router_ids"] == ["192.0.2.1"]
    assert {area["area_id"] for area in body["areas"]} == {"0", "1"}
    assert body["log_adjacency_changes"] is True
