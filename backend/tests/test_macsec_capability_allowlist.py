"""MACsec 1.5-only leaves: capabilities and ops read the mapper allowlist.

``interfaces macsec <name> ipv6 address interface-identifier`` and
``dhcpv6-options no-request-dns`` / ``no-request-domain-name`` have no node.def
on 1.4 (100.64.64.4) and have one on 1.5 (100.64.64.5). Their path methods live
on the 1.5 subclass; capabilities and builder ops read that set.
"""

import pytest
from fastapi import HTTPException

from routers.interfaces.interface_batch import BatchOperation, BatchRequest, run_interface_batch
from vyos_builders.interfaces.macsec import MacsecInterfaceBuilderMixin
from vyos_mappers.interfaces.macsec import MacsecInterfaceMapper
from vyos_mappers.interfaces.macsec_versions import get_macsec_mapper
from vyos_mappers.interfaces.macsec_versions.v1_5 import MacsecMapper_v1_5

IFACE = "macsec0"
NODES = frozenset({
    "ipv6_address_interface_identifier",
    "dhcpv6_options_no_request_dns",
    "dhcpv6_options_no_request_domain_name",
})
V15_METHODS = [
    "get_ipv6_address_interface_identifier",
    "get_ipv6_address_interface_identifier_path",
    "get_dhcpv6_options_no_request_dns",
    "get_dhcpv6_options_no_request_domain_name",
]


ROLLING = "2026.09.23-0027-rolling"


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


def test_v14_mapper_has_no_versioned_paths():
    mapper = get_macsec_mapper("1.4")
    assert type(mapper) is MacsecInterfaceMapper
    assert mapper.versioned_interface_nodes() == frozenset()
    for method in V15_METHODS:
        assert not hasattr(mapper, method)


def test_v15_mapper_has_every_versioned_path():
    mapper = get_macsec_mapper("1.5")
    assert isinstance(mapper, MacsecMapper_v1_5)
    assert mapper.versioned_interface_nodes() == NODES
    assert "__init__" not in vars(MacsecMapper_v1_5)


@pytest.mark.parametrize("version, supported", [
    ("1.4", False), ("1.4.3", False), ("1.5", True), (ROLLING, True),
])
def test_capabilities_follow_the_allowlist(version, supported):
    caps = MacsecInterfaceBuilderMixin(version=version).get_capabilities()
    for node in NODES:
        assert caps["features"][node]["supported"] is supported
    assert caps["features"]["address"]["supported"] is True
    assert caps["values"] == {
        "cipher": ["gcm-aes-128", "gcm-aes-256"],
        "source_validation": ["strict", "loose", "disable"],
    }


@pytest.mark.parametrize("node", sorted(NODES))
def test_capability_reads_the_mapper(monkeypatch, node):
    """A handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(
        MacsecInterfaceMapper,
        "versioned_interface_nodes",
        lambda self: NODES - {node},
    )
    caps = MacsecInterfaceBuilderMixin(version="1.5").get_capabilities()
    assert caps["features"][node]["supported"] is False
    for other in NODES - {node}:
        assert caps["features"][other]["supported"] is True


def test_ops_read_the_mapper(monkeypatch):
    monkeypatch.setattr(
        MacsecInterfaceMapper,
        "versioned_interface_nodes",
        lambda self: frozenset(),
    )
    builder = MacsecInterfaceBuilderMixin(version="1.5")
    with pytest.raises(ValueError, match="not supported on this device"):
        builder.set_dhcpv6_options_no_request_dns(IFACE)
    assert builder.get_operations() == []


def test_parse_reads_versioned_leaves_and_defaults_them_off():
    raw = {IFACE: {
        "ipv6": {"address": {"interface-identifier": "::1"}},
        "dhcpv6-options": {"no-request-dns": {}, "no-request-domain-name": {}},
    }}
    iface = get_macsec_mapper("1.5").parse_interfaces_of_type(raw)["interfaces"][0]
    assert iface["ipv6"]["address_interface_identifier"] == "::1"
    assert iface["dhcpv6_options"]["no_request_dns"] is True
    assert iface["dhcpv6_options"]["no_request_domain_name"] is True
    iface = get_macsec_mapper("1.4").parse_interfaces_of_type({IFACE: {}})["interfaces"][0]
    assert iface["ipv6"]["address_interface_identifier"] is None
    assert iface["dhcpv6_options"] is None


def test_parse_reads_bare_sections_by_key_membership():
    """A bare node left by deleting its last child still parses as present."""
    raw = {IFACE: {
        "security": {"cipher": "gcm-aes-128", "mka": {}, "static": {}},
        "dhcp-options": {},
        "dhcpv6-options": {},
        "mirror": {},
    }}
    iface = get_macsec_mapper("1.5").parse_interfaces_of_type(raw)["interfaces"][0]
    assert iface["security"]["mka"] == {"cak": None, "ckn": None, "priority": None}
    assert iface["security"]["static"] == {"key": None, "peers": []}
    assert iface["dhcp_options"]["reject"] == []
    assert iface["dhcpv6_options"]["pd"] == {}
    assert iface["mirror_configured"] is True
    assert (iface["mirror_ingress"], iface["mirror_egress"]) == (None, None)
    iface = get_macsec_mapper("1.5").parse_interfaces_of_type({IFACE: {}})["interfaces"][0]
    assert iface["mirror_configured"] is False


class _FakeService:
    def __init__(self):
        self.executed = None

    def execute_batch(self, batch):
        self.executed = batch
        return type("R", (), {"status": 200, "result": None, "error": None})()


@pytest.mark.parametrize("version", ["1.5", ROLLING])
def test_batch_writes_versioned_leaf_on_1_5(version):
    service = _FakeService()
    builder = MacsecInterfaceBuilderMixin(version=version)
    req = BatchRequest(
        interface=IFACE,
        operations=[BatchOperation(op="set_ipv6_address_interface_identifier", value="::1")],
    )
    assert run_interface_batch(service, builder, req).success is True
    assert _ops(builder) == [
        ("set", ["interfaces", "macsec", IFACE, "ipv6", "address", "interface-identifier", "::1"]),
    ]


@pytest.mark.parametrize("version", ["1.4", "1.4.3"])
def test_batch_rejects_versioned_leaf_on_1_4_without_commit(version):
    service = _FakeService()
    builder = MacsecInterfaceBuilderMixin(version=version)
    req = BatchRequest(
        interface=IFACE,
        operations=[
            BatchOperation(op="set_interface_description", value="lab"),
            BatchOperation(op="set_dhcpv6_options_no_request_dns", value=None),
        ],
    )
    with pytest.raises(HTTPException) as ei:
        run_interface_batch(service, builder, req)
    assert ei.value.status_code == 400
    assert ei.value.detail == (
        "Operation is not supported on this VyOS version: "
        "macsec dhcpv6_options_no_request_dns is not supported on this device"
    )
    assert service.executed is None
