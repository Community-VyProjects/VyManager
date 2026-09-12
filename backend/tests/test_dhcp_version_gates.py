"""DHCP path existence lives on the mapper, not a builder version sniff."""

import pytest

from vyos_builders.dhcp.dhcp import DHCPBatchBuilder
from vyos_mappers.dhcp.dhcp import DHCPMapper


def test_v15_rejects_14_only_sets():
    mapper = DHCPMapper("1.5")
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_host_decl_name()
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_subnet_enable_failover("LAN", "192.168.1.0/24")
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_dynamic_dns_update()


def test_v15_delete_helpers_stay_unguarded():
    mapper = DHCPMapper("1.5")
    assert mapper.get_host_decl_name_path()[-1] == "host-decl-name"
    assert mapper.get_subnet_enable_failover_path("LAN", "192.168.1.0/24")[-1] == "enable-failover"


def test_v14_rejects_15_only_sets():
    mapper = DHCPMapper("1.4")
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_listen_interface("eth0")
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_static_mapping_duid("LAN", "192.168.1.0/24", "host1", "00:01:02")
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_failover_certificate("FOO")
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_ddns_send_updates("enable")
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_ddns_domain("forward-domain", "example.com")


def test_v15_emits_listen_interface_and_duid():
    mapper = DHCPMapper("1.5")
    assert mapper.get_listen_interface("eth0") == [
        "service", "dhcp-server", "listen-interface", "eth0",
    ]
    assert mapper.get_static_mapping_duid("LAN", "192.168.1.0/24", "host1", "00:01:02")[-2:] == [
        "duid", "00:01:02",
    ]


def test_v14_delete_helpers_stay_unguarded_for_15_nodes():
    mapper = DHCPMapper("1.4")
    assert mapper.get_listen_interface_path("eth0")[-1] == "eth0"
    assert mapper.get_static_mapping_duid_path("LAN", "192.168.1.0/24", "host1")[-1] == "duid"


def test_v14_rejects_subnet_disable_set():
    mapper = DHCPMapper("1.4")
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_subnet_disable("LAN", "192.168.1.0/24")


def test_v14_delete_subnet_disable_unguarded():
    mapper = DHCPMapper("1.4")
    assert mapper.get_subnet_disable_path("LAN", "192.168.1.0/24")[-1] == "disable"


def test_v14_emits_time_offset_without_option_prefix():
    mapper = DHCPMapper("1.4")
    path = mapper.get_subnet_time_offset("LAN", "192.168.1.0/24", "-18000")
    assert "option" not in path
    assert path[-2:] == ["time-offset", "-18000"]


def test_v15_emits_time_offset_with_option_prefix():
    mapper = DHCPMapper("1.5")
    path = mapper.get_subnet_time_offset("LAN", "192.168.1.0/24", "-18000")
    assert path[-3:] == ["option", "time-offset", "-18000"]


def test_capabilities_read_mapper_flags():
    f14 = DHCPBatchBuilder(version="1.4").get_capabilities()["fields"]
    f15 = DHCPBatchBuilder(version="1.5").get_capabilities()["fields"]
    assert f14["enable_failover"]["supported"] is True
    assert f15["enable_failover"]["supported"] is False
    assert f14["subnet_disable"]["supported"] is False
    assert f15["subnet_disable"]["supported"] is True
    assert f14["listen_interface"]["supported"] is False
    assert f15["listen_interface"]["supported"] is True
    assert f14["static_mapping_duid"]["supported"] is False
    assert f15["static_mapping_duid"]["supported"] is True
    assert f14["host_decl_name"]["supported"] is True
    assert f15["host_decl_name"]["supported"] is False
    assert f14["listen_address"]["supported"] is True
    assert f15["hostfile_update"]["supported"] is True
    assert f14["time_offset"]["supported"] is True
    assert f15["time_offset"]["supported"] is True
    assert f14["dynamic_dns_update_leaf"]["supported"] is True
    assert f15["dynamic_dns_update_leaf"]["supported"] is False
    assert f14["dynamic_dns_update_kea"]["supported"] is False
    assert f15["dynamic_dns_update_kea"]["supported"] is True
    assert f14["failover"]["supported"] is True
    assert f15["failover"]["supported"] is True
    assert f14["failover_certificate"]["supported"] is False
    assert f15["failover_certificate"]["supported"] is True


def test_v15_builder_emits_listen_interface_and_duid():
    builder = DHCPBatchBuilder(version="1.5")
    builder.set_listen_interface("eth0")
    builder.set_static_mapping_duid("LAN", "192.168.1.0/24", "host1", "00:01:02")
    ops = builder.get_operations()
    assert ops[0]["path"] == ["service", "dhcp-server", "listen-interface", "eth0"]
    assert ops[1]["path"][-2:] == ["duid", "00:01:02"]


def test_v14_builder_rejects_listen_interface_and_duid():
    builder = DHCPBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_listen_interface("eth0")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_static_mapping_duid("LAN", "192.168.1.0/24", "host1", "00:01:02")


def test_v15_emits_ddns_kea_and_ha_certs():
    mapper = DHCPMapper("1.5")
    assert mapper.get_ddns_send_updates("enable")[-2:] == ["send-updates", "enable"]
    assert mapper.get_ddns_tsig_key_algorithm("k1", "sha256")[-2:] == ["algorithm", "sha256"]
    assert mapper.get_ddns_domain_dns_server_address(
        "forward-domain", "example.com", "1", "192.0.2.53"
    )[-2:] == ["address", "192.0.2.53"]
    assert mapper.get_failover_certificate("FOO")[-1] == "FOO"
    assert mapper.get_failover_ca_certificate("CA1")[-1] == "CA1"


def test_v14_emits_ddns_leaf():
    mapper = DHCPMapper("1.4")
    assert mapper.get_dynamic_dns_update() == ["service", "dhcp-server", "dynamic-dns-update"]


def test_v14_builder_rejects_ddns_kea_and_ha_certs():
    builder = DHCPBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_ddns_send_updates("enable")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_failover_certificate("FOO")


def test_v15_builder_rejects_ddns_leaf():
    builder = DHCPBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_dynamic_dns_update()
