"""Golden (method, args, op, expected_path) cases for NAT66BatchBuilder.

Every leaf below the group subtrees exists on VyOS 1.4 (100.64.64.4) and
rolling 1.5 (100.64.64.5). ``source group`` and ``destination group`` on both
rule types exist only on 1.5 (``find nat66 -name node.def`` diff) and commit
there; on 1.4 the builder raises ValueError.
"""

import inspect
import re
from pathlib import Path

import pytest

from vyos_builders.nat66 import NAT66BatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.nat66 import NAT66Mapper
from vyos_mappers.nat66.nat66_versions.v1_5 import NAT66MapperV1_5

BACKEND = Path(__file__).resolve().parents[1]
RULE = 100
S = ["nat66", "source", "rule", str(RULE)]
D = ["nat66", "destination", "rule", str(RULE)]

BOTH = [
    ("set_source_rule", (RULE,), "set", S),
    ("delete_source_rule", (RULE,), "delete", S),
    ("set_source_rule_description", (RULE, "v6 out"), "set", S + ["description", "v6 out"]),
    ("delete_source_rule_description", (RULE,), "delete", S + ["description"]),
    ("set_source_rule_disable", (RULE,), "set", S + ["disable"]),
    ("delete_source_rule_disable", (RULE,), "delete", S + ["disable"]),
    ("set_source_rule_exclude", (RULE,), "set", S + ["exclude"]),
    ("delete_source_rule_exclude", (RULE,), "delete", S + ["exclude"]),
    ("set_source_rule_log", (RULE,), "set", S + ["log"]),
    ("delete_source_rule_log", (RULE,), "delete", S + ["log"]),
    ("set_source_rule_protocol", (RULE, "tcp_udp"), "set", S + ["protocol", "tcp_udp"]),
    ("delete_source_rule_protocol", (RULE,), "delete", S + ["protocol"]),
    (
        "set_source_rule_outbound_interface_name",
        (RULE, "eth0"),
        "set",
        S + ["outbound-interface", "name", "eth0"],
    ),
    ("delete_source_rule_outbound_interface_name", (RULE,), "delete", S + ["outbound-interface"]),
    ("set_source_rule_source_prefix", (RULE, "fd00::/64"), "set", S + ["source", "prefix", "fd00::/64"]),
    ("delete_source_rule_source_prefix", (RULE,), "delete", S + ["source", "prefix"]),
    ("set_source_rule_source_port", (RULE, "1024-65535"), "set", S + ["source", "port", "1024-65535"]),
    ("delete_source_rule_source_port", (RULE,), "delete", S + ["source", "port"]),
    (
        "set_source_rule_destination_prefix",
        (RULE, "fd01::/64"),
        "set",
        S + ["destination", "prefix", "fd01::/64"],
    ),
    ("delete_source_rule_destination_prefix", (RULE,), "delete", S + ["destination", "prefix"]),
    ("set_source_rule_destination_port", (RULE, "443"), "set", S + ["destination", "port", "443"]),
    ("delete_source_rule_destination_port", (RULE,), "delete", S + ["destination", "port"]),
    (
        "set_source_rule_translation_address",
        (RULE, "masquerade"),
        "set",
        S + ["translation", "address", "masquerade"],
    ),
    ("delete_source_rule_translation_address", (RULE,), "delete", S + ["translation", "address"]),
    ("set_source_rule_translation_port", (RULE, "8080"), "set", S + ["translation", "port", "8080"]),
    ("delete_source_rule_translation_port", (RULE,), "delete", S + ["translation", "port"]),
    ("set_destination_rule", (RULE,), "set", D),
    ("delete_destination_rule", (RULE,), "delete", D),
    ("set_destination_rule_description", (RULE, "v6 in"), "set", D + ["description", "v6 in"]),
    ("delete_destination_rule_description", (RULE,), "delete", D + ["description"]),
    ("set_destination_rule_disable", (RULE,), "set", D + ["disable"]),
    ("delete_destination_rule_disable", (RULE,), "delete", D + ["disable"]),
    ("set_destination_rule_exclude", (RULE,), "set", D + ["exclude"]),
    ("delete_destination_rule_exclude", (RULE,), "delete", D + ["exclude"]),
    ("set_destination_rule_log", (RULE,), "set", D + ["log"]),
    ("delete_destination_rule_log", (RULE,), "delete", D + ["log"]),
    ("set_destination_rule_protocol", (RULE, "tcp"), "set", D + ["protocol", "tcp"]),
    ("delete_destination_rule_protocol", (RULE,), "delete", D + ["protocol"]),
    (
        "set_destination_rule_inbound_interface_name",
        (RULE, "eth1"),
        "set",
        D + ["inbound-interface", "name", "eth1"],
    ),
    ("delete_destination_rule_inbound_interface_name", (RULE,), "delete", D + ["inbound-interface"]),
    (
        "set_destination_rule_source_address",
        (RULE, "2001:db8::1"),
        "set",
        D + ["source", "address", "2001:db8::1"],
    ),
    ("delete_destination_rule_source_address", (RULE,), "delete", D + ["source", "address"]),
    ("set_destination_rule_source_port", (RULE, "53"), "set", D + ["source", "port", "53"]),
    ("delete_destination_rule_source_port", (RULE,), "delete", D + ["source", "port"]),
    (
        "set_destination_rule_destination_address",
        (RULE, "2001:db8::2"),
        "set",
        D + ["destination", "address", "2001:db8::2"],
    ),
    ("delete_destination_rule_destination_address", (RULE,), "delete", D + ["destination", "address"]),
    ("set_destination_rule_destination_port", (RULE, "80"), "set", D + ["destination", "port", "80"]),
    ("delete_destination_rule_destination_port", (RULE,), "delete", D + ["destination", "port"]),
    (
        "set_destination_rule_translation_address",
        (RULE, "fd00::10"),
        "set",
        D + ["translation", "address", "fd00::10"],
    ),
    ("delete_destination_rule_translation_address", (RULE,), "delete", D + ["translation", "address"]),
    ("set_destination_rule_translation_port", (RULE, "8080"), "set", D + ["translation", "port", "8080"]),
    ("delete_destination_rule_translation_port", (RULE,), "delete", D + ["translation", "port"]),
]

