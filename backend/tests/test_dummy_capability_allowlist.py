"""Dummy MAC and netns capabilities read the mapper allowlist.

validateTmplPath: ``interfaces dummy dum0 mac`` and ``netns`` are INVALID on
1.4 (100.64.64.4) and VALID on 1.5 (100.64.64.5). Path methods live on the
1.5 subclass. Capabilities and builder ops read that set.
"""

import re
from pathlib import Path

import pytest
from fastapi import HTTPException

from routers.interfaces.interface_batch import BatchOperation, BatchRequest, run_interface_batch
from vyos_builders.interfaces.dummy import DummyInterfaceBuilderMixin
from vyos_mappers.interfaces.dummy import DummyInterfaceMapper
from vyos_mappers.interfaces.dummy_versions import get_dummy_mapper
from vyos_mappers.interfaces.dummy_versions.v1_4 import DummyMapper_v1_4
from vyos_mappers.interfaces.dummy_versions.v1_5 import DummyMapper_v1_5

REPO = Path(__file__).resolve().parents[2]
MODAL = REPO / "frontend/src/components/dummy/DummyModal.tsx"

MAC = "00:11:22:33:44:55"
NETNS = "ns1"

V15_CASES = [
    ("set_mac", ( "dum0", MAC), "set", ["interfaces", "dummy", "dum0", "mac", MAC]),
    ("delete_mac", ("dum0",), "delete", ["interfaces", "dummy", "dum0", "mac"]),
    ("set_netns", ("dum0", NETNS), "set", ["interfaces", "dummy", "dum0", "netns", NETNS]),
    ("delete_netns", ("dum0",), "delete", ["interfaces", "dummy", "dum0", "netns"]),
]


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


def test_v14_mapper_has_no_mac_or_netns_paths():
    mapper = get_dummy_mapper("1.4")
    assert isinstance(mapper, DummyMapper_v1_4)
    assert mapper.versioned_interface_nodes() == frozenset()
    assert not hasattr(mapper, "get_mac")
    assert not hasattr(mapper, "get_netns")


def test_v15_mapper_emits_mac_and_netns_paths():
    mapper = get_dummy_mapper("1.5")
    assert isinstance(mapper, DummyMapper_v1_5)
    assert mapper.versioned_interface_nodes() == frozenset({"mac", "netns"})
    assert mapper.get_mac("dum0", MAC) == ["interfaces", "dummy", "dum0", "mac", MAC]
    assert mapper.get_netns("dum0", NETNS) == ["interfaces", "dummy", "dum0", "netns", NETNS]


@pytest.mark.parametrize("method, args, op, expected_path", V15_CASES)
def test_v15_builder_ops_emit(method, args, op, expected_path):
    builder = DummyInterfaceBuilderMixin(version="1.5")
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", V15_CASES)
def test_v14_builder_ops_rejected(method, args, op, expected_path):
    builder = DummyInterfaceBuilderMixin(version="1.4")
    with pytest.raises(ValueError, match="not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


def test_v14_capabilities_hide_mac_and_netns():
    caps = DummyInterfaceBuilderMixin(version="1.4").get_capabilities()
    assert caps["features"]["mac"]["supported"] is False
    assert caps["features"]["netns"]["supported"] is False
    assert caps["features"]["address"]["supported"] is True


def test_v15_capabilities_advertise_mac_and_netns():
    caps = DummyInterfaceBuilderMixin(version="1.5").get_capabilities()
    assert caps["features"]["mac"]["supported"] is True
    assert caps["features"]["netns"]["supported"] is True


def test_mac_capability_reads_the_mapper(monkeypatch):
    """A handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(
        DummyInterfaceMapper,
        "versioned_interface_nodes",
        lambda self: frozenset(),
    )
    caps = DummyInterfaceBuilderMixin(version="1.5").get_capabilities()
    assert caps["features"]["mac"]["supported"] is False
    assert caps["features"]["netns"]["supported"] is False
    builder = DummyInterfaceBuilderMixin(version="1.5")
    with pytest.raises(ValueError, match="not supported on this device"):
        builder.set_mac("dum0", MAC)
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


def test_batch_writes_mac_on_1_5():
    service = _FakeService()
    builder = DummyInterfaceBuilderMixin(version="1.5")
    req = BatchRequest(
        interface="dum0",
        operations=[BatchOperation(op="set_mac", value=MAC)],
    )
    result = run_interface_batch(service, builder, req)
    assert result.success is True
    assert service.executed is builder
    assert _ops(builder) == [("set", ["interfaces", "dummy", "dum0", "mac", MAC])]


def test_batch_rejects_mac_on_1_4_without_commit():
    service = _FakeService()
    builder = DummyInterfaceBuilderMixin(version="1.4")
    req = BatchRequest(
        interface="dum0",
        operations=[BatchOperation(op="set_mac", value=MAC)],
    )
    with pytest.raises(HTTPException) as ei:
        run_interface_batch(service, builder, req)
    assert ei.value.status_code == 400
    assert "not supported on this device" in ei.value.detail
    assert service.executed is None
    assert builder.get_operations() == []


def test_modal_gates_mac_and_netns_on_capability():
    text = MODAL.read_text()
    assert "capabilities?.features.mac?.supported" in text
    assert "capabilities?.features.netns?.supported" in text
    assert re.search(r"capabilities\?\.features\.mac\?\.supported && \(", text)
    assert re.search(r"capabilities\?\.features\.netns\?\.supported && \(", text)
    assert "version_info" not in text
    assert "is_1_5" not in text
