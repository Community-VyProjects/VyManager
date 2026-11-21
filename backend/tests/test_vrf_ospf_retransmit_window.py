"""VRF OSPF retransmit-window follows the global OSPF mapper allowlist.

``vrf name <vrf> protocols ospf`` is the global OSPF tree on both labs, and
the VRF ops run the global OSPF builder. The capability flag and the op gate
read the OSPF mapper, so a version string alone cannot turn either on.
"""

import pytest

from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.ospf.ospf import OspfMapper
from vyos_mappers.ospf.ospf_versions.v1_5 import OspfMapperV1_5

PREFIX = ["vrf", "name", "T-V", "protocols", "ospf"]

V15_OPS = [
    (
        "set_vrf_ospf_interface_retransmit_window",
        "eth0,50",
        "set",
        PREFIX + ["interface", "eth0", "retransmit-window", "50"],
    ),
    (
        "delete_vrf_ospf_interface_retransmit_window",
        "eth0",
        "delete",
        PREFIX + ["interface", "eth0", "retransmit-window"],
    ),
    (
        "set_vrf_ospf_area_virtual_link_retransmit_window",
        "0,192.0.2.1,50",
        "set",
        PREFIX + ["area", "0", "virtual-link", "192.0.2.1", "retransmit-window", "50"],
    ),
    (
        "delete_vrf_ospf_area_virtual_link_retransmit_window",
        "0,192.0.2.1",
        "delete",
        PREFIX + ["area", "0", "virtual-link", "192.0.2.1", "retransmit-window"],
    ),
]

_WINDOW_METHODS = (
    "get_interface_retransmit_window",
    "get_interface_retransmit_window_delete",
    "get_area_virtual_link_retransmit_window",
    "get_area_virtual_link_retransmit_window_delete",
)


def _flag(version: str) -> bool:
    return VrfBatchBuilder(version).get_capabilities()["features"]["ospf_retransmit_window"]["supported"]


def _run(version: str, op: str, value: str):
    builder = VrfBatchBuilder(version)
    getattr(builder, op)("T-V", value)
    return [(o["op"], o["path"]) for o in builder.get_operations()]


@pytest.mark.parametrize("version, expected", [("1.4", False), ("1.5", True), ("rolling-202611", True)])
def test_flag_follows_the_labs(version, expected):
    assert _flag(version) is expected


@pytest.mark.parametrize("op, value, verb, path", V15_OPS, ids=[row[0] for row in V15_OPS])
def test_vrf_ops_run_the_global_builder_on_1_5(op, value, verb, path):
    assert _run("1.5", op, value) == [(verb, path)]


@pytest.mark.parametrize("op, value, verb, path", V15_OPS, ids=[row[0] for row in V15_OPS])
def test_vrf_ops_are_rejected_on_1_4(op, value, verb, path):
    with pytest.raises(ValueError, match="retransmit-window is not supported"):
        _run("1.4", op, value)


def test_gate_reads_the_mapper_not_the_version(monkeypatch):
    """Removing the 1.5 path methods hides and rejects the leaf on a 1.5
    string; adding them to the shared class allows it on a 1.4 string. A
    version check in the VRF builder fails this."""
    saved = {name: getattr(OspfMapperV1_5, name) for name in _WINDOW_METHODS}
    for name in _WINDOW_METHODS:
        monkeypatch.delattr(OspfMapperV1_5, name)
    assert _flag("1.5") is False
    for op, value, _verb, _path in V15_OPS:
        with pytest.raises(ValueError, match="retransmit-window is not supported"):
            _run("1.5", op, value)

    for name, method in saved.items():
        monkeypatch.setattr(OspfMapper, name, method, raising=False)
    assert type(CommandMapperRegistry.get_mapper("ospf", "1.4")) is OspfMapper
    assert _flag("1.4") is True
    for op, value, verb, path in V15_OPS:
        assert _run("1.4", op, value) == [(verb, path)]


@pytest.mark.parametrize(
    "missing", ["get_interface_retransmit_window", "get_area_virtual_link_retransmit_window"]
)
def test_flag_needs_both_leaves(monkeypatch, missing):
    """The screen gates the interface and the virtual-link field on one flag."""
    monkeypatch.delattr(OspfMapperV1_5, missing)
    assert _flag("1.5") is False
