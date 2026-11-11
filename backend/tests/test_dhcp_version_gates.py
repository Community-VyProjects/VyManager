"""DHCP server version wiring is a subclass factory, not an if in the shared class.

The 1.4 lab (100.64.64.4) and the 1.5 lab (100.64.64.5) service/dhcp-server
template trees differ: 1.5 moves the per-scope options under ``option`` and
renames ``mac-address`` to ``mac``; host-decl-name, subnet enable-failover and
the valueless dynamic-dns-update leaf exist only on 1.4; subnet-id,
listen-interface, subnet disable, static-mapping duid and description,
high-availability certificates, the Kea dynamic-dns-update children, and
client-class exist only on 1.5.
"""

import re
from pathlib import Path

import pytest

from vyos_builders.dhcp.dhcp_batch_builder import DHCPBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.dhcp.dhcp import DDNS_SCALAR_FIELDS, DHCPMapper
from vyos_mappers.dhcp.dhcp_versions import get_dhcp_mapper
from vyos_mappers.dhcp.dhcp_versions.v1_4 import DHCPMapperV1_4
from vyos_mappers.dhcp.dhcp_versions.v1_5 import DHCPMapperV1_5

MAPPER_DIR = Path(__file__).resolve().parents[1] / "vyos_mappers" / "dhcp"

V14_ONLY = {"host-decl-name", "subnet enable-failover", "dynamic-dns-update"}
V15_ONLY = {
    "listen-interface",
    "subnet-id",
    "subnet disable",
    "static-mapping duid",
    "static-mapping description",
    "high-availability certificate",
    "high-availability ca-certificate",
    "dynamic-dns-update send-updates",
    "dynamic-dns-update tsig-key",
    "dynamic-dns-update forward-domain",
    "dynamic-dns-update reverse-domain",
    "client-class",
} | {f"dynamic-dns-update {field}" for field in DDNS_SCALAR_FIELDS}


def test_factory_returns_subclasses():
    assert isinstance(get_dhcp_mapper("1.4"), DHCPMapperV1_4)
    assert isinstance(get_dhcp_mapper("1.4.3"), DHCPMapperV1_4)
    assert isinstance(get_dhcp_mapper("1.5"), DHCPMapperV1_5)
    assert isinstance(get_dhcp_mapper("2026.09.23-0027-rolling"), DHCPMapperV1_5)
    assert isinstance(get_dhcp_mapper("latest"), DHCPMapperV1_5)
    assert isinstance(CommandMapperRegistry.get_mapper("dhcp", "1.4.3"), DHCPMapperV1_4)
    assert isinstance(
        CommandMapperRegistry.get_mapper("dhcp", "2026.09.23-0027-rolling"), DHCPMapperV1_5
    )


def test_shared_class_does_not_read_the_version():
    shared = (MAPPER_DIR / "dhcp.py").read_text()
    assert re.search(r"\bself\.version\b", shared) is None
    assert "version_mapper" not in shared
    assert "hasattr" not in shared


def test_versioned_nodes_come_from_the_subclass_not_the_string():
    # A 1.5 class handed a 1.4 string still reports the 1.5 leaves, so a
    # handwritten version check anywhere would fail this.
    assert DHCPMapperV1_5("1.4").versioned_nodes() == frozenset(V15_ONLY)
    assert DHCPMapperV1_4("2026.09.23-0027-rolling").versioned_nodes() == frozenset(V14_ONLY)


def test_14_class_does_not_gain_15_leaves():
    mapper = DHCPMapperV1_4("1.4")
    for method in (
        "get_listen_interface",
        "get_subnet_subnet_id",
        "get_subnet_disable",
        "get_static_mapping_duid",
        "get_static_mapping_description",
        "get_failover_certificate",
        "get_ddns_send_updates",
        "get_client_class",
    ):
        assert not hasattr(mapper, method), method
    assert not hasattr(DHCPMapper, "get_host_decl_name")
    assert not hasattr(DHCPMapperV1_5, "get_host_decl_name")
    assert not hasattr(DHCPMapperV1_5, "get_subnet_enable_failover")
    assert not hasattr(DHCPMapperV1_5, "get_dynamic_dns_update")


