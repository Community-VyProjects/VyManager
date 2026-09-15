"""Golden (method, args, op, expected_path) cases for LocalRouteBatchBuilder.

fwmark, protocol, source port, and destination port exist on 1.4 and 1.5
(validateTmplPath on 100.64.64.50 and 100.64.64.5).
"""

import pytest

from routers.local_route.local_route import _parse_rule
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
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_local_route_match_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)


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
