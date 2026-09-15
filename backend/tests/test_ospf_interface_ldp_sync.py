"""Global OSPF interface ldp-sync disable and holddown.

Both 1.4 and 1.5 accept the leaves. Paths checked with validateTmplPath
on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
"""

from pathlib import Path

import pytest

from routers.ospf.ospf import parse_interfaces
from vyos_builders.ospf.ospf_batch_builder import OspfBatchBuilder

REPO = Path(__file__).resolve().parents[2]
MODAL = REPO / "frontend/src/components/ospf/OspfInterfaceModal.tsx"
API = REPO / "frontend/src/lib/api/ospf.ts"

CASES = [
    (
        "set_interface_ldp_sync_disable",
        ("eth0",),
        "set",
        ["protocols", "ospf", "interface", "eth0", "ldp-sync", "disable"],
    ),
    (
        "delete_interface_ldp_sync_disable",
        ("eth0",),
        "delete",
        ["protocols", "ospf", "interface", "eth0", "ldp-sync", "disable"],
    ),
    (
        "set_interface_ldp_sync_holddown",
        ("eth0", "5"),
        "set",
        ["protocols", "ospf", "interface", "eth0", "ldp-sync", "holddown", "5"],
    ),
    (
        "delete_interface_ldp_sync_holddown",
        ("eth0",),
        "delete",
        ["protocols", "ospf", "interface", "eth0", "ldp-sync", "holddown"],
    ),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_ospf_interface_ldp_sync_paths(version, method, args, op, expected_path):
    builder = OspfBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


def test_parse_interface_ldp_sync_leaves():
    ifaces = parse_interfaces(
        {"eth0": {"ldp-sync": {"disable": {}, "holddown": "5"}}}
    )
    assert ifaces[0].ldp_sync is True
    assert ifaces[0].ldp_sync_disable is True
    assert ifaces[0].ldp_sync_holddown == 5


def test_parse_interface_ldp_sync_container_only():
    ifaces = parse_interfaces({"eth0": {"ldp-sync": {}}})
    assert ifaces[0].ldp_sync is True
    assert ifaces[0].ldp_sync_disable is False
    assert ifaces[0].ldp_sync_holddown is None


def test_interface_modal_exposes_ldp_sync_leaves():
    text = MODAL.read_text()
    assert 'id="ospf-iface-ldp-sync-disable"' in text
    assert 'id="ospf-iface-ldp-sync-holddown"' in text
    assert "Disable LDP Sync" in text
    assert "LDP Sync Holddown" in text
    assert "VyOS 1." not in text
    assert "1.5+" not in text
    assert "1.4 only" not in text


def test_ospf_api_emits_interface_ldp_sync_leaf_ops():
    text = API.read_text()
    assert "set_interface_ldp_sync_disable" in text
    assert "delete_interface_ldp_sync_disable" in text
    assert "set_interface_ldp_sync_holddown" in text
    assert "delete_interface_ldp_sync_holddown" in text