def test_option_prefix_and_mac_leaf_follow_the_lab_tree():
    v14 = DHCPMapperV1_4("1.4")
    v15 = DHCPMapperV1_5("1.5")
    assert v14.get_subnet_time_offset("LAN", "192.168.1.0/24", "-18000")[-3:] == [
        "192.168.1.0/24", "time-offset", "-18000",
    ]
    assert v15.get_subnet_time_offset("LAN", "192.168.1.0/24", "-18000")[-3:] == [
        "option", "time-offset", "-18000",
    ]
    assert v14.get_shared_network_name_server("LAN", "192.0.2.53")[-3:] == [
        "LAN", "name-server", "192.0.2.53",
    ]
    assert v15.get_shared_network_name_server("LAN", "192.0.2.53")[-3:] == [
        "option", "name-server", "192.0.2.53",
    ]
    assert v14.get_static_mapping_mac_address_path("LAN", "192.168.1.0/24", "h")[-1] == "mac-address"
    assert v15.get_static_mapping_mac_address_path("LAN", "192.168.1.0/24", "h")[-1] == "mac"


def _fields(monkeypatch, cls):
    monkeypatch.setitem(CommandMapperRegistry._features, "dhcp", cls)
    return DHCPBatchBuilder(version="unknown").get_capabilities()["fields"]


@pytest.mark.parametrize(
    "flag, on_14, on_15",
    [
        ("subnet_id", False, True),
        ("listen_interface", False, True),
        ("host_decl_name", True, False),
        ("static_mapping_duid", False, True),
        ("static_mapping_description", False, True),
        ("failover_certificate", False, True),
        ("dynamic_dns_update_leaf", True, False),
        ("dynamic_dns_update_kea", False, True),
        ("subnet_disable", False, True),
        ("enable_failover", True, False),
        ("clear_inactive_lease", False, True),
        ("client_class", False, True),
        ("time_offset", True, True),
        ("failover", True, True),
        ("listen_address", True, True),
    ],
)
def test_capabilities_read_the_mapper(monkeypatch, flag, on_14, on_15):
    assert _fields(monkeypatch, DHCPMapperV1_4)[flag]["supported"] is on_14
    assert _fields(monkeypatch, DHCPMapperV1_5)[flag]["supported"] is on_15


def test_capabilities_drop_version_echo():
    caps = DHCPBatchBuilder(version="1.5").get_capabilities()
    assert "version" not in caps
    assert "version_notes" not in caps
    assert "has_subnet_id" not in caps


def test_ddns_scalar_rejects_unknown_field():
    builder = DHCPBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_ddns_scalar("bogus-leaf|x")
    with pytest.raises(ValueError, match="not supported"):
        builder.delete_ddns_scalar("bogus-leaf")


def test_ddns_domain_rejects_unknown_kind():
    builder = DHCPBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_ddns_domain("sideways-domain", "example.com")


@pytest.mark.parametrize("field", DDNS_SCALAR_FIELDS)
def test_v15_builder_ddns_scalar_set_delete(field):
    builder = DHCPBatchBuilder(version="1.5")
    builder.set_ddns_scalar(f"{field}|x")
    builder.delete_ddns_scalar(field)
    assert builder.get_operations() == [
        {"op": "set", "path": ["service", "dhcp-server", "dynamic-dns-update", field, "x"]},
        {"op": "delete", "path": ["service", "dhcp-server", "dynamic-dns-update", field]},
    ]


def test_ddns_scalar_value_keeps_embedded_pipe():
    # A value containing "|" must survive; only the first separator is the
    # field/value boundary.
    builder = DHCPBatchBuilder(version="1.5")
    builder.set_ddns_scalar("hostname-char-set|[a|b]")
    assert builder.get_operations()[0]["path"][-1] == "[a|b]"


def test_ddns_container_delete_is_shared():
    # 1.4 deletes the valueless leaf; 1.5 deletes the whole Kea node.
    for version in ("1.4", "1.5"):
        builder = DHCPBatchBuilder(version=version)
        builder.delete_dynamic_dns_update()
        assert builder.get_operations()[0]["path"] == [
            "service", "dhcp-server", "dynamic-dns-update",
        ]
