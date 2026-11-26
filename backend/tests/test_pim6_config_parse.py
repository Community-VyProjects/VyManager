"""PIMv6 GET /config parse lives on the shared mapper's parse_config."""

from typing import cast

import pytest

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.pim6 import Pim6Mapper


def _parse(tree, version="1.5"):
    return cast(Pim6Mapper, CommandMapperRegistry.get_mapper("pim6", version)).parse_config(tree)


def _tree():
    return {
        "protocols": {
            "pim6": {
                "interface": {
                    "eth0": {
                        "dr-priority": "9",
                        "hello": "15",
                        "no-bsm": {},
                        "no-unicast-bsm": {},
                        "passive": {},
                        "mld": {
                            "disable": {},
                            "interval": "125",
                            "last-member-query-count": "2",
                            "last-member-query-interval": "1000",
                            "max-response-time": "5000",
                            "version": "2",
                            "join": {
                                "ff0e::1:3": {"source": ["2001:db8::10", "2001:db8::11"]},
                            },
                        },
                    }
                },
                "join-prune-interval": "60",
                "keep-alive-timer": "bad",
                "packets": "1",
                "register-suppress-time": "5",
                "rp": {
                    "address": {
                        "2001:db8::1": {"group": ["ff0e::/16", "ff3e::/32"]},
                        "2001:db8::2": {"prefix-list6": "RP-PL6"},
                    },
                    "keep-alive-timer": "240",
                },
            }
        }
    }


@pytest.mark.parametrize("version", ["1.4", "1.5", "2026.09.23-0027-rolling"])
def test_parse_config_every_leaf(version):
    parsed = _parse(_tree(), version)
    assert parsed["configured"] is True
    assert parsed["interfaces"] == [{
        "name": "eth0",
        "dr_priority": 9,
        "hello": 15,
        "no_bsm": True,
        "no_unicast_bsm": True,
        "passive": True,
        "mld": {
            "disabled": True,
            "interval": 125,
            "last_member_query_count": 2,
            "last_member_query_interval": 1000,
            "max_response_time": 5000,
            "version": 2,
            "joins": [{"group": "ff0e::1:3", "sources": ["2001:db8::10", "2001:db8::11"]}],
        },
    }]
    assert parsed["join_prune_interval"] == 60
    assert parsed["keep_alive_timer"] is None
    assert parsed["packets"] == 1
    assert parsed["register_suppress_time"] == 5
    assert parsed["rp"] == {
        "addresses": [
            {"address": "2001:db8::1", "groups": ["ff0e::/16", "ff3e::/32"], "prefix_list6": None},
            {"address": "2001:db8::2", "groups": [], "prefix_list6": "RP-PL6"},
        ],
        "keep_alive_timer": 240,
    }


@pytest.mark.parametrize("bare", [{}, None])
def test_bare_protocols_pim6_is_configured(bare):
    parsed = _parse({"protocols": {"pim6": bare}})
    assert parsed["configured"] is True
    assert parsed["interfaces"] == []
    assert parsed["rp"] is None


def test_absent_pim6_is_the_same_shape_unconfigured():
    absent = _parse({})
    assert absent["configured"] is False
    bare = _parse({"protocols": {"pim6": {}}})
    assert set(absent) == set(bare)
    assert {k: v for k, v in bare.items() if k != "configured"} == {
        k: v for k, v in absent.items() if k != "configured"
    }


@pytest.mark.parametrize("bare", [{}, None])
def test_bare_interface_is_listed_with_everything_off(bare):
    iface = _parse({"protocols": {"pim6": {"interface": {"eth1": bare}}}})["interfaces"][0]
    assert iface == {
        "name": "eth1", "dr_priority": None, "hello": None,
        "no_bsm": False, "no_unicast_bsm": False, "passive": False, "mld": None,
    }


@pytest.mark.parametrize("bare", [{}, None])
def test_bare_mld_is_present(bare):
    iface = _parse({"protocols": {"pim6": {"interface": {"eth0": {"mld": bare}}}}})["interfaces"][0]
    assert iface["mld"] == {
        "disabled": False, "interval": None, "last_member_query_count": None,
        "last_member_query_interval": None, "max_response_time": None, "version": None, "joins": [],
    }


@pytest.mark.parametrize("bare", [{}, None])
def test_bare_mld_join_has_no_sources(bare):
    tree = {"protocols": {"pim6": {"interface": {"eth0": {"mld": {"join": {"ff0e::1:3": bare}}}}}}}
    assert _parse(tree)["interfaces"][0]["mld"]["joins"] == [{"group": "ff0e::1:3", "sources": []}]


def test_flag_with_string_value_is_not_set():
    iface = _parse({"protocols": {"pim6": {"interface": {"eth0": {"passive": "yes", "mld": "x"}}}}})["interfaces"][0]
    assert iface["passive"] is False
    assert iface["mld"] is None


@pytest.mark.parametrize("bare", [{}, None])
def test_bare_rp_is_present(bare):
    assert _parse({"protocols": {"pim6": {"rp": bare}}})["rp"] == {"addresses": [], "keep_alive_timer": None}


def test_single_join_source_and_rp_group_are_lists():
    tree = {"protocols": {"pim6": {
        "interface": {"eth0": {"mld": {"join": {"ff0e::1:3": {"source": "2001:db8::10"}}}}},
        "rp": {"address": {"2001:db8::1": {"group": "ff0e::/16"}, "2001:db8::3": {}}},
    }}}
    parsed = _parse(tree)
    assert parsed["interfaces"][0]["mld"]["joins"][0]["sources"] == ["2001:db8::10"]
    assert parsed["rp"]["addresses"] == [
        {"address": "2001:db8::1", "groups": ["ff0e::/16"], "prefix_list6": None},
        {"address": "2001:db8::3", "groups": [], "prefix_list6": None},
    ]


def test_registry_returns_the_shared_mapper():
    for version in ("1.4", "1.5", "2026.09.23-0027-rolling"):
        assert type(CommandMapperRegistry.get_mapper("pim6", version)) is Pim6Mapper


def test_mapper_has_no_versions_package_or_pass_through_init():
    import importlib.util

    assert importlib.util.find_spec("vyos_mappers.pim6.pim6_versions") is None
    assert "__init__" not in Pim6Mapper.__dict__
    assert "parse_config" in Pim6Mapper.__dict__


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = _parse(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.4"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.pim6.pim6.require_read_permission", allow)
    monkeypatch.setattr("routers.pim6.pim6.get_session_vyos_service", lambda _req: FakeService())

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.pim6.pim6 import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/pim6/config")
    assert response.status_code == 200, response.text
    assert response.json() == expected
