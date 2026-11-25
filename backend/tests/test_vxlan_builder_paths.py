"""VXLAN builder paths, version factory and capability allowlist.

``show version`` on the 1.5 lab (100.64.64.5) reports a rolling string
(``2026.09.23-0027-rolling``) and the 1.4 lab (100.64.64.4) reports
``VyOS 1.4.3``. The ``interfaces vxlan`` node.def lists match except for
``ipv6 address interface-identifier`` and ``vlan-to-vni <id> description``,
which exist only on 1.5. Those path methods live on the 1.5 subclass;
capabilities and builder ops read ``versioned_interface_nodes()``.
"""

import inspect
from pathlib import Path

import pytest

from vyos_builders.vxlan import VxlanBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.vxlan import VxlanMapper
from vyos_mappers.vxlan.vxlan_versions import get_vxlan_mapper
from vyos_mappers.vxlan.vxlan_versions.v1_5 import VxlanMapperV1_5

VERSIONS_DIR = Path(__file__).resolve().parents[1] / "vyos_mappers" / "vxlan" / "vxlan_versions"

NAME = "vxlan0"
BASE = ["interfaces", "vxlan", NAME]
ROLLING = "2026.09.23-0027-rolling"
V14_STRINGS = ["1.4", "1.4.3", "VyOS 1.4.3"]
V15_STRINGS = ["1.5", ROLLING, "latest", "1.6", ""]


def _flag(method, *leaf):
    """A valueless leaf: set and delete share the path."""
    op = "set" if method.startswith("set_") else "delete"
    return (method, (NAME,), op, BASE + list(leaf))


def _value(method, value, *leaf):
    """A single-value leaf: set carries the value, delete drops it."""
    if method.startswith("set_"):
        return (method, (NAME, value), "set", BASE + list(leaf) + [value])
    return (method, (NAME,), "delete", BASE + list(leaf))


def _multi(method, value, *leaf):
    """A multi leaf: set and delete both name the value."""
    op = "set" if method.startswith("set_") else "delete"
    return (method, (NAME, value), op, BASE + list(leaf) + [value])


