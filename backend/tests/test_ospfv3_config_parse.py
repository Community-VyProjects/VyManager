"""OSPFv3 GET /config parse lives on the mapper (issue #966).

Parse does not branch on version. Both 1.4 and 1.5 are asserted.
"""

import pytest
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.ospfv3 import Ospfv3Mapper


def get_ospfv3_mapper(version):
    return CommandMapperRegistry.get_mapper("ospfv3", version)


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
                                "default-information-originate": {},
                            }
                        },
                        "range": {
                            "2001:db8::/32": {"advertise": {}},
                            "2001:db8:1::/48": {"not-advertise": {}},
                        },
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
    assert get_ospfv3_mapper("1.4").parse_config({"protocols": {}}) == {}


@pytest.mark.parametrize("node", [{}, None])
def test_bare_ospfv3_node_is_configured(node):
    parsed = get_ospfv3_mapper("1.4").parse_config({"protocols": {"ospfv3": node}})
    assert parsed["configured"] is True
    assert parsed["areas"] == []
    assert parsed["default_information"] == {}
    assert parsed["graceful_restart"] == {}
    assert parsed["log_adjacency_changes"] is False


@pytest.mark.parametrize("originate", [{}, None])
def test_bare_default_information_originate_is_enabled(originate):
    parsed = get_ospfv3_mapper("1.5").parse_config(
        {"protocols": {"ospfv3": {"default-information": {"originate": originate}}}}
    )
    assert parsed["default_information"]["enabled"] is True


@pytest.mark.parametrize("gr", [{}, None])
def test_bare_graceful_restart_is_enabled(gr):
    parsed = get_ospfv3_mapper("1.5").parse_config({"protocols": {"ospfv3": {"graceful-restart": gr}}})
    assert parsed["graceful_restart"]["enabled"] is True
    assert parsed["graceful_restart"]["grace_period"] is None
    assert parsed["graceful_restart"]["helper"]["enable"] is False


def test_bare_helper_parses_with_every_flag_off():
    parsed = get_ospfv3_mapper("1.4").parse_config(
        {"protocols": {"ospfv3": {"graceful-restart": {"helper": {}}}}}
    )
    gr = parsed["graceful_restart"]
    assert gr["enabled"] is True
    assert gr["helper"] == {
        "enable": False, "router_ids": [], "lsa_check_disable": False,
        "planned_only": False, "supported_grace_time": None,
    }


def test_interface_only_area_is_not_configured():
    parsed = get_ospfv3_mapper("1.5").parse_config({"protocols": {"ospfv3": {
        "area": {"0": {}},
        "interface": {"eth0": {"area": "0"}, "eth1": {"area": "0.0.0.2"}},
    }}})
    areas = {a["area_id"]: a for a in parsed["areas"]}
    assert areas["0"]["configured"] is True
    assert areas["0.0.0.2"] == {"area_id": "0.0.0.2", "configured": False}

    from routers.ospfv3.ospfv3 import Ospfv3Config

    model = Ospfv3Config(**parsed)
    assert [a.configured for a in model.areas] == [True, False]


def test_present_node_without_log_flag_is_false():
    parsed = get_ospfv3_mapper("1.4").parse_config(
        {"protocols": {"ospfv3": {"parameters": {"router-id": "192.0.2.1"}}}}
    )
    assert parsed["log_adjacency_changes"] is False
    assert parsed["parameters"]["router_id"] == "192.0.2.1"


def test_parse_nested_ospfv3_config_both_versions():
    parsed_15 = get_ospfv3_mapper("1.5").parse_config(_tree())
    parsed_14 = get_ospfv3_mapper("1.4").parse_config(_tree())
    assert parsed_14 == parsed_15
    parsed = parsed_15
    assert parsed["parameters"]["router_id"] == "1.1.1.1"
    area0 = next(area for area in parsed["areas"] if area["area_id"] == "0")
    assert area0["area_type"] == "nssa"
    assert area0["area_type_no_summary"] is True
    assert "area_type_default_cost" not in area0
    assert area0["nssa_default_information_originate"] is True
    assert area0["ranges"] == [
        {"prefix": "2001:db8::/32", "advertise": True, "not_advertise": False},
        {"prefix": "2001:db8:1::/48", "advertise": False, "not_advertise": True},
    ]
    assert area0["configured"] is True
    assert area0["export_list"] == "OUT"
    synthesized = next(area for area in parsed["areas"] if area["area_id"] == "1")
    assert synthesized == {"area_id": "1", "configured": False}
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



def test_registry_returns_the_shared_class_on_every_version():
    for version in ("1.4", "1.5", "2026.09.23-0027-rolling"):
        mapper = get_ospfv3_mapper(version)
        assert type(mapper) is Ospfv3Mapper


def test_parse_stub_children():
    parsed = get_ospfv3_mapper("1.4").parse_config({"protocols": {"ospfv3": {"area": {
        "1": {"area-type": {"stub": {"no-summary": {}}}},
        "2": {"area-type": {"stub": {}}},
        "3": {},
    }}}})
    areas = {a["area_id"]: a for a in parsed["areas"]}
    assert areas["1"]["area_type"] == "stub"
    assert areas["1"]["area_type_no_summary"] is True
    assert areas["1"]["nssa_default_information_originate"] is False
    assert areas["2"]["area_type"] == "stub"
    assert areas["2"]["area_type_no_summary"] is False
    # A normal area has no area-type node.
    assert areas["3"]["area_type"] is None


def test_parse_nssa_children():
    parsed = get_ospfv3_mapper("1.5").parse_config({"protocols": {"ospfv3": {"area": {
        "0.0.0.1": {"area-type": {"nssa": {"default-information-originate": {}}}},
        "0.0.0.2": {"area-type": {"nssa": {"no-summary": {}}}},
    }}}})
    areas = {a["area_id"]: a for a in parsed["areas"]}
    assert areas["0.0.0.1"]["area_type"] == "nssa"
    assert areas["0.0.0.1"]["area_type_no_summary"] is False
    assert areas["0.0.0.1"]["nssa_default_information_originate"] is True
    assert areas["0.0.0.2"]["area_type_no_summary"] is True
    assert areas["0.0.0.2"]["nssa_default_information_originate"] is False


def test_helper_enable_absent_is_false():
    parsed = get_ospfv3_mapper("1.5").parse_config({"protocols": {"ospfv3": {
        "graceful-restart": {"helper": {"planned-only": {}}},
    }}})
    helper = parsed["graceful_restart"]["helper"]
    assert helper["enable"] is False
    assert helper["router_ids"] == []
    assert helper["planned_only"] is True


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
