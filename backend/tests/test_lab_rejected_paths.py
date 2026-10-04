"""LLDP and load-balancing paths the lab rejects must not be emitted.

1.4 rejects interface mode, http-compression, server check port,
listen-address accept-proxy, and wildcard-domain.
1.5 rejects interface disable.
wildcard-domain is a presence node, not a valued child.
"""

import pytest

from vyos_builders.lldp.lldp_batch_builder import LLDPBatchBuilder
from vyos_builders.load_balancing import LoadBalancingBatchBuilder
from vyos_mappers.load_balancing.load_balancing import LoadBalancingMapper


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


def test_lldp_mode_rejected_on_1_4():
    builder = LLDPBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="interface mode"):
        builder.set_interface_mode("eth0", "rx-tx")
    with pytest.raises(ValueError, match="interface mode"):
        builder.delete_interface_mode("eth0")


def test_lldp_disable_rejected_on_1_5():
    builder = LLDPBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="interface disable"):
        builder.set_interface_disable("eth0")
    with pytest.raises(ValueError, match="interface disable"):
        builder.delete_interface_disable("eth0")


def test_lldp_mode_and_disable_emit_on_the_version_that_has_them():
    mode = LLDPBatchBuilder(version="1.5")
    mode.set_interface_mode("eth0", "rx")
    assert _ops(mode) == [("set", ["service", "lldp", "interface", "eth0", "mode", "rx"])]

    disable = LLDPBatchBuilder(version="1.4")
    disable.set_interface_disable("eth0")
    assert _ops(disable) == [("set", ["service", "lldp", "interface", "eth0", "disable"])]


def test_lldp_capabilities_follow_the_mapper():
    caps_14 = LLDPBatchBuilder(version="1.4").get_capabilities()["features"]
    caps_15 = LLDPBatchBuilder(version="1.5").get_capabilities()["features"]
    assert caps_14["interface_mode"]["supported"] is False
    assert caps_14["interface_disable_flag"]["supported"] is True
    assert caps_15["interface_mode"]["supported"] is True
    assert caps_15["interface_disable_flag"]["supported"] is False


@pytest.mark.parametrize(
    "method, args",
    [
        ("set_rp_service_http_compression_algorithm", ("svc", "gzip")),
        ("delete_rp_service_http_compression", ("svc",)),
        ("delete_rp_service_http_compression_algorithm", ("svc",)),
        ("set_rp_service_http_compression_mime_type", ("svc", "text/html")),
        ("set_rp_backend_server_check_port", ("bk", "s1|8080")),
        ("delete_rp_backend_server_check_port", ("bk", "s1")),
        ("set_rp_service_listen_address_accept_proxy", ("svc", "192.0.2.1")),
        ("delete_rp_service_listen_address_accept_proxy", ("svc", "192.0.2.1")),
        ("set_rp_backend_rule_wildcard_domain", ("bk", "10")),
        ("delete_rp_backend_rule_wildcard_domain", ("bk", "10")),
        ("set_rp_service_rule_wildcard_domain", ("svc", "10")),
        ("delete_rp_service_rule_wildcard_domain", ("svc", "10")),
    ],
)
def test_load_balancing_missing_nodes_rejected_on_1_4(method, args):
    builder = LoadBalancingBatchBuilder(version="1.4")
    with pytest.raises(ValueError):
        getattr(builder, method)(*args)


def test_wildcard_domain_is_a_presence_path_on_1_5():
    backend = LoadBalancingBatchBuilder(version="1.5")
    backend.set_rp_backend_rule_wildcard_domain("bk", "10")
    assert _ops(backend) == [(
        "set",
        ["load-balancing", "haproxy", "backend", "bk", "rule", "10", "wildcard-domain"],
    )]

    service = LoadBalancingBatchBuilder(version="1.5")
    service.set_rp_service_rule_wildcard_domain("svc", "10")
    assert _ops(service) == [(
        "set",
        ["load-balancing", "haproxy", "service", "svc", "rule", "10", "wildcard-domain"],
    )]


def test_load_balancing_15_paths_still_emit():
    builder = LoadBalancingBatchBuilder(version="1.5")
    builder.set_rp_service_http_compression_algorithm("svc", "gzip")
    builder.set_rp_backend_server_check_port("bk", "s1|8080")
    builder.set_rp_service_listen_address_accept_proxy("svc", "192.0.2.1")
    assert _ops(builder) == [
        ("set", ["load-balancing", "haproxy", "service", "svc", "http-compression", "algorithm", "gzip"]),
        ("set", ["load-balancing", "haproxy", "backend", "bk", "server", "s1", "check", "port", "8080"]),
        ("set", ["load-balancing", "haproxy", "service", "svc", "listen-address", "192.0.2.1", "accept-proxy"]),
    ]


def test_load_balancing_capabilities_follow_the_mapper():
    caps_14 = LoadBalancingBatchBuilder(version="1.4").get_capabilities()["features"]
    caps_15 = LoadBalancingBatchBuilder(version="1.5").get_capabilities()["features"]
    for key in (
        "http_compression",
        "server_check_port",
        "listen_address_accept_proxy",
        "backend_rule_wildcard_domain",
        "wan_rule_groups",
    ):
        assert caps_14[key]["supported"] is False
        assert caps_15[key]["supported"] is True


def test_parse_wildcard_domain_as_presence():
    mapper = LoadBalancingMapper("1.5")
    parsed = mapper.parse_config({
        "load-balancing": {
            "haproxy": {
                "backend": {
                    "bk": {"rule": {"10": {"domain-name": "example.com", "wildcard-domain": {}}}},
                },
                "service": {
                    "svc": {"rule": {"10": {"domain-name": "example.com"}}},
                },
            },
        },
    })
    backend_rule = parsed["reverse_proxy"]["backends"][0]["rules"][0]
    service_rule = parsed["reverse_proxy"]["services"][0]["rules"][0]
    assert backend_rule["wildcard_domain"] is True
    assert service_rule["wildcard_domain"] is False
