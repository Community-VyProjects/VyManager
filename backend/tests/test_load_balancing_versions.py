"""Load-balancing version wiring is a subclass factory, not a merge proxy.

validateTmplPath on VyOS 1.4 (100.64.64.4) and rolling 1.5 (100.64.64.5):
global and service timeout, http-compression, server check port,
listen-address accept-proxy, wildcard-domain, and WAN rule groups exist
only on 1.5. 1.4 uses reverse-proxy; 1.5 uses haproxy.
"""

from pathlib import Path

import pytest

from vyos_builders.load_balancing import LoadBalancingBatchBuilder
from vyos_mappers.load_balancing.load_balancing import LoadBalancingMapper
from vyos_mappers.load_balancing.load_balancing_versions import get_load_balancing_mapper
from vyos_mappers.load_balancing.load_balancing_versions.v1_5 import LoadBalancingMapperV1_5


FACTORY = (
    Path(__file__).resolve().parents[1]
    / "vyos_mappers"
    / "load_balancing"
    / "load_balancing_versions"
    / "__init__.py"
)
BUILDER = (
    Path(__file__).resolve().parents[1]
    / "vyos_builders"
    / "load_balancing"
    / "load_balancing_batch_builder.py"
)


def test_factory_returns_shared_on_1_4_and_subclass_on_rolling():
    assert type(get_load_balancing_mapper("1.4")) is LoadBalancingMapper
    assert type(get_load_balancing_mapper("1.4.3")) is LoadBalancingMapper
    assert isinstance(get_load_balancing_mapper("1.5"), LoadBalancingMapperV1_5)
    assert isinstance(get_load_balancing_mapper("2026.09.23-rolling"), LoadBalancingMapperV1_5)
    assert isinstance(get_load_balancing_mapper("latest"), LoadBalancingMapperV1_5)
    factory = FACTORY.read_text()
    assert "__getattr__" not in factory
    assert "MergedMapper" not in factory
    assert "v1_4" not in factory
    assert not (FACTORY.parent / "v1_4.py").exists()


def test_base_allowlist_does_not_read_version():
    on_15 = LoadBalancingMapper("1.5")
    on_14 = LoadBalancingMapper("1.4")
    assert on_15.versioned_nodes() == frozenset()
    assert on_14.versioned_nodes() == frozenset()
    assert on_15.rp_section() == "reverse-proxy"
    assert on_14.rp_section() == "reverse-proxy"
    assert not hasattr(on_15, "get_rp_timeout_base")
    assert not hasattr(on_15, "supports_http_compression")


def test_v14_mapper_rejects_1_5_leaves():
    mapper = get_load_balancing_mapper("1.4.3")
    assert type(mapper) is LoadBalancingMapper
    with pytest.raises(ValueError, match="not supported"):
        mapper.require_node("timeout")
    with pytest.raises(ValueError, match="not supported"):
        mapper.require_node("wan rule group")
    assert mapper.get_rp_base()[:2] == ["load-balancing", "reverse-proxy"]


def test_v15_subclass_owns_leaves_not_the_version_string():
    mapper = LoadBalancingMapperV1_5("1.4.2")
    assert mapper.rp_section() == "haproxy"
    assert "timeout" in mapper.versioned_nodes()
    assert "http-compression" in mapper.versioned_nodes()
    assert "wan rule group" in mapper.versioned_nodes()
    assert mapper.get_rp_timeout_check_path("5") == [
        "load-balancing", "haproxy", "timeout", "check", "5",
    ]
    assert mapper.get_wan_rule_source_group_address_path("10", "LAN")[-2:] == [
        "address-group", "LAN",
    ]


def test_capability_reads_the_mapper(monkeypatch):
    """A handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(LoadBalancingMapperV1_5, "versioned_nodes", lambda self: frozenset())
    caps = LoadBalancingBatchBuilder(version="1.5").get_capabilities()
    assert caps["rp_key"] == "haproxy"
    for key in (
        "http_compression",
        "server_check_port",
        "listen_address_accept_proxy",
        "backend_rule_wildcard_domain",
        "wan_rule_groups",
    ):
        assert caps["features"][key]["supported"] is False
    builder = LoadBalancingBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_rp_timeout_check("", "5")
    assert builder.get_operations() == []


def test_rolling_capabilities_do_not_read_a_version_string():
    caps = LoadBalancingBatchBuilder(version="2026.09.23-rolling").get_capabilities()
    assert caps["rp_key"] == "haproxy"
    assert caps["features"]["http_compression"]["supported"] is True
    assert caps["features"]["wan_rule_groups"]["supported"] is True
    text = BUILDER.read_text()
    assert '"1.5"' not in text
    assert '"1.4"' not in text
    assert "supports_http_compression" not in text
