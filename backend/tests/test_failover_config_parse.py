"""Failover GET /config parse lives on the shared mapper (issues #966, #1399).

The parse reads the shape the device returned: a 1.4 ``check target`` is a
``multi:`` list (or one string), a 1.5 target is a tag dict with
``interface``/``vrf`` children. It does not branch on the version string.
"""

from typing import cast

import pytest

from routers.failover.failover import FailoverConfig
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.failover.failover import FailoverMapper

ROLLING = "2026.09.23-0027-rolling"


def _parse(version, tree):
    mapper = cast(FailoverMapper, CommandMapperRegistry.get_mapper("failover", version))
    return mapper.parse_config(tree)


def _tree_1_4():
    return {
        "protocols": {
            "failover": {
                "route": {
                    "10.0.0.0/8": {
                        "next-hop": {
                            "192.0.2.1": {
                                "metric": "20",
                                "onlink": {},
                                "interface": "eth0",
                                "check": {
                                    "policy": "all-available",
                                    "port": "8080",
                                    "timeout": "2",
                                    "type": "tcp",
                                    "target": ["192.0.2.9", "192.0.2.10"],
                                },
                            }
                        },
                    },
                    "192.0.2.0/24": {
                        "next-hop": {
                            "192.0.2.2": {"interface": "eth0", "check": {"target": "192.0.2.8"}}
                        }
                    },
                }
            }
        }
    }


def _tree_1_5():
    return {
        "protocols": {
            "failover": {
                "route": {
                    "10.0.0.0/8": {
                        "next-hop": {
                            "192.0.2.1": {
                                "metric": "20",
                                "onlink": {},
                                "interface": "eth0",
                                "check": {
                                    "policy": "any-available",
                                    "port": "8080",
                                    "timeout": "255",
                                    "type": "icmp",
                                    "target": {
                                        "192.0.2.9": {"interface": "eth1", "vrf": "blue"},
                                        "192.0.2.10": {},
                                    },
                                },
                            }
                        },
                        "dhcp-interface": {
                            "eth2": {
                                "metric": "30",
                                "onlink": {},
                                "interface": "eth3",
                                "check": {
                                    "policy": "all-available",
                                    "port": "53",
                                    "timeout": "10",
                                    "type": "icmp",
                                    "target": {"192.0.2.11": {"vrf": "red"}},
                                },
                            }
                        },
                    }
                }
            }
        }
    }


@pytest.mark.parametrize("version", ["1.4", "1.4.3"])
def test_1_4_multi_targets_are_flat(version):
    parsed = _parse(version, _tree_1_4())
    route = parsed["routes"][0]
    assert route == {
        "destination": "10.0.0.0/8",
        "next_hops": [
            {
                "address": "192.0.2.1",
                "check": {
                    "policy": "all-available",
                    "port": 8080,
                    "targets": [
                        {"address": "192.0.2.9", "interface": None, "vrf": None},
                        {"address": "192.0.2.10", "interface": None, "vrf": None},
                    ],
                    "timeout": 2,
                    "type": "tcp",
                },
                "interface": "eth0",
                "metric": 20,
                "onlink": True,
            }
        ],
        "dhcp_interfaces": [],
    }
    single = parsed["routes"][1]["next_hops"][0]
    assert single["check"]["targets"] == [{"address": "192.0.2.8", "interface": None, "vrf": None}]
    assert single["metric"] is None
    assert single["onlink"] is False


@pytest.mark.parametrize("version", ["1.5", "latest", ROLLING])
def test_1_5_tag_targets_and_dhcp_interfaces(version):
    route = _parse(version, _tree_1_5())["routes"][0]
    assert route["next_hops"][0]["check"]["targets"] == [
        {"address": "192.0.2.9", "interface": "eth1", "vrf": "blue"},
        {"address": "192.0.2.10", "interface": None, "vrf": None},
    ]
    assert route["dhcp_interfaces"] == [
        {
            "name": "eth2",
            "check": {
                "policy": "all-available",
                "port": 53,
                "targets": [{"address": "192.0.2.11", "interface": None, "vrf": "red"}],
                "timeout": 10,
                "type": "icmp",
            },
            "interface": "eth3",
            "metric": 30,
            "onlink": True,
        }
    ]


def test_every_leaf_fits_the_response_model():
    for version, tree in (("1.4", _tree_1_4()), (ROLLING, _tree_1_5())):
        parsed = _parse(version, tree)
        assert FailoverConfig(**parsed).model_dump() == parsed


@pytest.mark.parametrize("version", ["1.4", "1.5", ROLLING])
def test_empty_trees(version):
    assert _parse(version, {}) == {"routes": []}
    assert _parse(version, {"protocols": {"failover": {}}}) == {"routes": []}
    assert _parse(version, {"protocols": {"failover": {"route": {"10.0.0.0/8": {}}}}}) == {
        "routes": [{"destination": "10.0.0.0/8", "next_hops": [], "dhcp_interfaces": []}]
    }


def test_parse_does_not_read_the_version_string():
    """A 1.5 tree on the shared class parses the same as on the subclass."""
    tree = _tree_1_5()
    assert FailoverMapper("1.4").parse_config(tree) == _parse(ROLLING, tree)
