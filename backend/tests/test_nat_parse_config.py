"""parse_config for NAT64 and NAT66 returns the shape GET /config serves."""

from routers.nat64.nat64 import NAT64SourceRule
from routers.nat66.nat66 import NAT66DestinationRule, NAT66SourceRule
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.nat64 import NAT64Mapper
from vyos_mappers.nat66 import NAT66Mapper


def test_nat64_parse_config_reads_rules_and_pools():
    mapper = CommandMapperRegistry.get_mapper("nat64", "1.4.3")
    assert isinstance(mapper, NAT64Mapper)
    parsed = mapper.parse_config({
        "nat64": {"source": {"rule": {
            "20": {"source": {"prefix": "64:ff9b::/96"}},
            "10": {
                "description": "lab",
                "disable": {},
                "match": {"mark": "7"},
                "translation": {"pool": {
                    "2": {"address": "192.0.2.2"},
                    "1": {"address": "192.0.2.1", "port": "1-100", "protocol": {"tcp": {}, "icmp": {}}},
                }},
            },
            "x": {},
        }}},
    })
    rules = [NAT64SourceRule(**rule) for rule in parsed["source_rules"]]
    assert [rule.rule_number for rule in rules] == [10, 20]
    assert rules[0].disable is True
    assert rules[0].match_mark == "7"
    assert [pool.pool_number for pool in rules[0].translation_pools] == [1, 2]
    protocol = rules[0].translation_pools[0].protocol
    assert protocol is not None and protocol.tcp and protocol.icmp and not protocol.udp
    assert rules[0].translation_pools[1].protocol is None
    assert rules[1].source_prefix == "64:ff9b::/96"


def test_nat66_parse_config_reads_source_and_destination_rules():
    mapper = CommandMapperRegistry.get_mapper("nat66", "1.5")
    assert isinstance(mapper, NAT66Mapper)
    parsed = mapper.parse_config({
        "nat66": {
            "source": {"rule": {"10": {
                "outbound-interface": {"name": "eth0"},
                "source": {"prefix": "fd00::/64", "port": "80"},
                "destination": {"group": {"network-group": "NETS"}},
                "translation": {"address": "masquerade"},
                "log": {},
            }}},
            "destination": {"rule": {"5": {
                "inbound-interface": {"name": "eth1"},
                "destination": {"address": "2001:db8::1"},
                "translation": {"address": "fd00::1"},
            }}},
        },
    })
    source = NAT66SourceRule(**parsed["source_rules"][0])
    assert source.outbound_interface == "eth0"
    assert source.source is not None and source.source.prefix == "fd00::/64"
    assert source.destination is not None and source.destination.group is not None
    assert source.destination.group.network_group == "NETS"
    assert source.log is True
    destination = NAT66DestinationRule(**parsed["destination_rules"][0])
    assert destination.inbound_interface == "eth1"
    assert destination.destination is not None and destination.destination.address == "2001:db8::1"
    assert destination.source is None
    assert mapper.parse_config({}) == {"source_rules": [], "destination_rules": []}
