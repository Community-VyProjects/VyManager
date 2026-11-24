"""NHRP GET /config parse lives on the mapper (issue #966)."""

import pytest

from vyos_mappers.nhrp.nhrp_versions import get_nhrp_mapper


def _tree():
    return {
        "protocols": {
            "nhrp": {
                "tunnel": {
                    "tun1": {
                        "cisco-authentication": "secret14",
                        "authentication": "secret15",
                        "holding-time": "600",
                        "holdtime": "700",
                        "map": {
                            "10.0.0.1": {
                                "nbma-address": "192.0.2.1",
                                "cisco": {},
                                "register": {},
                            },
                            "tunnel-ip": {
                                "10.0.0.2": {"nbma": "192.0.2.2"},
                            },
                        },
                        "dynamic-map": {
                            "10.1.0.0/24": {"nbma-domain-name": "example.com"},
                        },
                        "nhs": {
                            "tunnel-ip": {
                                "10.0.0.3": {"nbma": {"192.0.2.3": {}}},
                            }
                        },
                        "multicast": ["dynamic"],
                        "mtu": "1400",
                        "network-id": "1",
                        "redirect": {},
                        "shortcut": {},
                        "registration-no-unique": {},
                        "non-caching": {},
                        "shortcut-destination": {},
                        "shortcut-target": {
                            "10.2.0.0/24": {"holding-time": "300"},
                        },
                    },
                    "tun0": {},
                }
            }
        }
    }


def test_empty_nhrp_is_disabled():
    parsed = get_nhrp_mapper("1.5").parse_config({})
    assert parsed == {"enabled": False, "tunnels": []}
    parsed = get_nhrp_mapper("1.4").parse_config({"protocols": {"bfd": {}}})
    assert parsed == {"enabled": False, "tunnels": []}


def test_bare_nhrp_node_is_enabled():
    """`protocols nhrp {}` parses as {} but the node exists, so it is enabled."""
    for version in ("1.4", "1.5"):
        parsed = get_nhrp_mapper(version).parse_config({"protocols": {"nhrp": {}}})
        assert parsed == {"enabled": True, "tunnels": []}


def test_present_node_without_tunnels_is_enabled():
    parsed = get_nhrp_mapper("1.4").parse_config(
        {"protocols": {"nhrp": {"tunnel": {}}}}
    )
    assert parsed == {"enabled": True, "tunnels": []}
    parsed = get_nhrp_mapper("1.5").parse_config(
        {"protocols": {"nhrp": {"other": {}}}}
    )
    assert parsed == {"enabled": True, "tunnels": []}


def test_1_4_uses_cisco_authentication_and_flat_maps():
    parsed = get_nhrp_mapper("1.4.2").parse_config(_tree())
    assert [t["name"] for t in parsed["tunnels"]] == ["tun0", "tun1"]
    tun1 = parsed["tunnels"][1]
    assert tun1["authentication"] == "***"
    assert tun1["holding_time"] == "600"
    assert tun1["maps"][0]["tunnel_ip"] == "10.0.0.1"
    assert tun1["maps"][0]["nbma_address"] == "192.0.2.1"
    assert tun1["maps"][0]["cisco"] is True
    assert tun1["maps"][0]["register"] is True
    assert tun1["dynamic_maps"][0]["nbma_domain_name"] == "example.com"
    assert tun1["nhs_entries"] == []
    assert tun1["mtu"] is None
    assert tun1["network_id"] is None
    assert tun1["registration_no_unique"] is False
    assert tun1["non_caching"] is True
    assert tun1["shortcut_destination"] is True
    assert tun1["shortcut_targets"][0]["holding_time"] == "300"
    assert tun1["redirect"] is True
    assert tun1["multicast"] == ["dynamic"]


def test_1_5_uses_authentication_and_nested_maps():
    parsed = get_nhrp_mapper("1.5").parse_config(_tree())
    tun1 = parsed["tunnels"][1]
    assert tun1["authentication"] == "***"
    assert tun1["holding_time"] == "700"
    assert [m["tunnel_ip"] for m in tun1["maps"]] == ["10.0.0.2"]
    assert tun1["maps"][0]["nbma_address"] == "192.0.2.2"
    assert tun1["dynamic_maps"] == []
    assert tun1["shortcut_targets"] == []
    assert tun1["non_caching"] is False
    assert tun1["nhs_entries"] == [
        {"tunnel_ip": "10.0.0.3", "nbma_addresses": ["192.0.2.3"]}
    ]
    assert tun1["mtu"] == "1400"
    assert tun1["network_id"] == "1"
    assert tun1["registration_no_unique"] is True
    assert tun1["shortcut"] is True


@pytest.mark.parametrize("version, key, other", [
    ("1.4", "cisco-authentication", "authentication"),
    ("1.5", "authentication", "cisco-authentication"),
])
def test_authentication_is_masked_and_read_from_the_version_key(version, key, other):
    """The pass phrase never leaves the backend; only the version's own key counts."""
    mapper = get_nhrp_mapper(version)
    tree = {"protocols": {"nhrp": {"tunnel": {"tun0": {key: "s3cr,t"}}}}}
    (tunnel,) = mapper.parse_config(tree)["tunnels"]
    assert tunnel["authentication"] == "***"
    assert "s3cr,t" not in repr(mapper.parse_config(tree))
    tree = {"protocols": {"nhrp": {"tunnel": {"tun0": {other: "s3cr,t"}}}}}
    (tunnel,) = mapper.parse_config(tree)["tunnels"]
    assert tunnel["authentication"] is None
    tree = {"protocols": {"nhrp": {"tunnel": {"tun0": {}}}}}
    (tunnel,) = mapper.parse_config(tree)["tunnels"]
    assert tunnel["authentication"] is None
