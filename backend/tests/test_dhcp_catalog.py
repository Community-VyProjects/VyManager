"""DHCP catalog paths and version gates."""

import pytest

from vyos_builders.dhcp.dhcp import DHCPBatchBuilder
from vyos_mappers.dhcp.dhcp import DHCPMapper
from vyos_mappers.dhcp.dhcp_catalog import parse_scope


def test_ignore_client_id_is_15_only_and_not_under_option():
    mapper = DHCPMapper("1.5")
    path = mapper.catalog_set(
        "subnet", "ignore-client-id", ("LAN", "192.168.9.0/24")
    )
    assert path == [
        "service", "dhcp-server", "shared-network-name", "LAN",
        "subnet", "192.168.9.0/24", "ignore-client-id",
    ]
    assert "option" not in path
    with pytest.raises(ValueError, match="not supported"):
        DHCPMapper("1.4").catalog_set("subnet", "ignore-client-id", ("LAN", "192.168.9.0/24"))
    with pytest.raises(ValueError, match="not supported"):
        DHCPMapper("1.4").catalog_delete("subnet", "ignore-client-id", ("LAN", "192.168.9.0/24"))


def test_bootfile_size_path_differs_by_version():
    v14 = DHCPMapper("1.4").catalog_set(
        "subnet", "bootfile-size", ("LAN", "192.168.1.0/24"), ("4",)
    )
    v15 = DHCPMapper("1.5").catalog_set(
        "subnet", "bootfile-size", ("LAN", "192.168.1.0/24"), ("4",)
    )
    assert v14[-2:] == ["bootfile-size", "4"]
    assert "option" not in v14
    assert v15[-3:] == ["option", "bootfile-size", "4"]


def test_static_route_includes_next_hop():
    path = DHCPMapper("1.5").catalog_set(
        "subnet",
        "static-route",
        ("LAN", "192.168.1.0/24"),
        ("10.0.0.0/24", "192.0.2.1"),
    )
    assert path[-4:] == ["static-route", "10.0.0.0/24", "next-hop", "192.0.2.1"]
    deleted = DHCPMapper("1.5").catalog_delete(
        "subnet", "static-route", ("LAN", "192.168.1.0/24"), ("10.0.0.0/24",)
    )
    assert deleted[-2:] == ["static-route", "10.0.0.0/24"]


def test_client_class_rejected_on_14():
    with pytest.raises(ValueError, match="not supported"):
        DHCPMapper("1.4").get_client_class("LAN")
    with pytest.raises(ValueError, match="not supported"):
        DHCPMapper("1.4").get_client_class_path("LAN")
    path = DHCPMapper("1.5").get_client_class_circuit_id("LAN", "ge-0")
    assert path[-3:] == ["circuit-id", "ge-0"] or path[-2:] == ["circuit-id", "ge-0"]
    assert path[-2:] == ["circuit-id", "ge-0"]


def test_capabilities_hide_15_only_leaf_on_14():
    cat14 = DHCPBatchBuilder("1.4").get_capabilities()["catalog"]["subnet"]
    cat15 = DHCPBatchBuilder("1.5").get_capabilities()["catalog"]["subnet"]
    tokens14 = {item["token"] for item in cat14}
    tokens15 = {item["token"] for item in cat15}
    assert "ignore-client-id" not in tokens14
    assert "ignore-client-id" in tokens15
    assert "name-server" not in tokens15
    assert DHCPBatchBuilder("1.4").get_capabilities()["fields"]["client_class"]["supported"] is False
    assert DHCPBatchBuilder("1.5").get_capabilities()["fields"]["client_class"]["supported"] is True


def test_builder_emits_ignore_client_id():
    builder = DHCPBatchBuilder("1.5")
    builder.set_subnet_catalog("LAN", "192.168.9.0/24", "ignore-client-id")
    ops = builder.get_operations()
    assert ops == [{
        "op": "set",
        "path": [
            "service", "dhcp-server", "shared-network-name", "LAN",
            "subnet", "192.168.9.0/24", "ignore-client-id",
        ],
    }]


def test_parse_scope_reads_flag_and_route():
    parsed = parse_scope(
        {
            "ignore-client-id": {},
            "option": {
                "static-route": {"10.0.0.0/24": {"next-hop": "192.0.2.1"}},
                "bootfile-size": "4",
            },
        },
        "1.5",
        "subnet",
    )
    assert parsed["ignore-client-id"] is True
    assert parsed["bootfile-size"] == "4"
    assert parsed["static-route"] == [{"prefix": "10.0.0.0/24", "next_hop": "192.0.2.1"}]
    assert parsed["ip-forwarding"] is False
