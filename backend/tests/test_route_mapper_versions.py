"""Policy route mapper: version factory, allowlist and capabilities."""

from pathlib import Path

import pytest

from vyos_builders.route.route_batch_builder import RouteBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.route import route_versions
from vyos_mappers.route.route import RouteMapper
from vyos_mappers.route.route_versions.v1_5 import RouteMapperV1_5

VERSIONS_DIR = Path(route_versions.__file__).parent


@pytest.mark.parametrize("version", ["1.4", "1.4.3", "VyOS 1.4.0-rc1"])
def test_factory_returns_shared_class_on_1_4(version):
    mapper = CommandMapperRegistry.get_mapper("route", version)
    assert type(mapper) is RouteMapper


@pytest.mark.parametrize("version", ["1.5", "latest", "2026.09.23-0027-rolling", "1.5-stream-2025-Q2"])
def test_factory_returns_subclass_for_anything_else(version):
    assert type(CommandMapperRegistry.get_mapper("route", version)) is RouteMapperV1_5


def test_versions_package_has_no_1_4_file():
    names = {path.name for path in VERSIONS_DIR.glob("*.py")}
    assert names == {"__init__.py", "v1_5.py"}


def test_allowlist_by_version():
    assert RouteMapper("1.4").versioned_nodes() == frozenset()
    assert RouteMapperV1_5("1.5").versioned_nodes() == frozenset({"geoip", "tcp mss", "set vrf"})


def test_value_lists_by_version():
    assert RouteMapper("1.4").ipsec_values() == ("match-ipsec", "match-none")
    assert RouteMapperV1_5("1.5").ipsec_values() == (
        "match-ipsec-in", "match-ipsec-out", "match-none-in", "match-none-out",
    )
    assert RouteMapper("1.4").limit_rate_units() == ()
    assert RouteMapperV1_5("1.5").limit_rate_units() == ("second", "minute", "hour", "day")
    assert RouteMapper("1.4").geoip_country_codes() == ()
    assert "us" in RouteMapperV1_5("1.5").geoip_country_codes()
    assert "icmpv6" in RouteMapper("1.4").protocol_values()
    # The ip-protocol validator rejects these /etc/protocols names on both labs.
    assert not {"ethernet", "mptcp"} & set(RouteMapper("1.4").protocol_values())
    # Lab `allowed:` lines, the same on both labs.
    assert len(RouteMapper("1.4").icmp_type_name_values()) == 15
    assert "router-advertisement" in RouteMapper("1.4").icmp_type_name_values()
    assert "info-reply" in RouteMapper("1.4").icmp_type_name_values()
    assert "packet-too-big" in RouteMapper("1.4").icmpv6_type_values()


@pytest.mark.parametrize(
    "version,expected",
    [("1.4.3", False), ("2026.09.23-0027-rolling", True)],
)
def test_capabilities_follow_the_allowlist(version, expected):
    features = RouteBatchBuilder(version).get_capabilities()["features"]
    assert features["geoip_matching"]["supported"] is expected
    assert features["tcp_mss_matching"]["supported"] is expected
    assert features["vrf_routing"]["supported"] is expected


def test_capabilities_read_the_mapper_not_the_version_string(monkeypatch):
    """A 1.5 string whose mapper drops a path reports that node unsupported."""
    monkeypatch.delattr(RouteMapperV1_5, "get_set_vrf")
    features = RouteBatchBuilder("1.5").get_capabilities()["features"]
    assert features["vrf_routing"]["supported"] is False
    assert features["geoip_matching"]["supported"] is True


def test_capabilities_carry_every_value_list():
    caps = RouteBatchBuilder("1.5").get_capabilities()
    mapper = RouteMapperV1_5("1.5")
    assert caps["values"]["protocols"] == list(mapper.protocol_values())
    assert caps["values"]["weekdays"] == list(mapper.weekday_values())
    assert caps["features"]["ipsec_matching"]["values"] == list(mapper.ipsec_values())
    assert caps["features"]["limit_rate"]["units"] == list(mapper.limit_rate_units())
    assert "version_info" not in caps
    # icmpv6 type takes a list name or a number in this range (lab syntax).
    assert caps["ranges"]["icmpv6_type"] == {"min": 0, "max": 255}
    # protocol also takes a number in this range (ip-protocol validator).
    assert caps["ranges"]["protocol"] == {"min": 0, "max": 255}
