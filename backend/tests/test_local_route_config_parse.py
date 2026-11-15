"""Local-route GET /config parse lives on the mapper."""

from routers.local_route.local_route import LocalRouteConfigResponse
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.local_route import LocalRouteMapper


def _mapper(version):
    mapper = CommandMapperRegistry.get_mapper("local_route", version)
    assert isinstance(mapper, LocalRouteMapper)
    return mapper


def _tree():
    return {
        "policy": {
            "local-route": {
                "rule": {
                    "20": {"source": {"address": "192.0.2.20"}, "set": {"table": "100"}},
                    "10": {
                        "source": {"address": ["192.0.2.1"], "port": "80"},
                        "destination": {"address": "192.0.2.8", "port": "443"},
                        "fwmark": "1",
                        "protocol": "tcp",
                        "inbound-interface": "eth0",
                        "set": {"table": "main"},
                    },
                }
            },
            "local-route6": {
                "rule": {
                    "5": {
                        "destination": {"address": ["2001:db8::8"]},
                        "set": {"vrf": "blue"},
                    }
                }
            },
        }
    }


def test_parse_config_feeds_router_models():
    response = LocalRouteConfigResponse(**_mapper("1.5").parse_config(_tree()))

    assert response.total_ipv4 == 2
    assert response.total_ipv6 == 1
    assert [rule.rule_number for rule in response.ipv4_rules] == [10, 20]

    first = response.ipv4_rules[0]
    assert first.source == "192.0.2.1"
    assert first.source_port == "80"
    assert first.destination == "192.0.2.8"
    assert first.destination_port == "443"
    assert first.fwmark == "1"
    assert first.protocol == "tcp"
    assert first.inbound_interface == "eth0"
    assert first.table == "main"
    assert first.vrf is None

    second = response.ipv4_rules[1]
    assert second.source == "192.0.2.20"
    assert second.destination is None
    assert second.table == "100"

    six = response.ipv6_rules[0]
    assert six.rule_number == 5
    assert six.destination == "2001:db8::8"
    assert six.source is None
    assert six.vrf == "blue"
    assert six.table is None


def test_parse_config_without_local_route_is_empty():
    for tree in ({}, {"policy": {}}, {"policy": {"local-route": {}}}):
        parsed = _mapper("1.4").parse_config(tree)
        assert parsed == {"ipv4_rules": [], "ipv6_rules": [], "total_ipv4": 0, "total_ipv6": 0}
        LocalRouteConfigResponse(**parsed)
