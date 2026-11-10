"""WireGuard peer host-name is a 1.5 subclass path, not a merge proxy.

validateTmplPath: ``interfaces wireguard peer host-name`` is absent on VyOS 1.4
(100.64.64.4) and present on 1.5 (100.64.64.5).
"""

import ast
from pathlib import Path

import pytest

from vyos_builders.wireguard.wireguard import WireGuardBatchBuilder
from vyos_mappers.wireguard.wireguard import WireGuardMapper
from vyos_mappers.wireguard.wireguard_versions import get_wireguard_mapper
from vyos_mappers.wireguard.wireguard_versions.v1_4 import WireGuardMapperV1_4
from vyos_mappers.wireguard.wireguard_versions.v1_5 import WireGuardMapperV1_5

REPO = Path(__file__).resolve().parents[2]
MODAL = REPO / "frontend/src/components/vpn/PeerModal.tsx"
IMPORT_MODAL = REPO / "frontend/src/components/vpn/ImportConfigModal.tsx"
ROUTER = Path(__file__).resolve().parents[1] / "routers" / "wireguard" / "wireguard.py"
FACTORY = (
    Path(__file__).resolve().parents[1]
    / "vyos_mappers"
    / "wireguard"
    / "wireguard_versions"
    / "__init__.py"
)

HOST = ["interfaces", "wireguard", "wg0", "peer", "phone", "host-name"]


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


def test_factory_returns_subclasses():
    assert isinstance(get_wireguard_mapper("1.4"), WireGuardMapperV1_4)
    assert isinstance(get_wireguard_mapper("1.4.3"), WireGuardMapperV1_4)
    assert isinstance(get_wireguard_mapper("1.5"), WireGuardMapperV1_5)
    assert isinstance(get_wireguard_mapper("2026.09.23-rolling"), WireGuardMapperV1_5)
    assert "__getattr__" not in FACTORY.read_text()


def test_v14_mapper_has_no_host_name_path():
    mapper = get_wireguard_mapper("1.4")
    assert mapper.versioned_nodes() == frozenset()
    assert not hasattr(mapper, "get_peer_host_name")
    assert not hasattr(mapper, "get_peer_host_name_delete")


def test_v15_mapper_emits_host_name_path():
    mapper = get_wireguard_mapper("1.5")
    assert isinstance(mapper, WireGuardMapperV1_5)
    assert mapper.versioned_nodes() == frozenset({"peer_host_name"})
    assert mapper.get_peer_host_name("wg0", "phone", "vpn.example.com") == HOST + [
        "vpn.example.com"
    ]
    assert mapper.get_peer_host_name_delete("wg0", "phone") == HOST


def test_v15_builder_ops_emit():
    builder = WireGuardBatchBuilder(version="1.5")
    builder.set_peer_host_name("wg0", "phone", "vpn.example.com")
    assert _ops(builder) == [("set", HOST + ["vpn.example.com"])]


def test_v14_builder_ops_rejected():
    builder = WireGuardBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported on this device"):
        builder.set_peer_host_name("wg0", "phone", "vpn.example.com")
    assert builder.get_operations() == []
    with pytest.raises(ValueError, match="not supported on this device"):
        builder.delete_peer_host_name("wg0", "phone")
    assert builder.get_operations() == []


def test_v14_capabilities_hide_host_name():
    caps = WireGuardBatchBuilder(version="1.4").get_capabilities()
    assert caps["features"]["peer_host_name"]["supported"] is False
    assert caps["features"]["wireguard"]["supported"] is True


def test_v15_capabilities_advertise_host_name():
    caps = WireGuardBatchBuilder(version="1.5").get_capabilities()
    assert caps["features"]["peer_host_name"]["supported"] is True


def test_host_name_capability_reads_the_mapper(monkeypatch):
    """A handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(WireGuardMapper, "versioned_nodes", lambda self: frozenset())
    caps = WireGuardBatchBuilder(version="1.5").get_capabilities()
    assert caps["features"]["peer_host_name"]["supported"] is False
    builder = WireGuardBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="not supported on this device"):
        builder.set_peer_host_name("wg0", "phone", "vpn.example.com")
    assert builder.get_operations() == []


def test_screens_gate_host_name_on_capability():
    modal = MODAL.read_text()
    assert "hostNameSupported" in modal
    assert "peerModal.endpointHostname" in modal
    imported = IMPORT_MODAL.read_text()
    assert "capabilities?.features.peer_host_name.supported" in imported


def _handler_names(exc):
    names = set()
    etype = exc.type
    if isinstance(etype, ast.Name):
        names.add(etype.id)
    elif isinstance(etype, ast.Tuple):
        names.update(e.id for e in etype.elts if isinstance(e, ast.Name))
    return names


@pytest.mark.parametrize("name", ["wireguard_interface_batch", "wireguard_peer_batch"])
def test_value_error_is_caught_only_around_the_op_loop(name):
    tree = ast.parse(ROUTER.read_text())
    handler = next(
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.AsyncFunctionDef) and node.name == name
    )
    value_error_tries = []
    for node in ast.walk(handler):
        if not isinstance(node, ast.Try):
            continue
        for exc in node.handlers:
            if isinstance(exc, ast.ExceptHandler) and "ValueError" in _handler_names(exc):
                value_error_tries.append(node)
    assert value_error_tries, f"{name} must catch ValueError"
    for try_node in value_error_tries:
        for call in ast.walk(try_node):
            if not isinstance(call, ast.Call):
                continue
            func = call.func
            called = getattr(func, "attr", None) or getattr(func, "id", None)
            assert called != "execute_batch", "ValueError handler must not wrap execute_batch"
