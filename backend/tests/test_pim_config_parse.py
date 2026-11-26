"""PIM GET /config parse lives on the shared mapper's parse_config."""

from typing import cast

import pytest

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.pim import PimMapper


def _parse(tree, version="1.5"):
    return cast(PimMapper, CommandMapperRegistry.get_mapper("pim", version)).parse_config(tree)


def _tree():
    return {
        "protocols": {
            "pim": {
                "ecmp": {"rebalance": {}},
                "igmp": {"watermark-warning": "100"},
                "interface": {
                    "eth0": {
                        "bfd": {"profile": "fast"},
                        "dr-priority": "5",
                        "hello": "30",
                        "no-bsm": {},
                        "no-unicast-bsm": {},
                        "passive": {},
                        "source-address": "192.0.2.1",
                        "igmp": {
                            "disable": {},
                            "query-interval": "125",
                            "query-max-response-time": "100",
                            "version": "3",
                            "join": {
                                "239.1.1.1": {"source-address": ["192.0.2.10", "192.0.2.11"]},
                            },
                        },
                    }
                },
                "join-prune-interval": "60",
                "keep-alive-timer": "210",
                "no-v6-secondary": {},
                "packets": "3",
                "register-accept-list": {"prefix-list": "REG-PL"},
                "register-suppress-time": "bad",
                "rp": {
                    "address": {
                        "192.0.2.50": {"group": "224.1.0.0/16"},
                    },
                    "keep-alive-timer": "180",
                },
                "spt-switchover": {
                    "infinity-and-beyond": {"prefix-list": "SPT-PL"},
                },
                "ssm": {"prefix-list": "SSM-PL"},
            }
        }
    }


@pytest.mark.parametrize("version", ["1.4", "1.5", "2026.09.23-0027-rolling"])
def test_parse_config_every_leaf(version):
    parsed = _parse(_tree(), version)
    assert parsed["configured"] is True
    assert parsed["ecmp"] is True
    assert parsed["ecmp_rebalance"] is True
    assert parsed["igmp_watermark_warning"] == 100
    assert parsed["interfaces"] == [{
        "name": "eth0",
        "bfd": True,
        "bfd_profile": "fast",
        "dr_priority": 5,
        "hello": 30,
        "no_bsm": True,
        "no_unicast_bsm": True,
        "passive": True,
        "source_address": "192.0.2.1",
        "igmp": {
            "disabled": True,
            "joins": [{"group": "239.1.1.1", "source_addresses": ["192.0.2.10", "192.0.2.11"]}],
            "query_interval": 125,
            "query_max_response_time": 100,
            "version": 3,
        },
    }]
    assert parsed["join_prune_interval"] == 60
    assert parsed["keep_alive_timer"] == 210
    assert parsed["no_v6_secondary"] is True
    assert parsed["packets"] == 3
    assert parsed["register_accept_list_prefix_list"] == "REG-PL"
    assert parsed["register_suppress_time"] is None
    assert parsed["rp"] == {
        "addresses": [{"address": "192.0.2.50", "groups": ["224.1.0.0/16"]}],
        "keep_alive_timer": 180,
    }
    assert parsed["spt_switchover"] == {"infinity_and_beyond": True, "prefix_list": "SPT-PL"}
    assert parsed["ssm_prefix_list"] == "SSM-PL"


@pytest.mark.parametrize("bare", [{}, None])
def test_bare_protocols_pim_is_configured(bare):
    parsed = _parse({"protocols": {"pim": bare}})
    assert parsed["configured"] is True
    assert parsed["interfaces"] == []
    assert parsed["rp"] is None
    assert parsed["spt_switchover"] is None


def test_absent_pim_is_the_same_shape_unconfigured():
    absent = _parse({})
    assert absent["configured"] is False
    bare = _parse({"protocols": {"pim": {}}})
    assert set(absent) == set(bare)
    assert {k: v for k, v in bare.items() if k != "configured"} == {
        k: v for k, v in absent.items() if k != "configured"
    }


