"""Capability flags for firewall groups, zones, and family read the mapper allowlist.

Domain groups exist on 1.4 and 1.5. Remote groups, zone member nodes, GRE,
prerouting raw, and directional IPsec exist only on 1.5. validateTmplPath on
100.64.64.50 and 100.64.64.5.
"""

import pytest

from vyos_builders.firewall.family import FirewallFamilyBatchBuilder
from vyos_builders.firewall.groups import FirewallGroupsBatchBuilder
from vyos_builders.firewall.zones import FirewallZonesBatchBuilder
from vyos_mappers.firewall.family import FirewallFamilyMapper
from vyos_mappers.firewall.groups import FirewallGroupsMapper
from vyos_mappers.firewall.zones import FirewallZonesMapper


def test_domain_group_flag_follows_the_device_tree():
    caps14 = FirewallGroupsBatchBuilder(version="1.4").get_capabilities()["group_types"]
    caps15 = FirewallGroupsBatchBuilder(version="1.5").get_capabilities()["group_types"]
    assert caps14["domain_group"]["supported"] is True
    assert caps15["domain_group"]["supported"] is True
    assert caps14["remote_group"]["supported"] is False
    assert caps15["remote_group"]["supported"] is True
    assert "domain_group" in FirewallGroupsBatchBuilder(version="1.4").get_capabilities()["operations"]
    assert "remote_group" not in FirewallGroupsBatchBuilder(version="1.4").get_capabilities()["operations"]
    assert "remote_group" in FirewallGroupsBatchBuilder(version="1.5").get_capabilities()["operations"]


def test_group_path_follows_the_mapper_allowlist(monkeypatch):
    """Path methods must follow the same set the capability flag reads."""
    monkeypatch.setattr(
        FirewallGroupsMapper,
        "supported_group_types",
        lambda self: frozenset({"domain-group"}),
    )
    builder = FirewallGroupsBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_address_group("G1")
    assert builder.get_operations() == []
    builder.set_domain_group("G1")
    assert builder.get_operations()[0]["path"] == ["firewall", "group", "domain-group", "G1"]


def test_nondirectional_ipsec_follows_the_allowlist():
    builder = FirewallFamilyBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_rule_ipsec_match_ipsec("prerouting_raw", 10, False)
    assert builder.get_operations() == []
    builder.set_rule_ipsec_match_ipsec("forward", 10, False)
    assert builder.get_operations()[0]["path"][-2:] == ["ipsec", "match-ipsec"]
    other = FirewallFamilyBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported"):
        other.set_rule_ipsec_match_ipsec("forward", 10, False)
    assert other.get_operations() == []


def test_zone_parse_uses_the_mapper_allowlist():
    from routers.firewall.zones import _parse_zone
    cfg = {
        "member": {"interface": ["eth1"], "vrf": ["blue"]},
        "default-firewall": {"name": "RS1"},
        "interface": ["eth9"],
    }
    latest = _parse_zone("LAN", cfg, "latest")
    assert latest["interfaces"] == ["eth1"]
    assert latest["vrfs"] == ["blue"]
    assert latest["default_firewall"]["name"] == "RS1"
    v14 = _parse_zone("LAN", cfg, "1.4")
    assert v14["interfaces"] == ["eth9"]
    assert v14["vrfs"] == []
    assert v14["default_firewall"] is None