# Sample values are ones the lab val_help / allowed lines accept.
COMMON_CASES = [
    _flag("set_interface"),
    _flag("delete_interface"),
    _multi("set_address", "192.0.2.1/24", "address"),
    _multi("delete_address", "192.0.2.1/24", "address"),
    _flag("delete_all_addresses", "address"),
    _value("set_description", "overlay", "description"),
    _value("delete_description", "overlay", "description"),
    _flag("set_disable", "disable"),
    _flag("delete_disable", "disable"),
    _flag("set_gpe", "gpe"),
    _flag("delete_gpe", "gpe"),
    _value("set_group", "239.1.1.1", "group"),
    _value("delete_group", "239.1.1.1", "group"),
    _value("set_mac", "00:53:00:00:00:01", "mac"),
    _value("delete_mac", "00:53:00:00:00:01", "mac"),
    _value("set_mtu", "1450", "mtu"),
    _value("delete_mtu", "1450", "mtu"),
    _value("set_port", "4789", "port"),
    _value("delete_port", "4789", "port"),
    _value("set_redirect", "eth2", "redirect"),
    _value("delete_redirect", "eth2", "redirect"),
    _multi("set_remote", "192.0.2.10", "remote"),
    _multi("delete_remote", "192.0.2.10", "remote"),
    _flag("delete_all_remotes", "remote"),
    _value("set_source_address", "192.0.2.1", "source-address"),
    _value("delete_source_address", "192.0.2.1", "source-address"),
    _value("set_source_interface", "eth0", "source-interface"),
    _value("delete_source_interface", "eth0", "source-interface"),
    _value("set_vni", "100", "vni"),
    _value("delete_vni", "100", "vni"),
    _value("set_vrf", "blue", "vrf"),
    _value("delete_vrf", "blue", "vrf"),
    # ip
    _value("set_ip_adjust_mss", "clamp-mss-to-pmtu", "ip", "adjust-mss"),
    _value("delete_ip_adjust_mss", "1400", "ip", "adjust-mss"),
    _value("set_ip_arp_cache_timeout", "30", "ip", "arp-cache-timeout"),
    _value("delete_ip_arp_cache_timeout", "30", "ip", "arp-cache-timeout"),
    _flag("set_ip_disable_arp_filter", "ip", "disable-arp-filter"),
    _flag("delete_ip_disable_arp_filter", "ip", "disable-arp-filter"),
    _flag("set_ip_disable_forwarding", "ip", "disable-forwarding"),
    _flag("delete_ip_disable_forwarding", "ip", "disable-forwarding"),
    _flag("set_ip_enable_arp_accept", "ip", "enable-arp-accept"),
    _flag("delete_ip_enable_arp_accept", "ip", "enable-arp-accept"),
    _flag("set_ip_enable_arp_announce", "ip", "enable-arp-announce"),
    _flag("delete_ip_enable_arp_announce", "ip", "enable-arp-announce"),
    _flag("set_ip_enable_arp_ignore", "ip", "enable-arp-ignore"),
    _flag("delete_ip_enable_arp_ignore", "ip", "enable-arp-ignore"),
    _flag("set_ip_enable_directed_broadcast", "ip", "enable-directed-broadcast"),
    _flag("delete_ip_enable_directed_broadcast", "ip", "enable-directed-broadcast"),
    _flag("set_ip_enable_proxy_arp", "ip", "enable-proxy-arp"),
    _flag("delete_ip_enable_proxy_arp", "ip", "enable-proxy-arp"),
    _flag("set_ip_proxy_arp_pvlan", "ip", "proxy-arp-pvlan"),
    _flag("delete_ip_proxy_arp_pvlan", "ip", "proxy-arp-pvlan"),
    _value("set_ip_source_validation", "strict", "ip", "source-validation"),
    _value("delete_ip_source_validation", "strict", "ip", "source-validation"),
    # ipv6
    _value("set_ipv6_accept_dad", "1", "ipv6", "accept-dad"),
    _value("delete_ipv6_accept_dad", "1", "ipv6", "accept-dad"),
    _flag("set_ipv6_address_autoconf", "ipv6", "address", "autoconf"),
    _flag("delete_ipv6_address_autoconf", "ipv6", "address", "autoconf"),
    _multi("set_ipv6_address_eui64", "2001:db8:1::/64", "ipv6", "address", "eui64"),
    _multi("delete_ipv6_address_eui64", "2001:db8:1::/64", "ipv6", "address", "eui64"),
    _flag("delete_all_ipv6_address_eui64", "ipv6", "address", "eui64"),
    _flag("set_ipv6_address_no_default_link_local", "ipv6", "address", "no-default-link-local"),
    _flag("delete_ipv6_address_no_default_link_local", "ipv6", "address", "no-default-link-local"),
    _value("set_ipv6_adjust_mss", "1400", "ipv6", "adjust-mss"),
    _value("delete_ipv6_adjust_mss", "1400", "ipv6", "adjust-mss"),
    _value("set_ipv6_base_reachable_time", "30", "ipv6", "base-reachable-time"),
    _value("delete_ipv6_base_reachable_time", "30", "ipv6", "base-reachable-time"),
    _flag("set_ipv6_disable_forwarding", "ipv6", "disable-forwarding"),
    _flag("delete_ipv6_disable_forwarding", "ipv6", "disable-forwarding"),
    _value("set_ipv6_dup_addr_detect_transmits", "1", "ipv6", "dup-addr-detect-transmits"),
    _value("delete_ipv6_dup_addr_detect_transmits", "1", "ipv6", "dup-addr-detect-transmits"),
    _value("set_ipv6_source_validation", "loose", "ipv6", "source-validation"),
    _value("delete_ipv6_source_validation", "loose", "ipv6", "source-validation"),
    # mirror
    _value("set_mirror_egress", "eth1", "mirror", "egress"),
    _value("delete_mirror_egress", "eth1", "mirror", "egress"),
    _value("set_mirror_ingress", "eth1", "mirror", "ingress"),
    _value("delete_mirror_ingress", "eth1", "mirror", "ingress"),
    # parameters
    _flag("set_parameters_external", "parameters", "external"),
    _flag("delete_parameters_external", "parameters", "external"),
    _value("set_parameters_ip_df", "set", "parameters", "ip", "df"),
    _value("delete_parameters_ip_df", "set", "parameters", "ip", "df"),
    _value("set_parameters_ip_tos", "10", "parameters", "ip", "tos"),
    _value("delete_parameters_ip_tos", "10", "parameters", "ip", "tos"),
    _value("set_parameters_ip_ttl", "64", "parameters", "ip", "ttl"),
    _value("delete_parameters_ip_ttl", "64", "parameters", "ip", "ttl"),
    _value("set_parameters_ipv6_flowlabel", "inherit", "parameters", "ipv6", "flowlabel"),
    _value("delete_parameters_ipv6_flowlabel", "inherit", "parameters", "ipv6", "flowlabel"),
    _flag("set_parameters_neighbor_suppress", "parameters", "neighbor-suppress"),
    _flag("delete_parameters_neighbor_suppress", "parameters", "neighbor-suppress"),
    _flag("set_parameters_nolearning", "parameters", "nolearning"),
    _flag("delete_parameters_nolearning", "parameters", "nolearning"),
    _flag("set_parameters_vni_filter", "parameters", "vni-filter"),
    _flag("delete_parameters_vni_filter", "parameters", "vni-filter"),
    # vlan-to-vni
    ("set_vlan_to_vni", (NAME, "10"), "set", BASE + ["vlan-to-vni", "10"]),
    ("delete_vlan_to_vni", (NAME, "10"), "delete", BASE + ["vlan-to-vni", "10"]),
    _flag("delete_all_vlan_to_vni", "vlan-to-vni"),
    ("set_vlan_to_vni_vni", (NAME, "10-20", "1010-1020"), "set",
     BASE + ["vlan-to-vni", "10-20", "vni", "1010-1020"]),
    ("delete_vlan_to_vni_vni", (NAME, "10"), "delete", BASE + ["vlan-to-vni", "10", "vni"]),
]

