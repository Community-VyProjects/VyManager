"""High-availability mapper factory and 1.5-only leaves.

``high-availability vrrp group|sync-group NAME health-check timeout`` and
``high-availability vrrp snmp trap`` only exist on the 1.5 lab. The shared
class must not define them; the 1.5 subclass does. A rolling version string
is 1.5.
"""

import pytest

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.high_availability import HighAvailabilityMapper, get_high_availability_mapper
from vyos_mappers.high_availability.high_availability_versions import HighAvailabilityMapperV1_5

V15_ONLY_METHODS = [
    "get_vrrp_group_health_check_timeout_path",
    "get_vrrp_sync_group_health_check_timeout_path",
    "get_vrrp_snmp_trap_path",
]


@pytest.mark.parametrize("version,cls", [
    ("1.4", HighAvailabilityMapper),
    ("1.4.3", HighAvailabilityMapper),
    ("1.5", HighAvailabilityMapperV1_5),
    ("2025.11.01-0019-rolling", HighAvailabilityMapperV1_5),
])
def test_factory_returns_the_version_class(version, cls):
    mapper = get_high_availability_mapper(version)
    assert type(mapper) is cls
    assert type(CommandMapperRegistry.get_mapper("high_availability", version)) is cls


@pytest.mark.parametrize("name", V15_ONLY_METHODS)
def test_shared_class_has_no_v15_only_paths(name):
    assert not hasattr(HighAvailabilityMapper("1.4"), name)


def test_versioned_nodes_follow_the_subclass():
    assert HighAvailabilityMapper("1.4").versioned_nodes() == frozenset()
    assert HighAvailabilityMapperV1_5("1.5").versioned_nodes() == frozenset({
        "vrrp group health-check timeout",
        "vrrp sync-group health-check timeout",
        "vrrp snmp trap",
    })


def test_require_node_raises_on_1_4():
    with pytest.raises(ValueError, match="vrrp snmp trap is not supported on this device"):
        HighAvailabilityMapper("1.4").require_node("vrrp snmp trap")
    HighAvailabilityMapperV1_5("1.5").require_node("vrrp snmp trap")


def test_v15_paths():
    mapper = HighAvailabilityMapperV1_5("1.5")
    assert mapper.get_vrrp_group_health_check_timeout_path("G0", "5") == [
        "high-availability", "vrrp", "group", "G0", "health-check", "timeout", "5",
    ]
    assert mapper.get_vrrp_sync_group_health_check_timeout_path("S0", "5") == [
        "high-availability", "vrrp", "sync-group", "S0", "health-check", "timeout", "5",
    ]
    assert mapper.get_vrrp_snmp_trap_path() == ["high-availability", "vrrp", "snmp", "trap"]


def test_v1_4_version_file_is_gone():
    import inspect
    from pathlib import Path

    package = Path(inspect.getfile(HighAvailabilityMapperV1_5)).parent
    files = {path.name for path in package.glob("*.py")}
    assert files == {"__init__.py", "v1_5.py"}
