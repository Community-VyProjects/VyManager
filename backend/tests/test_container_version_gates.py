"""Container path existence lives on the mapper, not a builder version sniff."""

import pytest

from vyos_builders.container.container_batch_builder import ContainerBatchBuilder
from vyos_mappers.container.container_versions import get_container_mapper


def test_health_check_and_network_mac_are_gone():
    mapper = get_container_mapper("1.5")
    assert not hasattr(mapper, "get_name_health_check")
    assert not hasattr(mapper, "get_name_network_mac")
    features = ContainerBatchBuilder(version="1.5").get_capabilities()["features"]
    assert "health_check" not in features
    assert "network_attachment_mac" not in features


@pytest.mark.parametrize(
    "method,args",
    [
        ("get_name_log_driver", ("web", "journald")),
        ("get_name_tmpfs", ("web", "cache")),
        ("get_name_tmpfs_destination", ("web", "cache", "/tmp")),
        ("get_name_tmpfs_size", ("web", "cache", "64")),
        ("get_registry_insecure", ("ghcr.io",)),
        ("get_registry_mirror", ("ghcr.io",)),
        ("get_registry_mirror_address", ("ghcr.io", "1.1.1.1")),
        ("get_network_gateway", ("lan", "10.0.0.1")),
        ("get_network_mtu", ("lan", "1500")),
        ("get_network_type_bridge", ("lan",)),
        ("get_network_type_macvlan", ("lan",)),
        ("get_network_type_macvlan_mode", ("lan", "bridge")),
        ("get_network_type_macvlan_parent", ("lan", "eth0")),
    ],
)
def test_v14_rejects_15_only_set_paths(method, args):
    mapper = get_container_mapper("1.4")
    with pytest.raises(ValueError, match="not supported"):
        getattr(mapper, method)(*args)


@pytest.mark.parametrize(
    "method,args",
    [
        ("get_name_log_driver_delete", ("web",)),
        ("get_name_tmpfs_delete", ("web", "cache")),
        ("get_registry_insecure_delete", ("ghcr.io",)),
        ("get_registry_mirror_delete", ("ghcr.io",)),
        ("get_network_gateway_delete", ("lan", "10.0.0.1")),
        ("get_network_mtu_delete", ("lan",)),
        ("get_network_type_delete", ("lan",)),
    ],
)
def test_v14_delete_helpers_stay_unguarded(method, args):
    mapper = get_container_mapper("1.4")
    path = getattr(mapper, method)(*args)
    assert path[0] == "container"


def test_v15_emits_15_only_set_paths():
    mapper = get_container_mapper("1.5")
    assert mapper.get_name_log_driver("web", "journald")[-2:] == ["log-driver", "journald"]
    assert mapper.get_name_tmpfs("web", "cache")[-2:] == ["tmpfs", "cache"]
    assert mapper.get_registry_insecure("ghcr.io")[-1] == "insecure"
    assert mapper.get_network_gateway("lan", "10.0.0.1")[-2:] == ["gateway", "10.0.0.1"]


def test_capabilities_read_mapper_flags():
    f14 = ContainerBatchBuilder(version="1.4").get_capabilities()["features"]
    f15 = ContainerBatchBuilder(version="1.5").get_capabilities()["features"]
    for key in (
        "log_driver",
        "tmpfs",
        "registry_insecure",
        "registry_mirror",
        "network_gateway",
        "network_mtu",
        "network_type_bridge",
        "network_type_macvlan",
    ):
        assert f14[key]["supported"] is False, key
        assert f15[key]["supported"] is True, key
