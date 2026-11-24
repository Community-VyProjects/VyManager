"""Container 1.5-only leaves: subclass and allowlist, not a version string.

The factory returns the shared ``ContainerMapper`` on 1.4 and
``ContainerMapperV1_5`` elsewhere (a rolling string is 1.5). The 1.5-only
path methods live only on the subclass, ``versioned_nodes()`` reports the
nodes whose methods are all present, and the builder's capabilities and gates
read that set.
"""

import inspect
import re
from pathlib import Path

import pytest

from vyos_builders.container.container_batch_builder import ContainerBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.container.container import ContainerMapper
from vyos_mappers.container.container_versions import ContainerMapperV1_5, get_container_mapper

VERSIONS_DIR = Path(inspect.getfile(ContainerMapperV1_5)).parent

ROLLING = "2026.09.23-0027-rolling"
ALL_NODES = set(ContainerMapper._VERSIONED_NODES)


@pytest.mark.parametrize("version", ["1.4", "1.4.3"])
def test_factory_returns_the_shared_class_on_14(version):
    mapper = get_container_mapper(version)
    assert type(mapper) is ContainerMapper
    assert mapper.versioned_nodes() == frozenset()


@pytest.mark.parametrize("version", ["1.5", ROLLING, "latest"])
def test_factory_returns_the_subclass_elsewhere(version):
    mapper = get_container_mapper(version)
    assert type(mapper) is ContainerMapperV1_5
    assert mapper.versioned_nodes() == ALL_NODES


def test_registry_serves_the_factory():
    assert type(CommandMapperRegistry.get_mapper("container", "1.4")) is ContainerMapper
    assert type(CommandMapperRegistry.get_mapper("container", ROLLING)) is ContainerMapperV1_5


def test_versioned_methods_live_only_on_the_subclass():
    for node, methods in ContainerMapper._VERSIONED_NODES.items():
        for method in methods:
            assert method not in vars(ContainerMapper), (node, method)
            assert method in vars(ContainerMapperV1_5), (node, method)


def test_versions_package_has_no_14_file():
    files = {p.name for p in VERSIONS_DIR.glob("*.py")}
    assert files == {"__init__.py", "v1_5.py"}


def test_no_merge_proxy_or_version_string_in_the_mapper():
    source = VERSIONS_DIR.parent.joinpath("container.py").read_text()
    assert "__getattr__" not in source
    assert '"1.4"' not in source
    assert not re.search(r"self\.version\b", source)


@pytest.mark.parametrize("node", sorted(ALL_NODES))
def test_capability_flag_and_gate_follow_the_allowlist(monkeypatch, node):
    """Removing one method under a node turns its flag off and its gate on."""
    method = ContainerMapper._VERSIONED_NODES[node][0]
    monkeypatch.delattr(ContainerMapperV1_5, method)
    builder = ContainerBatchBuilder(version="1.5")
    features = builder.get_capabilities()["features"]
    assert features[node] is False
    others = ALL_NODES - {node}
    assert all(features[other] is True for other in others)
    with pytest.raises(ValueError, match=f"container {node} is not supported on this device"):
        builder._versioned_path(node, method)


@pytest.mark.parametrize("version", ["1.4", "1.4.3"])
def test_capabilities_on_14(version):
    caps = ContainerBatchBuilder(version=version).get_capabilities()
    assert "version_info" not in caps
    assert caps["features"] == {node: False for node in ALL_NODES}
    values = caps["values"]
    assert values["capabilities"] == [
        "net-admin", "net-bind-service", "net-raw", "mknod", "setpcap",
        "sys-admin", "sys-module", "sys-nice", "sys-time",
    ]
    assert values["log_drivers"] == []
    assert values["network_types"] == []
    assert values["macvlan_modes"] == []
    assert values["registry_password_max_length"] == 128


@pytest.mark.parametrize("version", ["1.5", ROLLING])
def test_capabilities_on_15(version):
    caps = ContainerBatchBuilder(version=version).get_capabilities()
    assert "version_info" not in caps
    assert caps["features"] == {node: True for node in ALL_NODES}
    values = caps["values"]
    assert values["capabilities"] == [
        "net-admin", "net-bind-service", "net-raw", "chown", "mknod", "setpcap",
        "sys-admin", "sys-module", "sys-nice", "sys-rawio", "sys-time",
    ]
    assert values["log_drivers"] == ["k8s-file", "journald", "none"]
    assert values["network_types"] == ["bridge", "macvlan"]
    assert values["macvlan_modes"] == ["bridge", "private", "vepa"]
    assert values["registry_password_max_length"] == 512


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_shared_value_lists(version):
    values = ContainerBatchBuilder(version=version).get_capabilities()["values"]
    assert values["restart_policies"] == ["no", "on-failure", "always"]
    assert values["port_protocols"] == ["tcp", "udp"]
    assert values["volume_modes"] == ["ro", "rw"]
    assert values["volume_propagations"] == ["shared", "slave", "private", "rshared", "rslave", "rprivate"]
