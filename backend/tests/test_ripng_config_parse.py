"""RIPng GET /config parse lives on the mapper (issues #966, #1399)."""

import pytest

from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.ripng import RipNgMapper


def get_ripng_mapper(version):
    return RipNgMapper(version)


def _tree():
    return {
        "protocols": {
            "ripng": {
                "default-information": {"originate": {}},
                "default-metric": "4",
                "route-map": "RM1",
                "aggregate-address": "2001:db8::/48",
                "network": ["2001:db8:1::/64", "2001:db8:2::/64"],
                "route": {"2001:db8:9::/64": {}},
                "passive-interface": "eth2",
                "distribute-list": {
                    "access-list": {"in": "ACL-IN"},
                    "prefix-list": {"out": "PFX-OUT"},
                    "interface": {
                        "eth0": {"access-list": {"out": "ACL-ETH"}, "prefix-list": {"in": "PFX-ETH"}}
                    },
                },
                "interface": {
                    "eth0": {"split-horizon": {"poison-reverse": {}}},
                    "eth1": {"split-horizon": {"disable": {}}},
                    "eth3": None,
                },
                "redistribute": {
                    "static": {"metric": "not-a-number", "route-map": "RM2"},
                    "connected": None,
                },
                "timers": {"update": "30", "timeout": "180", "garbage-collection": "120"},
            }
        }
    }


def test_parse_distinctive_fields():
    parsed = get_ripng_mapper("1.5").parse_config(_tree())
    assert parsed["configured"] is True
    assert parsed["default_information_originate"] is True
    assert parsed["default_metric"] == 4
    assert parsed["route_map"] == "RM1"
    assert parsed["aggregate_addresses"] == ["2001:db8::/48"]
    assert parsed["networks"] == ["2001:db8:1::/64", "2001:db8:2::/64"]
    assert parsed["routes"] == ["2001:db8:9::/64"]
    assert parsed["passive_interfaces"] == ["eth2"]
    assert parsed["distribute_list"]["global_filters"]["access_list_in"] == "ACL-IN"
    assert parsed["distribute_list"]["global_filters"]["prefix_list_out"] == "PFX-OUT"
    iface_filter = parsed["distribute_list"]["interface_filters"][0]
    assert iface_filter["interface"] == "eth0"
    assert iface_filter["access_list_out"] == "ACL-ETH"
    assert iface_filter["prefix_list_in"] == "PFX-ETH"
    interfaces = {item["name"]: item for item in parsed["interfaces"]}
    assert interfaces["eth0"]["split_horizon"] == "poison-reverse"
    assert interfaces["eth1"]["split_horizon"] == "disable"
    assert interfaces["eth3"]["split_horizon"] is None
    redistributed = {item["protocol"]: item for item in parsed["redistribute"]}
    assert redistributed["static"]["metric"] is None
    assert redistributed["static"]["route_map"] == "RM2"
    assert redistributed["connected"]["metric"] is None
    assert parsed["timers"] == {"update": 30, "timeout": 180, "garbage_collection": 120}


def test_empty_tree():
    parsed = get_ripng_mapper("1.4").parse_config({})
    assert parsed["configured"] is False
    assert parsed["default_information_originate"] is False
    assert parsed["aggregate_addresses"] == []
    assert parsed["interfaces"] == []
    assert parsed["redistribute"] == []
    assert parsed["timers"] == {"update": None, "timeout": None, "garbage_collection": None}
    assert parsed["distribute_list"]["interface_filters"] == []
    assert parsed["distribute_list"]["global_filters"]["access_list_in"] is None


@pytest.mark.parametrize("bare", [{}, None])
def test_bare_protocols_ripng_is_configured(bare):
    parsed = get_ripng_mapper("1.5").parse_config({"protocols": {"ripng": bare}})
    empty = get_ripng_mapper("1.5").parse_config({"protocols": {}})
    assert parsed["configured"] is True
    assert empty["configured"] is False
    parsed.pop("configured")
    empty.pop("configured")
    assert parsed == empty


@pytest.mark.parametrize("originate", [{}, None])
def test_bare_default_information_originate_is_on(originate):
    tree = {"protocols": {"ripng": {"default-information": {"originate": originate}}}}
    assert get_ripng_mapper("1.5").parse_config(tree)["default_information_originate"] is True


@pytest.mark.parametrize("split", [{}, None])
def test_bare_split_horizon_reads_unset(split):
    tree = {"protocols": {"ripng": {"interface": {"eth0": {"split-horizon": split}, "eth1": {}}}}}
    parsed = get_ripng_mapper("1.5").parse_config(tree)
    assert parsed["interfaces"] == [
        {"name": "eth0", "split_horizon": None},
        {"name": "eth1", "split_horizon": None},
    ]


@pytest.mark.parametrize("entry", [{}, None, {"access-list": {}, "prefix-list": None}])
def test_bare_per_interface_distribute_list_is_listed(entry):
    tree = {"protocols": {"ripng": {"distribute-list": {"interface": {"eth0": entry}}}}}
    parsed = get_ripng_mapper("1.5").parse_config(tree)
    assert parsed["distribute_list"]["interface_filters"] == [{
        "interface": "eth0",
        "access_list_in": None,
        "access_list_out": None,
        "prefix_list_in": None,
        "prefix_list_out": None,
    }]
    assert parsed["distribute_list"]["global_filters"] == {
        "access_list_in": None, "access_list_out": None, "prefix_list_in": None, "prefix_list_out": None,
    }


def test_bare_redistribute_and_timers():
    tree = {"protocols": {"ripng": {"redistribute": {"kernel": {}}, "timers": {}}}}
    parsed = get_ripng_mapper("1.5").parse_config(tree)
    assert parsed["redistribute"] == [{"protocol": "kernel", "metric": None, "route_map": None}]
    assert parsed["timers"] == {"update": None, "timeout": None, "garbage_collection": None}


def test_sample_tree_fits_the_router_model():
    from routers.ripng.ripng import RipNgConfig

    for tree in (_tree(), {}, {"protocols": {"ripng": {}}}):
        parsed = get_ripng_mapper("1.5").parse_config(tree)
        assert RipNgConfig(**parsed).model_dump() == parsed


def test_registry_matches_factory():
    factory = get_ripng_mapper("1.5").parse_config(_tree())
    registry = CommandMapperRegistry.get_mapper("ripng", "1.5").parse_config(_tree())
    assert registry["default_metric"] == factory["default_metric"] == 4


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_ripng_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.ripng.ripng.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.ripng.ripng.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.ripng.ripng import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/ripng/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["default_metric"] == expected["default_metric"]
    assert body["default_information_originate"] is True
    assert body["interfaces"][0]["split_horizon"] == "poison-reverse"
    assert body["timers"]["garbage_collection"] == 120
