"""VRF protocol ops reuse the global protocol builder with a VRF path prefix."""

import pytest

from vyos_builders.bgp.bgp_batch_builder import BgpBatchBuilder
from vyos_builders.ospf.ospf_batch_builder import OspfBatchBuilder
from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder
from vyos_builders.vrf.vrf_protocol import parse_vrf_protocol_op


def test_parse_prefers_ospfv3_over_ospf():
    assert parse_vrf_protocol_op("set_vrf_ospfv3_area") == ("set", "ospfv3", "area")
    assert parse_vrf_protocol_op("set_vrf_ospf_area") == ("set", "ospf", "area")
    assert parse_vrf_protocol_op("set_vrf_ospf") == ("set", "ospf", None)
    assert parse_vrf_protocol_op("set_vrf_description") is None


def test_ospf_area_is_global_path_with_vrf_prefix():
    global_ops = OspfBatchBuilder("1.5").set_area("0").get_operations()
    vrf = VrfBatchBuilder("1.5")
    vrf.set_vrf_ospf_area("blue", "0")
    assert vrf.get_operations() == [
        {"op": op["op"], "path": ["vrf", "name", "blue"] + op["path"]}
        for op in global_ops
    ]


def test_ospf_root_enable():
    vrf = VrfBatchBuilder("1.5")
    vrf.set_vrf_ospf("blue")
    assert vrf.get_operations() == [
        {"op": "set", "path": ["vrf", "name", "blue", "protocols", "ospf"]}
    ]


def test_bgp_neighbor_reuses_global_builder():
    global_ops = BgpBatchBuilder("1.5").set_neighbor("192.0.2.1").get_operations()
    vrf = VrfBatchBuilder("1.5")
    vrf.set_vrf_bgp_neighbor("blue", "192.0.2.1")
    assert vrf.get_operations() == [
        {"op": op["op"], "path": ["vrf", "name", "blue"] + op["path"]}
        for op in global_ops
    ]


def test_unknown_protocol_suffix_raises():
    vrf = VrfBatchBuilder("1.5")
    with pytest.raises(AttributeError):
        vrf.set_vrf_ospf_not_a_real_op("blue")
