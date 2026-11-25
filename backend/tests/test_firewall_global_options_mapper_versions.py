"""Firewall global-options mapper version wiring (issue #1399).

The factory returns the shared FirewallGlobalOptionsMapper on 1.4 and the
1.5 subclass for every other string, including a rolling build. The builder
and capabilities read the mapper allowlist (versioned_nodes), not the version.
"""

from pathlib import Path

import pytest

from vyos_builders.firewall_global_options.firewall_global_options_batch_builder import (
    FirewallGlobalOptionsBatchBuilder,
)
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.firewall_global_options.firewall_global_options import FirewallGlobalOptionsMapper
from vyos_mappers.firewall_global_options.firewall_global_options_versions import (
    FirewallGlobalOptionsMapperV1_5,
    get_firewall_global_options_mapper,
)

ROLLING = "2026.09.23-0027-rolling"
VERSIONS_DIR = (
    Path(__file__).resolve().parents[1]
    / "vyos_mappers"
    / "firewall_global_options"
    / "firewall_global_options_versions"
)
ALL_NODES = {"apply-to-bridged-traffic", "geoip", "state-policy offload", "timeout"}


@pytest.mark.parametrize("version", ["1.4", "1.4.3"])
def test_1_4_gets_the_shared_class(version):
    mapper = get_firewall_global_options_mapper(version)
    assert type(mapper) is FirewallGlobalOptionsMapper
    assert mapper.versioned_nodes() == frozenset()
    assert mapper.geoip_provider_values() == ()
    assert mapper.bridged_ethernet_type_values() == ()


@pytest.mark.parametrize("version", ["1.5", "1.5.0", "latest", ROLLING])
def test_every_other_version_gets_the_subclass(version):
    mapper = get_firewall_global_options_mapper(version)
    assert type(mapper) is FirewallGlobalOptionsMapperV1_5
    assert mapper.versioned_nodes() == ALL_NODES


def test_registry_uses_the_factory():
    assert type(CommandMapperRegistry.get_mapper("firewall_global_options", ROLLING)) is FirewallGlobalOptionsMapperV1_5
    assert type(CommandMapperRegistry.get_mapper("firewall_global_options", "1.4.3")) is FirewallGlobalOptionsMapper


def test_versions_package_has_no_1_4_file():
    names = sorted(path.name for path in VERSIONS_DIR.glob("*.py"))
    assert names == ["__init__.py", "v1_5.py"]


def test_shared_class_has_no_1_5_only_paths():
    for methods in FirewallGlobalOptionsMapper._VERSIONED_NODES.values():
        for method in methods:
            assert not hasattr(FirewallGlobalOptionsMapper, method), method
            assert callable(getattr(FirewallGlobalOptionsMapperV1_5, method)), method


@pytest.mark.parametrize(
    "node, flag, op, args",
    [
        ("apply-to-bridged-traffic", "bridged_traffic", "set_apply_to_bridged_traffic_ipv4", ()),
        ("geoip", "geoip", "set_geoip_provider", ("db-ip",)),
        ("state-policy offload", "state_policy_offload", "delete_state_policy_offload", ()),
        ("timeout", "timeouts", "set_timeout_tcp_close", ("10",)),
    ],
)
def test_removing_a_path_turns_off_the_flag_and_the_op(monkeypatch, node, flag, op, args):
    """The allowlist, not the version string, decides the flag and the gate."""
    builder = FirewallGlobalOptionsBatchBuilder(version=ROLLING)
    assert builder.get_capabilities()["features"][flag]["supported"] is True

    monkeypatch.delattr(FirewallGlobalOptionsMapperV1_5, FirewallGlobalOptionsMapper._VERSIONED_NODES[node][-1])
    builder = FirewallGlobalOptionsBatchBuilder(version=ROLLING)
    assert builder.get_capabilities()["features"][flag]["supported"] is False
    with pytest.raises(ValueError, match=f"firewall global-options {node} is not supported on this device"):
        getattr(builder, op)(*args)
    assert builder.get_operations() == []


def test_capabilities_carry_the_lab_value_lists_and_ranges():
    caps14 = FirewallGlobalOptionsBatchBuilder(version="1.4").get_capabilities()["features"]
    caps15 = FirewallGlobalOptionsBatchBuilder(version=ROLLING).get_capabilities()["features"]
    for features in (caps14, caps15):
        assert features["all_ping"]["values"] == ["enable", "disable"]
        assert features["source_validation"]["values"] == ["strict", "loose", "disable"]
        assert features["ipv6_source_validation"]["values"] == ["strict", "loose", "disable"]
        assert features["state_policy"]["actions"] == ["accept", "drop", "reject"]
        assert features["state_policy"]["log_levels"] == [
            "emerg", "alert", "crit", "err", "warn", "notice", "info", "debug",
        ]
        assert (features["resolver_interval"]["min"], features["resolver_interval"]["max"]) == (10, 3600)
        assert (features["timeouts"]["min"], features["timeouts"]["max"]) == (1, 21474836)
    assert caps14["geoip"]["providers"] == []
    assert caps14["bridged_traffic"]["ethernet_types"] == []
    assert caps15["geoip"]["providers"] == ["db-ip", "maxmind"]
    assert caps15["bridged_traffic"]["ethernet_types"] == [
        "arp", "dhcp", "pppoe", "802.1q", "802.1ad", "pppoe-discovery", "wol",
    ]
    for flag in ("bridged_traffic", "geoip", "state_policy_offload", "timeouts"):
        assert caps14[flag]["supported"] is False
        assert caps15[flag]["supported"] is True
