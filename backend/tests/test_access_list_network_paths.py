"""Access-list IPv4 network+mask must be sibling leaves, not a 5-token path.

validateTmplPath rejects `source network ADDR MASK` on 1.4 and 1.5.
VyOS wants `source network ADDR` plus `source inverse-mask MASK`.
"""

import pytest

from vyos_builders.access_list.access_list import AccessListBatchBuilder

NETWORK = "192.168.80.0"
MASK = "0.0.0.255"

CASES = [
    (
        "set_rule_source_network",
        ("10", "1", NETWORK, MASK),
        [
            ["policy", "access-list", "10", "rule", "1", "source", "network", NETWORK],
            ["policy", "access-list", "10", "rule", "1", "source", "inverse-mask", MASK],
        ],
    ),
    (
        "set_rule_destination_network",
        ("10", "1", NETWORK, MASK),
        [
            ["policy", "access-list", "10", "rule", "1", "destination", "network", NETWORK],
            ["policy", "access-list", "10", "rule", "1", "destination", "inverse-mask", MASK],
        ],
    ),
]


@pytest.mark.parametrize("method, args, expected_paths", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_network_plus_mask_emits_sibling_leaves(method, args, expected_paths, version):
    builder = AccessListBatchBuilder(version=version)
    getattr(builder, method)(*args)
    paths = [op["path"] for op in builder.get_operations()]
    assert paths == expected_paths
    for path in paths:
        if "network" in path:
            idx = path.index("network")
            assert path[idx:] == ["network", NETWORK]
            assert MASK not in path
