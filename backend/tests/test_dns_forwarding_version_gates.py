"""DNS forwarding zone-cache is 1.5-only; ECS exists on 1.4."""

import pytest

from vyos_builders.dns_forwarding.dns_forwarding_batch_builder import (
    DNSForwardingBatchBuilder,
)
from vyos_mappers.dns_forwarding.dns_forwarding_versions import get_dns_forwarding_mapper


def test_v14_zone_cache_set_raises():
    mapper = get_dns_forwarding_mapper("1.4")
    with pytest.raises(NotImplementedError, match="not supported"):
        mapper.get_zone_cache_url("example.com", "https://example.com/zone")
    with pytest.raises(NotImplementedError, match="not supported"):
        mapper.get_zone_cache_axfr("example.com", "192.0.2.1")


def test_v14_zone_cache_delete_unguarded():
    mapper = get_dns_forwarding_mapper("1.4")
    assert mapper.get_zone_cache_delete("example.com") == [
        "service", "dns", "forwarding", "zone-cache", "example.com",
    ]


def test_v15_zone_cache_emits():
    mapper = get_dns_forwarding_mapper("1.5")
    assert mapper.get_zone_cache_url("example.com", "https://example.com/zone") == [
        "service", "dns", "forwarding", "zone-cache", "example.com",
        "source", "url", "https://example.com/zone",
    ]


def test_v14_ecs_emits():
    mapper = get_dns_forwarding_mapper("1.4")
    assert mapper.get_options_ecs_add_for("192.0.2.0/24") == [
        "service", "dns", "forwarding", "options", "ecs-add-for", "192.0.2.0/24",
    ]


def test_v14_builder_zone_cache_raises():
    builder = DNSForwardingBatchBuilder(version="1.4")
    with pytest.raises(NotImplementedError, match="not supported"):
        builder.set_zone_cache_url("example.com", "https://example.com/zone")


def test_capabilities_read_mapper_zone_cache():
    v14 = DNSForwardingBatchBuilder(version="1.4").get_capabilities()
    v15 = DNSForwardingBatchBuilder(version="1.5").get_capabilities()
    assert v14["features"]["zone_cache"]["supported"] is False
    assert v15["features"]["zone_cache"]["supported"] is True
    assert v14["features"]["options_ecs"]["supported"] is True
    assert v15["features"]["options_ecs"]["supported"] is True
