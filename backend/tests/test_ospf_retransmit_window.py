"""Global OSPF retransmit-window on interfaces and virtual-links.

1.5 accepts the leaf; 1.4 rejects it. Mapper set must raise on 1.4.
Delete stays unguarded so a stale node can still be removed.
"""

from pathlib import Path

import pytest

from routers.ospf.ospf import parse_areas, parse_interfaces
from vyos_builders.ospf.ospf_batch_builder import OspfBatchBuilder
from vyos_mappers.ospf.ospf_versions import get_ospf_mapper

REPO = Path(__file__).resolve().parents[2]
MODAL = REPO / "frontend/src/components/ospf/OspfInterfaceModal.tsx"
API = REPO / "frontend/src/lib/api/ospf.ts"

V15_CASES = [
    (
        "set_interface_retransmit_window",
        ("eth0", "5"),
        "set",
        ["protocols", "ospf", "interface", "eth0", "retransmit-window", "5"],
    ),
    (
        "delete_interface_retransmit_window",
        ("eth0",),
        "delete",
        ["protocols", "ospf", "interface", "eth0", "retransmit-window"],
    ),
    (
        "set_area_virtual_link_retransmit_window",
        ("0", "192.0.2.1", "5"),
        "set",
        [
            "protocols",
            "ospf",
            "area",
            "0",
            "virtual-link",
            "192.0.2.1",
            "retransmit-window",
            "5",
        ],
    ),
    (
        "delete_area_virtual_link_retransmit_window",
        ("0", "192.0.2.1"),
        "delete",
        [
            "protocols",
            "ospf",
            "area",
            "0",
            "virtual-link",
            "192.0.2.1",
            "retransmit-window",
        ],
    ),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_CASES)
def test_ospf_15_retransmit_window_paths(method, args, op, expected_path):
    builder = OspfBatchBuilder(version="1.5")
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


def test_ospf_14_set_retransmit_window_raises():
    mapper = get_ospf_mapper("1.4")
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_interface_retransmit_window("eth0", "5")
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_area_virtual_link_retransmit_window("0", "192.0.2.1", "5")
    builder = OspfBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_interface_retransmit_window("eth0", "5")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_area_virtual_link_retransmit_window("0", "192.0.2.1", "5")


def test_ospf_14_delete_retransmit_window():
    builder = OspfBatchBuilder(version="1.4")
    builder.delete_interface_retransmit_window("eth0")
    builder.delete_area_virtual_link_retransmit_window("0", "192.0.2.1")
    ops = builder.get_operations()
    assert ops[0]["op"] == "delete"
    assert ops[0]["path"] == ["protocols", "ospf", "interface", "eth0", "retransmit-window"]
    assert ops[1]["path"][-1] == "retransmit-window"


def test_ospf_capabilities_retransmit_window():
    caps_14 = OspfBatchBuilder(version="1.4").get_capabilities()
    caps_15 = OspfBatchBuilder(version="1.5").get_capabilities()
    assert caps_14["features"]["retransmit_window"]["supported"] is False
    assert caps_15["features"]["retransmit_window"]["supported"] is True


def test_interface_modal_gates_retransmit_window():
    text = MODAL.read_text()
    assert 'id="ospf-iface-retransmit-window"' in text
    assert "Retransmit Window" in text
    assert "features?.retransmit_window?.supported" in text
    assert "VyOS 1." not in text
    assert "1.5+" not in text
    assert "1.4 only" not in text


def test_ospf_api_emits_retransmit_window_ops():
    text = API.read_text()
    assert "set_interface_retransmit_window" in text
    assert "delete_interface_retransmit_window" in text
    assert "set_area_virtual_link_retransmit_window" in text


def test_parse_retransmit_window():
    ifaces = parse_interfaces({"eth0": {"retransmit-window": "5"}})
    assert ifaces[0].retransmit_window == 5
    areas = parse_areas(
        {"0": {"virtual-link": {"192.0.2.1": {"retransmit-window": "8"}}}}
    )
    assert areas[0].virtual_links[0].retransmit_window == 8
