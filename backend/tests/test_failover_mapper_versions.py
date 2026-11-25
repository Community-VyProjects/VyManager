"""Failover mapper version wiring (issue #1399).

The factory returns the shared FailoverMapper on 1.4 and the 1.5 subclass
for every other string, including a rolling build. The builder and
capabilities read the mapper allowlist (versioned_nodes), not the version.
"""

from pathlib import Path

import pytest

from vyos_builders.failover.failover_batch_builder import FailoverBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.failover.failover import FailoverMapper
from vyos_mappers.failover.failover_versions import FailoverMapperV1_5, get_failover_mapper

ROLLING = "2026.09.23-0027-rolling"
VERSIONS_DIR = Path(__file__).resolve().parents[1] / "vyos_mappers" / "failover" / "failover_versions"
ALL_NODES = {"dhcp-interface", "check target interface", "check target vrf"}


@pytest.mark.parametrize("version", ["1.4", "1.4.3"])
def test_1_4_gets_the_shared_class(version):
    mapper = get_failover_mapper(version)
    assert type(mapper) is FailoverMapper
    assert mapper.versioned_nodes() == frozenset()


@pytest.mark.parametrize("version", ["1.5", "1.5.0", "latest", ROLLING])
def test_every_other_version_gets_the_subclass(version):
    mapper = get_failover_mapper(version)
    assert type(mapper) is FailoverMapperV1_5
    assert mapper.versioned_nodes() == ALL_NODES


def test_registry_uses_the_factory():
    assert type(CommandMapperRegistry.get_mapper("failover", ROLLING)) is FailoverMapperV1_5
    assert type(CommandMapperRegistry.get_mapper("failover", "1.4.3")) is FailoverMapper


def test_versions_package_has_no_1_4_file():
    names = sorted(path.name for path in VERSIONS_DIR.glob("*.py"))
    assert names == ["__init__.py", "v1_5.py"]


def test_shared_class_has_no_1_5_only_paths():
    for methods in FailoverMapper._VERSIONED_NODES.values():
        for method in methods:
            assert not hasattr(FailoverMapper, method), method
            assert callable(getattr(FailoverMapperV1_5, method)), method


@pytest.mark.parametrize(
    "node, flag, op, args",
    [
        ("dhcp-interface", "dhcp_interface", "set_dhcp_interface", ("10.0.0.0/8", "eth2")),
        (
            "check target interface",
            "check_target_interface",
            "set_next_hop_check_target_interface",
            ("10.0.0.0/8", "192.0.2.1", "203.0.113.5", "eth1"),
        ),
        (
            "check target vrf",
            "check_target_vrf",
            "delete_next_hop_check_target_vrf",
            ("10.0.0.0/8", "192.0.2.1", "203.0.113.5"),
        ),
    ],
)
def test_removing_a_path_turns_off_the_flag_and_the_op(monkeypatch, node, flag, op, args):
    """The allowlist, not the version string, decides the flag and the gate."""
    builder = FailoverBatchBuilder(version=ROLLING)
    assert builder.get_capabilities()["features"][flag]["supported"] is True

    monkeypatch.delattr(FailoverMapperV1_5, FailoverMapper._VERSIONED_NODES[node][-1])
    builder = FailoverBatchBuilder(version=ROLLING)
    assert builder.get_capabilities()["features"][flag]["supported"] is False
    with pytest.raises(ValueError, match=f"failover {node} is not supported on this device"):
        getattr(builder, op)(*args)
    assert builder.get_operations() == []


def test_capabilities_have_no_version_info():
    for version in ("1.4", ROLLING):
        caps = FailoverBatchBuilder(version=version).get_capabilities()
        assert "version_info" not in caps
