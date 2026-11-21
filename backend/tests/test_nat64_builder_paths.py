"""Golden (method, args, op, expected_path) cases for NAT64BatchBuilder.

Every leaf is under ``nat64 source rule <n>``; the template trees on VyOS 1.4
(100.64.64.4) and rolling 1.5 (100.64.64.5) are identical, so every row runs
on both versions.
"""

import inspect
import re
from pathlib import Path

import pytest

from vyos_builders.nat64 import NAT64BatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.nat64 import NAT64Mapper

BACKEND = Path(__file__).resolve().parents[1]
RULE = 100
POOL = 1
R = ["nat64", "source", "rule", str(RULE)]
P = R + ["translation", "pool", str(POOL)]

CASES = [
    ("set_source_rule", (RULE,), "set", R),
    ("delete_source_rule", (RULE,), "delete", R),
    ("set_source_rule_description", (RULE, "v6 to v4"), "set", R + ["description", "v6 to v4"]),
    ("delete_source_rule_description", (RULE,), "delete", R + ["description"]),
    ("set_source_rule_disable", (RULE,), "set", R + ["disable"]),
    ("delete_source_rule_disable", (RULE,), "delete", R + ["disable"]),
    ("set_source_rule_match_mark", (RULE, "10"), "set", R + ["match", "mark", "10"]),
    ("delete_source_rule_match_mark", (RULE,), "delete", R + ["match", "mark"]),
    (
        "set_source_rule_source_prefix",
        (RULE, "64:ff9b::/96"),
        "set",
        R + ["source", "prefix", "64:ff9b::/96"],
    ),
    ("delete_source_rule_source_prefix", (RULE,), "delete", R + ["source", "prefix"]),
    ("set_source_rule_translation_pool", (RULE, POOL), "set", P),
    ("delete_source_rule_translation_pool", (RULE, POOL), "delete", P),
    (
        "set_source_rule_translation_pool_address",
        (RULE, POOL, "203.0.113.0/24"),
        "set",
        P + ["address", "203.0.113.0/24"],
    ),
    ("delete_source_rule_translation_pool_address", (RULE, POOL), "delete", P + ["address"]),
    (
        "set_source_rule_translation_pool_description",
        (RULE, POOL, "pool one"),
        "set",
        P + ["description", "pool one"],
    ),
    (
        "delete_source_rule_translation_pool_description",
        (RULE, POOL),
        "delete",
        P + ["description"],
    ),
    ("set_source_rule_translation_pool_disable", (RULE, POOL), "set", P + ["disable"]),
    ("delete_source_rule_translation_pool_disable", (RULE, POOL), "delete", P + ["disable"]),
    (
        "set_source_rule_translation_pool_port",
        (RULE, POOL, "1024-65535"),
        "set",
        P + ["port", "1024-65535"],
    ),
    ("delete_source_rule_translation_pool_port", (RULE, POOL), "delete", P + ["port"]),
    ("set_source_rule_translation_pool_protocol_tcp", (RULE, POOL), "set", P + ["protocol", "tcp"]),
    (
        "delete_source_rule_translation_pool_protocol_tcp",
        (RULE, POOL),
        "delete",
        P + ["protocol", "tcp"],
    ),
    ("set_source_rule_translation_pool_protocol_udp", (RULE, POOL), "set", P + ["protocol", "udp"]),
    (
        "delete_source_rule_translation_pool_protocol_udp",
        (RULE, POOL),
        "delete",
        P + ["protocol", "udp"],
    ),
    (
        "set_source_rule_translation_pool_protocol_icmp",
        (RULE, POOL),
        "set",
        P + ["protocol", "icmp"],
    ),
    (
        "delete_source_rule_translation_pool_protocol_icmp",
        (RULE, POOL),
        "delete",
        P + ["protocol", "icmp"],
    ),
]

VERSIONS = ["1.4.3", "2026.09.23-0027-rolling"]


@pytest.mark.parametrize("method, args, op, expected_path", CASES, ids=[c[0] for c in CASES])
@pytest.mark.parametrize("version", VERSIONS)
def test_nat64_builder_paths(method, args, op, expected_path, version):
    builder = NAT64BatchBuilder(version=version)
    getattr(builder, method)(*args)
    ops = builder.get_operations()
    assert [(item["op"], item["path"]) for item in ops] == [(op, expected_path)]


def test_every_builder_op_has_a_golden_row():
    ops = {
        name
        for name, _ in inspect.getmembers(NAT64BatchBuilder, inspect.isfunction)
        if re.match(r"(set|delete|create)_", name)
    }
    assert ops == {case[0] for case in CASES}


def test_capabilities_list_every_op_and_no_version_string():
    caps = NAT64BatchBuilder("2026.09.23-0027-rolling").get_capabilities()
    assert "version_info" not in caps
    listed = {op for group in caps["operations"].values() for op in group}
    assert listed == {case[0] for case in CASES}


@pytest.mark.parametrize("version", VERSIONS + ["1.5", "latest"])
def test_registry_returns_the_shared_class(version):
    assert type(CommandMapperRegistry.get_mapper("nat64", version)) is NAT64Mapper


def test_no_version_package_and_no_short_builder_name():
    assert not (BACKEND / "vyos_mappers" / "nat64" / "nat64_versions").exists()
    assert not (BACKEND / "vyos_builders" / "nat64" / "nat64.py").exists()
    assert (BACKEND / "vyos_builders" / "nat64" / "nat64_batch_builder.py").exists()
