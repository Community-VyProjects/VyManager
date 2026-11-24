"""IPoE server parse_config lives on the mapper and returns the screen shape."""

from typing import cast

import pytest

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.ipoe_server import IPoEServerMapper


def _parse(full_config, version="1.5"):
    mapper = cast(IPoEServerMapper, CommandMapperRegistry.get_mapper("ipoe_server", version))
    return mapper.parse_config(full_config)


EMPTY_TOTALS = {
    "auth_interfaces": 0,
    "radius_servers": 0,
    "client_ip_pools": 0,
    "client_ipv6_pools": 0,
    "interfaces": 0,
}


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_unconfigured_returns_the_same_shape_with_empty_lists(version):
    result = _parse({"service": {}}, version)
    assert result["configured"] is False
    assert result["interfaces"] == []
    assert result["client_ip_pools"] == []
    assert result["client_ipv6_pools"] == []
    assert result["authentication"]["interfaces"] == []
    assert result["authentication"]["radius"]["servers"] == []
    assert result["totals"] == EMPTY_TOTALS


def test_bare_root_node_is_configured():
    result = _parse({"service": {"ipoe-server": {}}})
    assert result["configured"] is True
    assert result["snmp"] == {"enabled": False, "master_agent": False}
    assert result["shaper"] == {"enabled": False, "fwmark": None}
    assert result["idle_timeout"] is None
    assert result["authentication"]["radius"]["preallocate_vif"] is False
    assert result["totals"] == EMPTY_TOTALS


def test_full_tree_parses_into_lists_and_masks_secrets():
    full_config = {
        "service": {
            "ipoe-server": {
                "description": "lab",
                "default-pool": "p1",
                "gateway-address": "192.0.2.1/24",
                "name-server": ["192.0.2.53", "2001:db8::53"],
                "snmp": {"master-agent": {}},
                "log": {"level": "3"},
                "limits": {"burst": "5"},
                "authentication": {
                    "mode": "local",
                    "interface": {
                        "eth1": {
                            "mac": {
                                "00:11:22:33:44:55": {
                                    "ip-address": "192.0.2.10",
                                    "vlan": "10",
                                    "rate-limit": {"download": "100", "upload": "50"},
                                },
                            },
                        },
                    },
                    "radius": {
                        "server": {
                            "192.0.2.2": {
                                "key": "s3cret",
                                "port": "1812",
                                "disable": {},
                                "backup": {},
                            },
                        },
                        "preallocate-vif": {},
                        "dynamic-author": {"server": "192.0.2.3", "key": "dae-secret"},
                        "rate-limit": {"enable": {}, "attribute": "Filter-Id"},
                    },
                },
                "client-ip-pool": {
                    "p1": {"range": "192.0.2.100-192.0.2.200", "next-pool": "p2"},
                    "p2": {"range": ["198.51.100.0/24", "203.0.113.0/24"]},
                },
                "client-ipv6-pool": {
                    "v6": {
                        "prefix": {"2001:db8::/48": {"mask": "64"}},
                        "delegate": {"2001:db8:1::/48": {"delegation-prefix": "56"}},
                    },
                },
                "interface": {
                    "eth1": {
                        "mode": "l2",
                        "vlan": ["10", "20"],
                        "vlan-mon": {},
                        "external-dhcp": {"dhcp-relay": "192.0.2.4"},
                    },
                    "eth2": {"network": "shared"},
                },
            },
        },
    }
    result = _parse(full_config)

    assert result["configured"] is True
    assert result["description"] == "lab"
    assert result["gateway_addresses"] == ["192.0.2.1/24"]
    assert result["name_servers"] == ["192.0.2.53", "2001:db8::53"]
    assert result["snmp"] == {"enabled": True, "master_agent": True}
    assert result["log"] == {"level": "3"}
    assert result["limits"] == {"enabled": True, "burst": "5", "connection_limit": None, "timeout": None}

    auth = result["authentication"]
    assert auth["mode"] == "local"
    assert auth["interfaces"] == [{
        "interface": "eth1",
        "macs": [{
            "mac": "00:11:22:33:44:55",
            "ip_address": "192.0.2.10",
            "vlan": "10",
            "rate_limit": {"download": "100", "upload": "50"},
        }],
    }]
    radius = auth["radius"]
    assert radius["servers"] == [{
        "address": "192.0.2.2",
        "key": "***",
        "port": "1812",
        "acct_port": None,
        "priority": None,
        "fail_time": None,
        "disabled": True,
        "backup": True,
        "disable_accounting": False,
    }]
    assert radius["preallocate_vif"] is True
    assert radius["dynamic_author"] == {"server": "192.0.2.3", "port": None, "key": "***"}
    assert radius["rate_limit"] == {
        "enable": True,
        "attribute": "Filter-Id",
        "vendor": None,
        "multiplier": None,
    }
    assert "s3cret" not in repr(result)
    assert "dae-secret" not in repr(result)

    assert result["client_ip_pools"] == [
        {"name": "p1", "ranges": ["192.0.2.100-192.0.2.200"], "next_pool": "p2"},
        {"name": "p2", "ranges": ["198.51.100.0/24", "203.0.113.0/24"], "next_pool": None},
    ]
    assert result["client_ipv6_pools"] == [{
        "name": "v6",
        "prefixes": [{"prefix": "2001:db8::/48", "mask": "64"}],
        "delegates": [{"prefix": "2001:db8:1::/48", "delegation_prefix": "56"}],
    }]
    assert result["interfaces"][0] == {
        "interface": "eth1",
        "mode": "l2",
        "network": None,
        "start_session": None,
        "client_subnet": None,
        "vlans": ["10", "20"],
        "vlan_mon": True,
        "lua_username": None,
        "external_dhcp": {"dhcp_relay": "192.0.2.4", "giaddr": None},
    }
    assert result["interfaces"][1]["external_dhcp"] is None
    assert result["totals"] == {
        "auth_interfaces": 1,
        "radius_servers": 1,
        "client_ip_pools": 2,
        "client_ipv6_pools": 1,
        "interfaces": 2,
    }


def test_mapper_parse_config_delegates_to_config_parse(monkeypatch):
    calls = []

    def fake(mapper, full_config):
        calls.append((mapper, full_config))
        return {"configured": False}

    monkeypatch.setattr("vyos_mappers.ipoe_server.config_parse.parse_config", fake)
    mapper = IPoEServerMapper("1.5")
    assert mapper.parse_config({"service": {}}) == {"configured": False}
    assert calls == [(mapper, {"service": {}})]
