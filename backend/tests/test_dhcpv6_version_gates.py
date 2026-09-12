"""DHCPv6 mapper raises on version-wrong paths and has no subnet disable node."""

import pytest

from vyos_builders.dhcpv6_server.dhcpv6_server_batch_builder import (
    DHCPv6ServerBatchBuilder,
)
from vyos_mappers.dhcpv6_server.dhcpv6_server_versions import get_dhcpv6_server_mapper


def test_v14_listen_interface_raises():
    mapper = get_dhcpv6_server_mapper("1.4")
    with pytest.raises(NotImplementedError, match="not supported"):
        mapper.get_listen_interface("eth0")
    with pytest.raises(NotImplementedError, match="not supported"):
        mapper.get_disable_route_autoinstall()


def test_v15_listen_interface_emits():
    mapper = get_dhcpv6_server_mapper("1.5")
    assert mapper.get_listen_interface("eth0") == [
        "service", "dhcpv6-server", "listen-interface", "eth0",
    ]


def test_v14_builder_listen_interface_raises():
    builder = DHCPv6ServerBatchBuilder(version="1.4")
    with pytest.raises(NotImplementedError, match="not supported"):
        builder.set_listen_interface("eth0")


def test_subnet_disable_is_gone():
    mapper = get_dhcpv6_server_mapper("1.5")
    assert not hasattr(mapper, "get_subnet_disable")
    builder = DHCPv6ServerBatchBuilder(version="1.5")
    assert not hasattr(builder, "set_subnet_disable")
    assert not hasattr(builder, "delete_subnet_disable")


def test_v15_rejects_14_only_range():
    mapper = get_dhcpv6_server_mapper("1.5")
    with pytest.raises(NotImplementedError, match="not supported"):
        mapper.get_subnet_addr_range_start("LAN", "2001:db8::/64", "2001:db8::10")


def test_v14_shared_network_interface_and_capwap_raise():
    mapper = get_dhcpv6_server_mapper("1.4")
    with pytest.raises(NotImplementedError, match="not supported"):
        mapper.get_shared_network_interface("LAN", "eth0")
    with pytest.raises(NotImplementedError, match="not supported"):
        mapper.get_subnet_interface("LAN", "2001:db8::/64", "eth0")
    with pytest.raises(NotImplementedError, match="not supported"):
        mapper.get_network_option_capwap_controller("LAN", "192.0.2.1")
    with pytest.raises(NotImplementedError, match="not supported"):
        mapper.get_subnet_option_capwap_controller("LAN", "2001:db8::/64", "192.0.2.1")


def test_v15_shared_network_interface_and_capwap_emit():
    mapper = get_dhcpv6_server_mapper("1.5")
    assert mapper.get_shared_network_interface("LAN", "eth0") == [
        "service", "dhcpv6-server", "shared-network-name", "LAN", "interface", "eth0",
    ]
    assert mapper.get_subnet_interface("LAN", "2001:db8::/64", "eth0") == [
        "service", "dhcpv6-server", "shared-network-name", "LAN",
        "subnet", "2001:db8::/64", "interface", "eth0",
    ]
    assert mapper.get_network_option_capwap_controller("LAN", "192.0.2.1") == [
        "service", "dhcpv6-server", "shared-network-name", "LAN",
        "option", "capwap-controller", "192.0.2.1",
    ]
    assert mapper.get_subnet_option_capwap_controller("LAN", "2001:db8::/64", "192.0.2.1") == [
        "service", "dhcpv6-server", "shared-network-name", "LAN",
        "subnet", "2001:db8::/64", "option", "capwap-controller", "192.0.2.1",
    ]


def test_v14_builder_shared_network_interface_raises():
    builder = DHCPv6ServerBatchBuilder(version="1.4")
    with pytest.raises(NotImplementedError, match="not supported"):
        builder.set_network_interface("LAN", "eth0")
    with pytest.raises(NotImplementedError, match="not supported"):
        builder.set_subnet_interface("LAN", "2001:db8::/64", "eth0")
    with pytest.raises(NotImplementedError, match="not supported"):
        builder.set_network_capwap_controller("LAN", "192.0.2.1")


def test_capabilities_flag_shared_network_interface():
    v14 = DHCPv6ServerBatchBuilder(version="1.4").get_capabilities()
    v15 = DHCPv6ServerBatchBuilder(version="1.5").get_capabilities()
    assert v14["features"]["shared_network_interface"]["supported"] is False
    assert v14["features"]["subnet_interface"]["supported"] is False
    assert v14["features"]["capwap_controller"]["supported"] is False
    assert v15["features"]["shared_network_interface"]["supported"] is True
    assert v15["features"]["subnet_interface"]["supported"] is True
    assert v15["features"]["capwap_controller"]["supported"] is True
