"""Golden (method, args, op, expected_path) cases for LocalRouteBatchBuilder.

Every path checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5
(100.64.64.5), and every set value accepted by configure-mode set on both
(then discarded). ``set vrf`` exists only on 1.5; its 1.4 rejection is
covered by test_local_route_vrf_version_gate.py.
"""

import pytest

from routers.local_route.local_route import _parse_rule
from tests.dispatchable_ops import dispatchable_ops
from vyos_builders.local_route.local_route import LocalRouteBatchBuilder


def _run(version, method, args, op, expected_path):
    builder = LocalRouteBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


COMMON_CASES = [
    (
        "set_local_route_rule_fwmark",
        (10, "1"),
        "set",
        ["policy", "local-route", "rule", "10", "fwmark", "1"],
    ),
    (
        "delete_local_route_rule_fwmark",
        (10,),
        "delete",
        ["policy", "local-route", "rule", "10", "fwmark"],
    ),
    (
        "set_local_route_rule_protocol",
        (10, "tcp"),
        "set",
        ["policy", "local-route", "rule", "10", "protocol", "tcp"],
    ),
    (
        "delete_local_route_rule_protocol",
        (10,),
        "delete",
        ["policy", "local-route", "rule", "10", "protocol"],
    ),
    (
        "set_local_route_rule_source_port",
        (10, "80"),
        "set",
        ["policy", "local-route", "rule", "10", "source", "port", "80"],
    ),
    (
        "delete_local_route_rule_source_port",
        (10,),
        "delete",
        ["policy", "local-route", "rule", "10", "source", "port"],
    ),
    (
        "set_local_route_rule_destination_port",
        (10, "80"),
        "set",
        ["policy", "local-route", "rule", "10", "destination", "port", "80"],
    ),
    (
        "delete_local_route_rule_destination_port",
        (10,),
        "delete",
        ["policy", "local-route", "rule", "10", "destination", "port"],
    ),
    (
        "delete_local_route_rule_source",
        (10,),
        "delete",
        ["policy", "local-route", "rule", "10", "source", "address"],
    ),
    (
        "delete_local_route_rule_destination",
        (10,),
        "delete",
        ["policy", "local-route", "rule", "10", "destination", "address"],
    ),
    (
        "set_local_route6_rule_fwmark",
        (10, "1"),
        "set",
        ["policy", "local-route6", "rule", "10", "fwmark", "1"],
    ),
    (
        "delete_local_route6_rule_fwmark",
        (10,),
        "delete",
        ["policy", "local-route6", "rule", "10", "fwmark"],
    ),
    (
        "set_local_route6_rule_protocol",
        (10, "tcp"),
        "set",
        ["policy", "local-route6", "rule", "10", "protocol", "tcp"],
    ),
    (
        "delete_local_route6_rule_protocol",
        (10,),
        "delete",
        ["policy", "local-route6", "rule", "10", "protocol"],
    ),
    (
        "set_local_route6_rule_source_port",
        (10, "80"),
        "set",
        ["policy", "local-route6", "rule", "10", "source", "port", "80"],
    ),
    (
        "delete_local_route6_rule_source_port",
        (10,),
        "delete",
        ["policy", "local-route6", "rule", "10", "source", "port"],
    ),
    (
        "set_local_route6_rule_destination_port",
        (10, "80"),
        "set",
        ["policy", "local-route6", "rule", "10", "destination", "port", "80"],
    ),
    (
        "delete_local_route6_rule_destination_port",
        (10,),
        "delete",
        ["policy", "local-route6", "rule", "10", "destination", "port"],
    ),
    (
        "delete_local_route6_rule_source",
        (10,),
        "delete",
        ["policy", "local-route6", "rule", "10", "source", "address"],
    ),
    (
        "delete_local_route6_rule_destination",
        (10,),
        "delete",
        ["policy", "local-route6", "rule", "10", "destination", "address"],
    ),
    ('delete_local_route6_rule', (10,), 'delete', ['policy', 'local-route6', 'rule', '10']),
    ('delete_local_route6_rule_inbound_interface', (10,), 'delete', ['policy', 'local-route6', 'rule', '10', 'inbound-interface']),
    ('delete_local_route6_rule_set_table', (10,), 'delete', ['policy', 'local-route6', 'rule', '10', 'set', 'table']),
    ('delete_local_route_rule', (10,), 'delete', ['policy', 'local-route', 'rule', '10']),
    ('delete_local_route_rule_inbound_interface', (10,), 'delete', ['policy', 'local-route', 'rule', '10', 'inbound-interface']),
    ('delete_local_route_rule_set_table', (10,), 'delete', ['policy', 'local-route', 'rule', '10', 'set', 'table']),
    ('set_local_route6_rule', (10,), 'set', ['policy', 'local-route6', 'rule', '10']),
    ('set_local_route6_rule_destination', (10, '2001:db8::8'), 'set', ['policy', 'local-route6', 'rule', '10', 'destination', 'address', '2001:db8::8']),
    ('set_local_route6_rule_inbound_interface', (10, 'eth1'), 'set', ['policy', 'local-route6', 'rule', '10', 'inbound-interface', 'eth1']),
    ('set_local_route6_rule_set_table', (10, '100'), 'set', ['policy', 'local-route6', 'rule', '10', 'set', 'table', '100']),
    ('set_local_route6_rule_source', (10, '2001:db8::9'), 'set', ['policy', 'local-route6', 'rule', '10', 'source', 'address', '2001:db8::9']),
    ('set_local_route_rule', (10,), 'set', ['policy', 'local-route', 'rule', '10']),
    ('set_local_route_rule_destination', (10, '192.0.2.8'), 'set', ['policy', 'local-route', 'rule', '10', 'destination', 'address', '192.0.2.8']),
    ('set_local_route_rule_inbound_interface', (10, 'eth1'), 'set', ['policy', 'local-route', 'rule', '10', 'inbound-interface', 'eth1']),
    ('set_local_route_rule_set_table', (10, '100'), 'set', ['policy', 'local-route', 'rule', '10', 'set', 'table', '100']),
    ('set_local_route_rule_source', (10, '192.0.2.9'), 'set', ['policy', 'local-route', 'rule', '10', 'source', 'address', '192.0.2.9']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_local_route_match_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)


V15_ONLY_CASES = [
    ('delete_local_route6_rule_set_vrf', (10,), 'delete', ['policy', 'local-route6', 'rule', '10', 'set', 'vrf']),
    ('delete_local_route_rule_set_vrf', (10,), 'delete', ['policy', 'local-route', 'rule', '10', 'set', 'vrf']),
    ('set_local_route6_rule_set_vrf', (10, 'blue'), 'set', ['policy', 'local-route6', 'rule', '10', 'set', 'vrf', 'blue']),
    ('set_local_route_rule_set_vrf', (10, 'blue'), 'set', ['policy', 'local-route', 'rule', '10', 'set', 'vrf', 'blue']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_local_route_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)


def test_every_local_route_op_has_a_golden_case():
    names = [case[0] for case in COMMON_CASES + V15_ONLY_CASES]
    assert len(names) == len(set(names))
    assert set(names) == dispatchable_ops(LocalRouteBatchBuilder(version="1.5"))


def test_capabilities_advertise_match_leaves():
    for version in ("1.4", "1.5"):
        features = LocalRouteBatchBuilder(version=version).get_capabilities()["features"]
        assert features["fwmark_matching"]["supported"] is True
        assert features["protocol_matching"]["supported"] is True
        assert features["source_port_matching"]["supported"] is True
        assert features["destination_port_matching"]["supported"] is True


def test_parse_rule_reads_fwmark_protocol_and_ports():
    rule = _parse_rule(
        "10",
        {
            "source": {"address": ["192.0.2.1"], "port": "80"},
            "destination": {"address": "192.0.2.8", "port": "443"},
            "fwmark": "1",
            "protocol": "tcp",
            "inbound-interface": "eth0",
            "set": {"table": "main"},
        },
    )
    assert rule.source == "192.0.2.1"
    assert rule.source_port == "80"
    assert rule.destination == "192.0.2.8"
    assert rule.destination_port == "443"
    assert rule.fwmark == "1"
    assert rule.protocol == "tcp"
    assert rule.inbound_interface == "eth0"
    assert rule.table == "main"
