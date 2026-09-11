"""Access-list IPv4 network+mask must be sibling leaves, not a 5-token path.

validateTmplPath rejects `source network ADDR MASK` on 1.4 and 1.5.
VyOS wants `source network ADDR` plus `source inverse-mask MASK`.
"""

from vyos_builders.access_list.access_list import AccessListBatchBuilder


def test_source_network_emits_sibling_leaves():
    builder = AccessListBatchBuilder(version="1.4")
    builder.set_rule_source_network("10", "1", "192.168.80.0", "0.0.0.255")
    ops = builder.get_operations()
    assert [op["path"] for op in ops] == [
        ["policy", "access-list", "10", "rule", "1", "source", "network", "192.168.80.0"],
        ["policy", "access-list", "10", "rule", "1", "source", "inverse-mask", "0.0.0.255"],
    ]


def test_destination_network_emits_sibling_leaves():
    builder = AccessListBatchBuilder(version="1.5")
    builder.set_rule_destination_network("10", "1", "192.168.80.0", "0.0.0.255")
    ops = builder.get_operations()
    assert [op["path"] for op in ops] == [
        ["policy", "access-list", "10", "rule", "1", "destination", "network", "192.168.80.0"],
        ["policy", "access-list", "10", "rule", "1", "destination", "inverse-mask", "0.0.0.255"],
    ]