V15_ONLY_CASES = [
    ("set_ipv6_address_interface_identifier", (NAME, "::1:2"), "set",
     BASE + ["ipv6", "address", "interface-identifier", "::1:2"]),
    ("delete_ipv6_address_interface_identifier", (NAME,), "delete",
     BASE + ["ipv6", "address", "interface-identifier"]),
    ("set_vlan_to_vni_description", (NAME, "10", "ten: tenants|blue"), "set",
     BASE + ["vlan-to-vni", "10", "description", "ten: tenants|blue"]),
    ("delete_vlan_to_vni_description", (NAME, "10"), "delete",
     BASE + ["vlan-to-vni", "10", "description"]),
]

V15_NODES = frozenset({"ipv6_address_interface_identifier", "vlan_to_vni_description"})


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


def _case_id(row):
    return row[0]


@pytest.mark.parametrize("version", ["1.4.3", ROLLING])
@pytest.mark.parametrize("method, args, op, path", COMMON_CASES, ids=_case_id)
def test_common_ops_emit_on_both_versions(version, method, args, op, path):
    builder = VxlanBatchBuilder(version=version)
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, path)]


@pytest.mark.parametrize("method, args, op, path", V15_ONLY_CASES, ids=_case_id)
def test_v15_only_ops_emit_on_rolling(method, args, op, path):
    builder = VxlanBatchBuilder(version=ROLLING)
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, path)]