@pytest.mark.parametrize("bare", [{}, None])
def test_bare_ecmp_is_on_without_rebalance(bare):
    parsed = _parse({"protocols": {"pim": {"ecmp": bare}}})
    assert parsed["ecmp"] is True
    assert parsed["ecmp_rebalance"] is False


def test_ecmp_string_value_is_not_enabled():
    parsed = _parse({"protocols": {"pim": {"ecmp": "yes"}}})
    assert parsed["ecmp"] is False
    assert parsed["ecmp_rebalance"] is False


@pytest.mark.parametrize("bare", [{}, None])
def test_bare_spt_infinity_and_beyond(bare):
    parsed = _parse({"protocols": {"pim": {"spt-switchover": {"infinity-and-beyond": bare}}}})
    assert parsed["spt_switchover"] == {"infinity_and_beyond": True, "prefix_list": None}


@pytest.mark.parametrize("bare", [{}, None])
def test_bare_interface_bfd_is_on_without_profile(bare):
    iface = _parse({"protocols": {"pim": {"interface": {"eth0": {"bfd": bare}}}}})["interfaces"][0]
    assert iface["bfd"] is True
    assert iface["bfd_profile"] is None


@pytest.mark.parametrize("bare", [{}, None])
def test_bare_interface_is_listed_with_everything_off(bare):
    iface = _parse({"protocols": {"pim": {"interface": {"eth1": bare}}}})["interfaces"][0]
    assert iface == {
        "name": "eth1", "bfd": False, "bfd_profile": None, "dr_priority": None, "hello": None,
        "no_bsm": False, "no_unicast_bsm": False, "passive": False, "source_address": None, "igmp": None,
    }


@pytest.mark.parametrize("bare", [{}, None])
def test_bare_igmp_is_present(bare):
    iface = _parse({"protocols": {"pim": {"interface": {"eth0": {"igmp": bare}}}}})["interfaces"][0]
    assert iface["igmp"] == {
        "disabled": False, "joins": [], "query_interval": None, "query_max_response_time": None, "version": None,
    }


@pytest.mark.parametrize("bare", [{}, None])
def test_bare_igmp_join_has_no_sources(bare):
    tree = {"protocols": {"pim": {"interface": {"eth0": {"igmp": {"join": {"239.1.1.1": bare}}}}}}}
    assert _parse(tree)["interfaces"][0]["igmp"]["joins"] == [{"group": "239.1.1.1", "source_addresses": []}]


def test_single_join_source_and_rp_group_are_lists():
    tree = {"protocols": {"pim": {
        "interface": {"eth0": {"igmp": {"join": {"239.1.1.1": {"source-address": "192.0.2.1"}}}}},
        "rp": {"address": {"192.0.2.50": {"group": ["224.1.0.0/16", "239.0.0.0/8"]}, "192.0.2.51": {}}},
    }}}
    parsed = _parse(tree)
    assert parsed["interfaces"][0]["igmp"]["joins"][0]["source_addresses"] == ["192.0.2.1"]
    assert parsed["rp"]["addresses"] == [
        {"address": "192.0.2.50", "groups": ["224.1.0.0/16", "239.0.0.0/8"]},
        {"address": "192.0.2.51", "groups": []},
    ]


def test_registry_returns_the_shared_mapper():
    for version in ("1.4", "1.5", "2026.09.23-0027-rolling"):
        assert type(CommandMapperRegistry.get_mapper("pim", version)) is PimMapper


def test_mapper_has_no_versions_package_or_pass_through_init():
    import importlib.util

    assert importlib.util.find_spec("vyos_mappers.pim.pim_versions") is None
    assert "__init__" not in PimMapper.__dict__
    assert "parse_config" in PimMapper.__dict__


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = _parse(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.pim.pim.require_read_permission", allow)
    monkeypatch.setattr("routers.pim.pim.get_session_vyos_service", lambda _req: FakeService())

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.pim.pim import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/pim/config")
    assert response.status_code == 200, response.text
    assert response.json() == expected
