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