@pytest.mark.parametrize("method, args, op, path", V15_ONLY_CASES, ids=_case_id)
def test_v15_only_ops_rejected_on_1_4(method, args, op, path):
    builder = VxlanBatchBuilder(version="1.4.3")
    with pytest.raises(ValueError, match="is not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


def test_every_builder_op_has_a_golden_row():
    ops = {
        name
        for name, _ in inspect.getmembers(VxlanBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    }
    rows = [row[0] for row in COMMON_CASES + V15_ONLY_CASES]
    assert len(rows) == len(set(rows))
    assert ops == set(rows)


@pytest.mark.parametrize("version", V14_STRINGS)
def test_v14_string_gets_the_shared_class(version):
    mapper = get_vxlan_mapper(version)
    assert type(mapper) is VxlanMapper
    assert type(CommandMapperRegistry.get_mapper("vxlan", version)) is VxlanMapper
    assert mapper.versioned_interface_nodes() == frozenset()
    assert not hasattr(mapper, "get_ipv6_address_interface_identifier")
    assert not hasattr(mapper, "get_vlan_to_vni_description")


@pytest.mark.parametrize("version", V15_STRINGS)
def test_other_strings_get_the_v15_class(version):
    mapper = get_vxlan_mapper(version)
    assert type(mapper) is VxlanMapperV1_5
    assert type(CommandMapperRegistry.get_mapper("vxlan", version)) is VxlanMapperV1_5
    assert mapper.versioned_interface_nodes() == V15_NODES
    assert mapper.version == version


def test_mapper_classes_keep_the_base_init():
    assert "__init__" not in vars(VxlanMapper)
    assert "__init__" not in vars(VxlanMapperV1_5)


def test_no_v14_version_file():
    assert (VERSIONS_DIR / "__init__.py").is_file()
    assert (VERSIONS_DIR / "v1_5.py").is_file()
    assert not (VERSIONS_DIR / "v1_4.py").exists()


def test_parse_config_lives_on_the_shared_class():
    assert "parse_config" in vars(VxlanMapper)
    tree = {"interfaces": {"vxlan": {NAME: {"vni": "100"}}}}
    assert get_vxlan_mapper("1.4.3").parse_config(tree)["interfaces"][0]["vni"] == "100"
    assert get_vxlan_mapper(ROLLING).parse_config(tree)["interfaces"][0]["vni"] == "100"


@pytest.mark.parametrize(
    "version, supported", [("1.4.3", False), (ROLLING, True), ("1.5", True)]
)
def test_capabilities_follow_the_mapper(version, supported):
    features = VxlanBatchBuilder(version=version).get_capabilities()["features"]
    assert features["ipv6_address_interface_identifier"]["supported"] is supported
    assert features["vlan_to_vni_description"]["supported"] is supported


def test_capabilities_have_no_version_info():
    caps = VxlanBatchBuilder(version=ROLLING).get_capabilities()
    assert "version_info" not in caps


@pytest.mark.parametrize(
    "removed, flag, kept",
    [
        ("get_ipv6_address_interface_identifier", "ipv6_address_interface_identifier", "vlan_to_vni_description"),
        ("get_vlan_to_vni_description", "vlan_to_vni_description", "ipv6_address_interface_identifier"),
    ],
)
def test_capabilities_read_the_allowlist_not_the_version(monkeypatch, removed, flag, kept):
    """A rolling device whose mapper lacks the path reports the flag off and rejects the op."""
    monkeypatch.delattr(VxlanMapperV1_5, removed)
    builder = VxlanBatchBuilder(version=ROLLING)
    features = builder.get_capabilities()["features"]
    assert features[flag]["supported"] is False
    assert features[kept]["supported"] is True
    method = next(row for row in V15_ONLY_CASES if row[0] == "set_" + flag)
    with pytest.raises(ValueError, match="is not supported on this device"):
        getattr(builder, method[0])(*method[1])


def test_capabilities_turn_on_when_the_1_4_mapper_gains_the_path(monkeypatch):
    for method in ("get_vlan_to_vni_description", "get_vlan_to_vni_description_path"):
        monkeypatch.setattr(VxlanMapper, method, getattr(VxlanMapperV1_5, method), raising=False)
    features = VxlanBatchBuilder(version="1.4.3").get_capabilities()["features"]
    assert features["vlan_to_vni_description"]["supported"] is True
    assert features["ipv6_address_interface_identifier"]["supported"] is False


@pytest.mark.parametrize(
    "removed",
    ["get_ipv6_address_interface_identifier_path", "get_vlan_to_vni_description_path"],
)
def test_node_needs_every_path_method(monkeypatch, removed):
    """A node with a set path but no delete path is not advertised."""
    monkeypatch.delattr(VxlanMapperV1_5, removed)
    nodes = get_vxlan_mapper(ROLLING).versioned_interface_nodes()
    assert len(nodes) == 1
    assert removed.replace("get_", "").replace("_path", "") not in nodes
