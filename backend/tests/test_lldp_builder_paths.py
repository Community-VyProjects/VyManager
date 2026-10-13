"""Golden (method, args, op, expected_path) cases for LLDPBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Interface mode exists only on 1.5. Interface disable exists only on 1.4.
"""

import inspect

import pytest

from vyos_builders.lldp.lldp_batch_builder import LLDPBatchBuilder


def _run(version, method, args, op, expected_path):
    builder = LLDPBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


COMMON_CASES = [
    ('delete_all_legacy_protocols', (), 'delete', ['service', 'lldp', 'legacy-protocols']),
    ('delete_all_management_addresses', (), 'delete', ['service', 'lldp', 'management-address']),
    ('delete_interface', ('eth0',), 'delete', ['service', 'lldp', 'interface', 'eth0']),
    ('delete_interface_location', ('eth0',), 'delete', ['service', 'lldp', 'interface', 'eth0', 'location']),
    ('delete_interface_location_coordinate_altitude', ('eth0',), 'delete', ['service', 'lldp', 'interface', 'eth0', 'location', 'coordinate-based', 'altitude']),
    ('delete_interface_location_coordinate_based', ('eth0',), 'delete', ['service', 'lldp', 'interface', 'eth0', 'location', 'coordinate-based']),
    ('delete_interface_location_coordinate_datum', ('eth0',), 'delete', ['service', 'lldp', 'interface', 'eth0', 'location', 'coordinate-based', 'datum']),
    ('delete_interface_location_coordinate_latitude', ('eth0',), 'delete', ['service', 'lldp', 'interface', 'eth0', 'location', 'coordinate-based', 'latitude']),
    ('delete_interface_location_coordinate_longitude', ('eth0',), 'delete', ['service', 'lldp', 'interface', 'eth0', 'location', 'coordinate-based', 'longitude']),
    ('delete_interface_location_elin', ('eth0',), 'delete', ['service', 'lldp', 'interface', 'eth0', 'location', 'elin']),
    ('delete_legacy_protocol', ('cdp',), 'delete', ['service', 'lldp', 'legacy-protocols', 'cdp']),
    ('delete_lldp', (), 'delete', ['service', 'lldp']),
    ('delete_management_address', ('192.0.2.1',), 'delete', ['service', 'lldp', 'management-address', '192.0.2.1']),
    ('delete_snmp', (), 'delete', ['service', 'lldp', 'snmp']),
    ('set_interface', ('eth0',), 'set', ['service', 'lldp', 'interface', 'eth0']),
    ('set_interface_location_coordinate_altitude', ('eth0', '10'), 'set', ['service', 'lldp', 'interface', 'eth0', 'location', 'coordinate-based', 'altitude', '10']),
    ('set_interface_location_coordinate_datum', ('eth0', 'WGS84'), 'set', ['service', 'lldp', 'interface', 'eth0', 'location', 'coordinate-based', 'datum', 'WGS84']),
    ('set_interface_location_coordinate_latitude', ('eth0', '40.7'), 'set', ['service', 'lldp', 'interface', 'eth0', 'location', 'coordinate-based', 'latitude', '40.7']),
    ('set_interface_location_coordinate_longitude', ('eth0', '-74.0'), 'set', ['service', 'lldp', 'interface', 'eth0', 'location', 'coordinate-based', 'longitude', '-74.0']),
    ('set_interface_location_elin', ('eth0', '1234567890'), 'set', ['service', 'lldp', 'interface', 'eth0', 'location', 'elin', '1234567890']),
    ('set_legacy_protocol', ('cdp',), 'set', ['service', 'lldp', 'legacy-protocols', 'cdp']),
    ('set_management_address', ('192.0.2.1',), 'set', ['service', 'lldp', 'management-address', '192.0.2.1']),
    ('set_snmp', (), 'set', ['service', 'lldp', 'snmp']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_lldp_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)


V14_CASES = [
    ('delete_interface_disable', ('eth0',), 'delete', ['service', 'lldp', 'interface', 'eth0', 'disable']),
    ('set_interface_disable', ('eth0',), 'set', ['service', 'lldp', 'interface', 'eth0', 'disable']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V14_CASES)
def test_lldp_v1_4_paths(method, args, op, expected_path):
    _run("1.4", method, args, op, expected_path)


V15_CASES = [
    ('delete_interface_mode', ('eth0',), 'delete', ['service', 'lldp', 'interface', 'eth0', 'mode']),
    ('set_interface_mode', ('eth0', 'rx'), 'set', ['service', 'lldp', 'interface', 'eth0', 'mode', 'rx']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_CASES)
def test_lldp_v1_5_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)


REJECT_ON_14 = [
    ('delete_interface_mode', ('eth0',)),
    ('set_interface_mode', ('eth0', 'rx')),
]


@pytest.mark.parametrize("method, args", REJECT_ON_14)
def test_lldp_mode_rejected_on_1_4(method, args):
    builder = LLDPBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="interface mode"):
        getattr(builder, method)(*args)


REJECT_ON_15 = [
    ('delete_interface_disable', ('eth0',)),
    ('set_interface_disable', ('eth0',)),
]


@pytest.mark.parametrize("method, args", REJECT_ON_15)
def test_lldp_disable_rejected_on_1_5(method, args):
    builder = LLDPBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="interface disable"):
        getattr(builder, method)(*args)


def test_every_lldp_emitter_is_tabulated():
    proto = LLDPBatchBuilder(version="1.5")
    methods = {
        name
        for name, meth in inspect.getmembers(proto, predicate=inspect.ismethod)
        if not name.startswith("_")
        and name not in {"get_capabilities", "is_empty", "get_operations", "add_set", "add_delete"}
    }
    covered = {item[0] for item in COMMON_CASES + V14_CASES + V15_CASES + REJECT_ON_14 + REJECT_ON_15}
    assert methods == covered