def test_group_flags_read_the_mapper_allowlist(monkeypatch):
    """A second handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(
        FirewallGroupsMapper,
        "supported_group_types",
        lambda self: frozenset({"domain-group"}),
    )
    caps = FirewallGroupsBatchBuilder(version="1.5").get_capabilities()
    assert caps["group_types"]["domain_group"]["supported"] is True
    assert caps["group_types"]["remote_group"]["supported"] is False
    assert caps["group_types"]["address_group"]["supported"] is False
    assert "domain_group" in caps["operations"]
    assert "remote_group" not in caps["operations"]
    assert "address_group" not in caps["operations"]


def test_zone_flags_follow_the_device_tree():
    caps14 = FirewallZonesBatchBuilder(version="1.4").get_capabilities()["features"]
    caps15 = FirewallZonesBatchBuilder(version="1.5").get_capabilities()["features"]
    assert caps14["interface_direct"]["supported"] is True
    assert caps14["member_interface"]["supported"] is False
    assert caps14["member_vrf"]["supported"] is False
    assert caps14["default_firewall"]["supported"] is False
    assert caps15["interface_direct"]["supported"] is False
    assert caps15["member_interface"]["supported"] is True
    assert caps15["member_vrf"]["supported"] is True
    assert caps15["default_firewall"]["supported"] is True


def test_zone_flags_read_the_mapper_allowlist(monkeypatch):
    """A second handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(
        FirewallZonesMapper,
        "supported_zone_nodes",
        lambda self: frozenset({"interface"}),
    )
    caps = FirewallZonesBatchBuilder(version="1.5").get_capabilities()["features"]
    assert caps["interface_direct"]["supported"] is True
    assert caps["member_interface"]["supported"] is False
    assert caps["default_firewall"]["supported"] is False


def test_family_flags_follow_the_device_tree():
    caps14 = FirewallFamilyBatchBuilder(version="1.4").get_capabilities()["features"]
    caps15 = FirewallFamilyBatchBuilder(version="1.5").get_capabilities()["features"]
    for flag in ("remote_group", "prerouting_raw", "gre_matching", "ipsec_directional"):
        assert caps14[flag]["supported"] is False
        assert caps15[flag]["supported"] is True


def test_family_flags_read_the_mapper_allowlist(monkeypatch):
    """A second handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(FirewallFamilyMapper, "has_rule_node", lambda self, node: node == "gre")
    caps = FirewallFamilyBatchBuilder(version="1.4").get_capabilities()["features"]
    assert caps["gre_matching"]["supported"] is True
    assert caps["remote_group"]["supported"] is False
    builder = FirewallFamilyBatchBuilder(version="1.4")
    builder.set_rule_gre_key("forward", 10, "1", False)
    assert builder.get_operations()[0]["path"][-3:] == ["gre", "key", "1"]
    builder.clear()
    with pytest.raises(ValueError, match="not supported"):
        builder.set_rule_source_group_remote("forward", 10, "RG", False)
    assert builder.get_operations() == []


def test_prerouting_raw_generic_rule_rejected_on_1_4():
    builder = FirewallFamilyBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_rule_action("prerouting_raw", 10, "drop", False)
    assert builder.get_operations() == []


def test_zone_path_follows_the_mapper_allowlist(monkeypatch):
    """Path methods must follow the same set the capability flag reads."""
    monkeypatch.setattr(
        FirewallZonesMapper,
        "supported_zone_nodes",
        lambda self: frozenset({"interface"}),
    )
    builder = FirewallZonesBatchBuilder(version="1.5")
    builder.set_zone_interface("LAN", "eth1")
    assert builder.get_operations()[0]["path"] == ["firewall", "zone", "LAN", "interface", "eth1"]
    builder.clear()
    with pytest.raises(ValueError, match="not supported"):
        builder.delete_zone_default_firewall_name("LAN")
    assert builder.get_operations() == []


def test_zone_delete_paths_raise_on_the_other_version():
    builder = FirewallZonesBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.delete_zone_default_firewall_name("LAN")
    assert builder.get_operations() == []
    from vyos_mappers.firewall.zones_versions import get_firewall_zones_mapper
    with pytest.raises(ValueError, match="not supported"):
        get_firewall_zones_mapper("1.5").get_zone_interface_path("LAN")
    with pytest.raises(ValueError, match="not supported"):
        get_firewall_zones_mapper("1.4").get_zone_member_interface_path("LAN")


@pytest.mark.parametrize(
    "method, args",
    [
        ("set_rule_source_group_remote", ("forward", 10, "RG", False)),
        ("set_rule_gre_key", ("forward", 10, "1", False)),
        ("set_prerouting_raw_rule", (10,)),
        ("set_rule_ipsec_match_ipsec_in", ("forward", 10, False)),
    ],
)
def test_family_v15_nodes_rejected_on_1_4(method, args):
    builder = FirewallFamilyBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []
