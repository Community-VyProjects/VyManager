"""VRRP health-check timeout and SNMP trap version gating (issue #712).

``high-availability vrrp group|sync-group NAME health-check timeout`` and
``high-availability vrrp snmp trap`` only exist from VyOS 1.5. The 1.4
mapper must refuse those paths (raise, mapped to HTTP 400) instead of
emitting a command the device rejects at commit. 1.5 still emits them, and
get_capabilities gates both features on version.
"""

import pytest

from vyos_mappers.high_availability import HighAvailabilityMapper
from vyos_mappers.high_availability.high_availability_versions import (
    get_high_availability_mapper,
)
from vyos_builders.high_availability import HighAvailabilityBatchBuilder


V15_ONLY_METHODS = [
    ("get_vrrp_group_health_check_timeout_path", ("G0", "5")),
    ("get_vrrp_sync_group_health_check_timeout_path", ("S0", "5")),
    ("get_vrrp_snmp_trap_path", ()),
]


@pytest.mark.parametrize("name,args", V15_ONLY_METHODS)
def test_base_mapper_emits_v15_paths(name, args):
    mapper = HighAvailabilityMapper("1.5")
    path = getattr(mapper, name)(*args)
    assert path[0] == "high-availability"


@pytest.mark.parametrize("name,args", V15_ONLY_METHODS)
def test_v14_rejects_v15_only_paths(name, args):
    mapper = get_high_availability_mapper("1.4")
    with pytest.raises(ValueError, match="1.5"):
        getattr(mapper, name)(*args)


@pytest.mark.parametrize("name,args", V15_ONLY_METHODS)
def test_v15_still_emits_v15_only_paths(name, args):
    mapper = get_high_availability_mapper("1.5")
    path = getattr(mapper, name)(*args)
    assert path[0] == "high-availability"


def test_v15_group_health_check_timeout_path():
    mapper = get_high_availability_mapper("1.5")
    assert mapper.get_vrrp_group_health_check_timeout_path("G0", "5") == [
        "high-availability", "vrrp", "group", "G0", "health-check", "timeout", "5",
    ]


def test_v15_sync_group_health_check_timeout_path():
    mapper = get_high_availability_mapper("1.5")
    assert mapper.get_vrrp_sync_group_health_check_timeout_path("S0", "5") == [
        "high-availability", "vrrp", "sync-group", "S0", "health-check", "timeout", "5",
    ]


def test_v15_snmp_trap_path():
    mapper = get_high_availability_mapper("1.5")
    assert mapper.get_vrrp_snmp_trap_path() == [
        "high-availability", "vrrp", "snmp", "trap",
    ]


def test_builder_v14_group_timeout_raises():
    builder = HighAvailabilityBatchBuilder("1.4")
    with pytest.raises(ValueError, match="1.5"):
        builder.set_vrrp_group_health_check_timeout("G0", "5")


def test_builder_v14_snmp_trap_raises():
    builder = HighAvailabilityBatchBuilder("1.4")
    with pytest.raises(ValueError, match="1.5"):
        builder.set_vrrp_snmp_trap("")


def test_builder_v15_group_timeout_emits_set():
    builder = HighAvailabilityBatchBuilder("1.5")
    builder.set_vrrp_group_health_check_timeout("G0", "5")
    ops = builder.get_operations()
    assert ops == [{
        "op": "set",
        "path": ["high-availability", "vrrp", "group", "G0", "health-check", "timeout", "5"],
    }]


def test_builder_v15_snmp_trap_emits_set_and_delete():
    builder = HighAvailabilityBatchBuilder("1.5")
    builder.set_vrrp_snmp_trap("")
    builder.delete_vrrp_snmp_trap("")
    ops = builder.get_operations()
    assert ops == [
        {"op": "set", "path": ["high-availability", "vrrp", "snmp", "trap"]},
        {"op": "delete", "path": ["high-availability", "vrrp", "snmp", "trap"]},
    ]


def test_capabilities_gate_features_on_version():
    caps_14 = HighAvailabilityBatchBuilder("1.4").get_capabilities()["features"]
    caps_15 = HighAvailabilityBatchBuilder("1.5").get_capabilities()["features"]
    assert caps_14["vrrp_snmp_trap"]["supported"] is False
    assert caps_14["health_check_timeout"]["supported"] is False
    assert caps_15["vrrp_snmp_trap"]["supported"] is True
    assert caps_15["health_check_timeout"]["supported"] is True


def test_parse_config_surfaces_timeout_and_trap():
    mapper = HighAvailabilityMapper("1.5")
    parsed = mapper.parse_config({
        "high-availability": {
            "vrrp": {
                "snmp": {"trap": {}},
                "group": {
                    "G0": {"health-check": {"timeout": "5", "interval": "10"}},
                },
                "sync-group": {
                    "S0": {"health-check": {"timeout": "7"}},
                },
            },
        },
    })
    assert parsed["vrrp"]["snmp"] is True
    assert parsed["vrrp"]["snmp_trap"] is True
    assert parsed["vrrp"]["groups"][0]["health_check"]["timeout"] == "5"
    assert parsed["vrrp"]["sync_groups"][0]["health_check"]["timeout"] == "7"


def test_parse_config_snmp_without_trap():
    mapper = HighAvailabilityMapper("1.5")
    parsed = mapper.parse_config({
        "high-availability": {"vrrp": {"snmp": {}}},
    })
    assert parsed["vrrp"]["snmp"] is True
    assert parsed["vrrp"]["snmp_trap"] is False