ONLY_1_5 = [
    (
        "set_source_rule_source_group",
        (RULE, "address-group", "T-A6"),
        "set",
        S + ["source", "group", "address-group", "T-A6"],
    ),
    ("delete_source_rule_source_group", (RULE, "address-group"), "delete", S + ["source", "group", "address-group"]),
    (
        "set_source_rule_destination_group",
        (RULE, "network-group", "T-N6"),
        "set",
        S + ["destination", "group", "network-group", "T-N6"],
    ),
    (
        "delete_source_rule_destination_group",
        (RULE, "network-group"),
        "delete",
        S + ["destination", "group", "network-group"],
    ),
    (
        "set_destination_rule_source_group",
        (RULE, "mac-group", "T-MAC"),
        "set",
        D + ["source", "group", "mac-group", "T-MAC"],
    ),
    (
        "delete_destination_rule_source_group",
        (RULE, "mac-group"),
        "delete",
        D + ["source", "group", "mac-group"],
    ),
    (
        "set_destination_rule_destination_group",
        (RULE, "port-group", "T-WEB"),
        "set",
        D + ["destination", "group", "port-group", "T-WEB"],
    ),
    (
        "delete_destination_rule_destination_group",
        (RULE, "port-group"),
        "delete",
        D + ["destination", "group", "port-group"],
    ),
    (
        "set_source_rule_source_group",
        (RULE, "domain-group", "T-D"),
        "set",
        S + ["source", "group", "domain-group", "T-D"],
    ),
    (
        "delete_destination_rule_source_group",
        (RULE, "domain-group"),
        "delete",
        D + ["source", "group", "domain-group"],
    ),
]

V1_4 = "1.4.3"
V1_5 = "2026.09.23-0027-rolling"
GROUP_TYPES = ["address-group", "domain-group", "mac-group", "network-group", "port-group"]


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


