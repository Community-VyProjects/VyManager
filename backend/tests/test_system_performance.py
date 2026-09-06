"""Unit tests for system performance configuration parsing."""

import pytest

from vyos_mappers.system.performance import SystemPerformanceMapper


@pytest.mark.parametrize(
    ("performance_node", "expected"),
    [
        ({"network-throughput": {}}, "network-throughput"),
        ("network-throughput", "network-throughput"),
        (["network-throughput"], "network-throughput"),
        ([], None),
    ],
)
def test_parse_performance_shapes(performance_node, expected):
    mapper = SystemPerformanceMapper("1.5")

    assert mapper.parse_performance({"performance": performance_node}) == expected
