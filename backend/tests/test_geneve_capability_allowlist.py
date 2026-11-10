"""Geneve IPv6 interface-identifier capabilities read the mapper allowlist.

validateTmplPath: ``interfaces geneve gnv0 ipv6 address interface-identifier``
is INVALID on 1.4 (100.64.64.4) and VALID on 1.5 (100.64.64.5). Path methods
live on the 1.5 subclass. Capabilities and builder ops read that set.
"""

from pathlib import Path

import pytest
from fastapi import HTTPException

from routers.interfaces.interface_batch import BatchOperation, BatchRequest, run_interface_batch
from vyos_builders.interfaces.geneve import GeneveInterfaceBuilderMixin
from vyos_mappers.interfaces.geneve import GeneveInterfaceMapper
from vyos_mappers.interfaces.geneve_versions import get_geneve_mapper
from vyos_mappers.interfaces.geneve_versions.v1_4 import GeneveMapper_v1_4
from vyos_mappers.interfaces.geneve_versions.v1_5 import GeneveMapper_v1_5

REPO = Path(__file__).resolve().parents[2]
MODAL = REPO / "frontend/src/components/geneve/GeneveModal.tsx"

IFACE = "gnv0"
IID = "::1"

V15_CASES = [
    (
        "set_ipv6_address_interface_identifier",
        (IFACE, IID),
        "set",
        ["interfaces", "geneve", IFACE, "ipv6", "address", "interface-identifier", IID],
    ),
    (
        "delete_ipv6_address_interface_identifier",
        (IFACE,),
        "delete",
        ["interfaces", "geneve", IFACE, "ipv6", "address", "interface-identifier"],
    ),
]


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


def test_v14_mapper_has_no_interface_identifier_path():
    mapper = get_geneve_mapper("1.4")
    assert isinstance(mapper, GeneveMapper_v1_4)
    assert mapper.versioned_interface_nodes() == frozenset()
    assert not hasattr(mapper, "get_ipv6_address_interface_identifier")


def test_v15_mapper_emits_interface_identifier_path():
    mapper = get_geneve_mapper("1.5")
    assert isinstance(mapper, GeneveMapper_v1_5)
    assert mapper.versioned_interface_nodes() == frozenset({"ipv6_address_interface_identifier"})
    assert mapper.get_ipv6_address_interface_identifier(IFACE, IID) == [
        "interfaces", "geneve", IFACE, "ipv6", "address", "interface-identifier", IID,
    ]


@pytest.mark.parametrize("method, args, op, expected_path", V15_CASES)
def test_v15_builder_ops_emit(method, args, op, expected_path):
    builder = GeneveInterfaceBuilderMixin(version="1.5")
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", V15_CASES)
def test_v14_builder_ops_rejected(method, args, op, expected_path):
    builder = GeneveInterfaceBuilderMixin(version="1.4")
    with pytest.raises(ValueError, match="not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


def test_shared_address_still_emits_on_1_4():
    builder = GeneveInterfaceBuilderMixin(version="1.4")
    builder.set_interface_address(IFACE, "192.0.2.1/32")
    assert _ops(builder) == [
        ("set", ["interfaces", "geneve", IFACE, "address", "192.0.2.1/32"]),
    ]


def test_v14_capabilities_hide_interface_identifier():
    caps = GeneveInterfaceBuilderMixin(version="1.4").get_capabilities()
    assert caps["features"]["ipv6_address_interface_identifier"]["supported"] is False
    assert caps["features"]["address"]["supported"] is True


def test_v15_capabilities_advertise_interface_identifier():
    caps = GeneveInterfaceBuilderMixin(version="1.5").get_capabilities()
    assert caps["features"]["ipv6_address_interface_identifier"]["supported"] is True


def test_interface_identifier_capability_reads_the_mapper(monkeypatch):
    """A handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(
        GeneveInterfaceMapper,
        "versioned_interface_nodes",
        lambda self: frozenset(),
    )
    caps = GeneveInterfaceBuilderMixin(version="1.5").get_capabilities()
    assert caps["features"]["ipv6_address_interface_identifier"]["supported"] is False
    builder = GeneveInterfaceBuilderMixin(version="1.5")
    with pytest.raises(ValueError, match="not supported on this device"):
        builder.set_ipv6_address_interface_identifier(IFACE, IID)
    assert builder.get_operations() == []


class _FakeResponse:
    def __init__(self):
        self.status = 200
        self.result = {"ok": True}
        self.error = None


class _FakeService:
    def __init__(self):
        self.executed = None

    def execute_batch(self, batch):
        self.executed = batch
        return _FakeResponse()


def test_batch_writes_interface_identifier_on_1_5():
    service = _FakeService()
    builder = GeneveInterfaceBuilderMixin(version="1.5")
    req = BatchRequest(
        interface=IFACE,
        operations=[BatchOperation(op="set_ipv6_address_interface_identifier", value=IID)],
    )
    result = run_interface_batch(service, builder, req)
    assert result.success is True
    assert service.executed is builder
    assert _ops(builder) == [
        ("set", ["interfaces", "geneve", IFACE, "ipv6", "address", "interface-identifier", IID]),
    ]


def test_batch_rejects_interface_identifier_on_1_4_without_commit():
    service = _FakeService()
    builder = GeneveInterfaceBuilderMixin(version="1.4")
    req = BatchRequest(
        interface=IFACE,
        operations=[BatchOperation(op="set_ipv6_address_interface_identifier", value=IID)],
    )
    with pytest.raises(HTTPException) as ei:
        run_interface_batch(service, builder, req)
    assert ei.value.status_code == 400
    assert "not supported on this device" in ei.value.detail
    assert service.executed is None
    assert builder.get_operations() == []


def test_modal_gates_interface_identifier_on_capability():
    text = MODAL.read_text()
    assert "capabilities?.features.ipv6_address_interface_identifier?.supported" in text
    assert "identifierSupported && (" in text
    assert "identifierSupported && ipv6AddressInterfaceIdentifier.trim()" in text
    assert "identifierSupported\n          ? { ipv6_address_interface_identifier:" in text
    assert "version_info" not in text
    assert "is_1_5" not in text