@pytest.mark.parametrize("method, args, op, expected_path", BOTH, ids=[c[0] for c in BOTH])
@pytest.mark.parametrize("version", [V1_4, V1_5])
def test_shared_paths(method, args, op, expected_path, version):
    builder = NAT66BatchBuilder(version=version)
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", ONLY_1_5, ids=[c[0] for c in ONLY_1_5])
def test_1_5_group_paths(method, args, op, expected_path):
    builder = NAT66BatchBuilder(version=V1_5)
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, expected_path)]


@pytest.mark.parametrize("method, args, _op, _path", ONLY_1_5, ids=[c[0] for c in ONLY_1_5])
def test_1_4_group_ops_raise_value_error(method, args, _op, _path):
    builder = NAT66BatchBuilder(version=V1_4)
    with pytest.raises(ValueError, match="is not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.is_empty()


@pytest.mark.parametrize("group_type", ["source-group", "address-group extra", ""])
def test_unknown_group_type_raises_value_error(group_type):
    builder = NAT66BatchBuilder(version=V1_5)
    with pytest.raises(ValueError, match="group type"):
        builder.set_source_rule_destination_group(RULE, group_type, "T-A6")
    assert builder.is_empty()


def test_every_builder_op_has_a_golden_row():
    ops = {
        name
        for name, _ in inspect.getmembers(NAT66BatchBuilder, inspect.isfunction)
        if re.match(r"(set|delete|create)_", name)
    }
    assert ops == {case[0] for case in BOTH + ONLY_1_5}


def test_capabilities_follow_the_allowlist_not_the_version_string(monkeypatch):
    caps_1_5 = NAT66BatchBuilder(V1_5).get_capabilities()
    caps_1_4 = NAT66BatchBuilder(V1_4).get_capabilities()
    assert "version_info" not in caps_1_5 and "version_info" not in caps_1_4
    assert caps_1_5["features"]["groups"] == {
        "supported": True,
        "description": "Firewall group matches on rule source and destination",
        "group_types": GROUP_TYPES,
    }
    assert caps_1_4["features"]["groups"]["supported"] is False
    assert caps_1_4["features"]["groups"]["group_types"] == []
    listed_1_5 = {op for group in caps_1_5["operations"].values() for op in group}
    listed_1_4 = {op for group in caps_1_4["operations"].values() for op in group}
    assert listed_1_5 == {case[0] for case in BOTH + ONLY_1_5}
    assert listed_1_4 == {case[0] for case in BOTH}
    assert caps_1_5["protocols"] == caps_1_4["protocols"]
    assert caps_1_5["protocols"][:2] == ["all", "tcp_udp"]
    assert {"tcp", "udp", "ipv6-icmp"} <= set(caps_1_5["protocols"])
    assert "icmpv6" not in caps_1_5["protocols"]

    # A 1.5 version string with the 1.4 mapper: the allowlist decides.
    monkeypatch.setattr(
        "vyos_builders.nat66.nat66_batch_builder.CommandMapperRegistry.get_mapper",
        lambda _feature, version: NAT66Mapper(version),
    )
    patched = NAT66BatchBuilder(V1_5)
    assert patched.get_capabilities()["features"]["groups"]["supported"] is False
    with pytest.raises(ValueError):
        patched.set_source_rule_destination_group(RULE, "address-group", "T-A6")


@pytest.mark.parametrize("version", [V1_4, "1.4", "1.4-rolling-202401"])
def test_registry_returns_the_shared_class_on_1_4(version):
    assert type(CommandMapperRegistry.get_mapper("nat66", version)) is NAT66Mapper


@pytest.mark.parametrize("version", [V1_5, "1.5", "1.5.0", "latest", "2025.11.05-0020-rolling"])
def test_registry_returns_the_1_5_subclass_otherwise(version):
    assert type(CommandMapperRegistry.get_mapper("nat66", version)) is NAT66MapperV1_5


def test_no_empty_1_4_version_file_and_no_short_builder_name():
    versions = BACKEND / "vyos_mappers" / "nat66" / "nat66_versions"
    assert not (versions / "v1_4.py").exists()
    assert not (BACKEND / "vyos_builders" / "nat66" / "nat66.py").exists()
    assert (BACKEND / "vyos_builders" / "nat66" / "nat66_batch_builder.py").exists()
