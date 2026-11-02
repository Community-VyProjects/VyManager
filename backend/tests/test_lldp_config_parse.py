"""LLDP GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.lldp.lldp_versions import get_lldp_mapper


def _tree():
    return {
        "service": {
            "lldp": {
                "management-address": {"10.0.0.2": {}, "10.0.0.1": {}},
                "snmp": {},
                "legacy-protocols": {"cdp": {}, "fdp": {}},
                "interface": {
                    "eth1": {"disable": {}},
                    "eth0": {
                        "mode": "rx",
                        "location": {
                            "coordinate-based": {
                                "altitude": "10",
                                "datum": "WGS84",
                                "latitude": "40.0",
                                "longitude": "-75.0",
                            },
                            "elin": {"5551212": {}},
                        },
                    },
                    "eth2": None,
                },
            }
        }
    }


def _empty():
    return {
        "management_addresses": [],
        "snmp_enabled": False,
        "legacy_protocols": {
            "cdp": False,
            "edp": False,
            "fdp": False,
            "sonmp": False,
        },
        "interfaces": [],
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_lldp_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"
    assert get_lldp_mapper("1.5").version == "1.5"


def test_interface_mode_location_and_legacy_flags():
    parsed = get_lldp_mapper("1.5").parse_config(_tree())
    assert type(parsed) is dict
    assert parsed["management_addresses"] == ["10.0.0.1", "10.0.0.2"]
    assert parsed["snmp_enabled"] is True
    assert parsed["legacy_protocols"] == {
        "cdp": True,
        "edp": False,
        "fdp": True,
        "sonmp": False,
    }
    by_name = {iface["name"]: iface for iface in parsed["interfaces"]}
    assert list(by_name) == ["eth0", "eth1", "eth2"]
    assert by_name["eth0"]["mode"] == "rx"
    assert by_name["eth0"]["disabled"] is False
    assert by_name["eth0"]["location"]["elin"] == "5551212"
    assert by_name["eth0"]["location"]["coordinate_based"]["datum"] == "WGS84"
    assert by_name["eth1"]["mode"] == "disable"
    assert by_name["eth1"]["disabled"] is True
    assert by_name["eth1"]["location"] is None
    assert by_name["eth2"] == {
        "name": "eth2",
        "mode": "rx-tx",
        "disabled": False,
        "location": None,
    }
    assert get_lldp_mapper("1.4").parse_config(_tree()) == parsed


def test_mode_node_wins_over_disable_flag():
    tree = {
        "service": {
            "lldp": {"interface": {"eth0": {"mode": "tx", "disable": {}}}}
        }
    }
    iface = get_lldp_mapper("1.4").parse_config(tree)["interfaces"][0]
    assert iface["mode"] == "tx"
    assert iface["disabled"] is False


def test_empty_tree():
    assert get_lldp_mapper("1.4").parse_config({}) == _empty()
    assert get_lldp_mapper("1.5").parse_config({"service": {}}) == _empty()
    assert get_lldp_mapper("1.5").parse_config({"service": {"lldp": {}}}) == _empty()



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_lldp_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.lldp.lldp.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.lldp.lldp.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.lldp.lldp import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/lldp/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["snmp_enabled"] is True
    assert body["management_addresses"] == expected["management_addresses"]
    assert body["interfaces"][0]["location"]["elin"] == "5551212"
    assert body["interfaces"][1]["disabled"] is True
    assert body["legacy_protocols"]["fdp"] is True
