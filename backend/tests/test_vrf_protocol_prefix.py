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


def test_private_mapper_helpers_are_not_ops():
    vrf = VrfBatchBuilder("1.5")
    with pytest.raises(AttributeError):
        getattr(vrf, "set_vrf_bgp_base")
    with pytest.raises(AttributeError):
        getattr(vrf, "set_vrf_bgp_REDIST")
    with pytest.raises(AttributeError):
        getattr(vrf, "set_vrf_isis_fr_lfa")


def test_ui_schema_protocol_ops_resolve():
    from pathlib import Path
    import re

    root = Path(__file__).resolve().parents[2] / "frontend" / "src" / "components" / "vrf" / "schema"
    ops = set()
    for path in root.glob("*.ts"):
        ops.update(re.findall(r"vrf_(?:bgp|ospf|ospfv3|isis)[a-z0-9_]*", path.read_text()))
    builder = VrfBatchBuilder("1.5")
    missing = []
    for op in sorted(ops):
        for verb in ("set_", "delete_"):
            try:
                getattr(builder, verb + op)
            except AttributeError:
                missing.append(verb + op)
    assert missing == []


def test_valued_leaf_deletes_use_parent_node():
    """SchemaEditor number/select clear sends vrf,entity without the leaf."""
    cases = [
        (
            "delete_vrf_ospfv3_area_type_stub_default_cost",
            "0",
            ["vrf", "name", "blue", "protocols", "ospfv3", "area", "0", "area-type", "stub", "default-cost"],
        ),
        (
            "delete_vrf_ospfv3_area_type_nssa_default_cost",
            "0",
            ["vrf", "name", "blue", "protocols", "ospfv3", "area", "0", "area-type", "nssa", "default-cost"],
        ),
        (
            "delete_vrf_ospf_area_type_stub_default_cost",
            "0",
            ["vrf", "name", "blue", "protocols", "ospf", "area", "0", "area-type", "stub", "default-cost"],
        ),
        (
            "delete_vrf_ospf_area_type_nssa_default_cost",
            "0",
            ["vrf", "name", "blue", "protocols", "ospf", "area", "0", "area-type", "nssa", "default-cost"],
        ),
        (
            "delete_vrf_ospf_area_type_nssa_translate",
            "0",
            ["vrf", "name", "blue", "protocols", "ospf", "area", "0", "area-type", "nssa", "translate"],
        ),
        (
            "delete_vrf_isis_segment_routing_prefix_index_value",
            "2001:db8::/64",
            ["vrf", "name", "blue", "protocols", "isis", "segment-routing", "prefix", "2001:db8::/64", "index", "value"],
        ),
        (
            "delete_vrf_isis_segment_routing_prefix_absolute_value",
            "2001:db8::/64",
            ["vrf", "name", "blue", "protocols", "isis", "segment-routing", "prefix", "2001:db8::/64", "absolute", "value"],
        ),
    ]
    for method, entity, path in cases:
        vrf = VrfBatchBuilder("1.5")
        getattr(vrf, method)("blue", entity)
        assert vrf.get_operations() == [{"op": "delete", "path": path}], method


def test_parent_node_delete_when_leaf_omitted():
    cases = [
        (
            "delete_vrf_ospf_area_range_cost",
            "0,10.0.0.0/16",
            ["vrf", "name", "blue", "protocols", "ospf", "area", "0", "range", "10.0.0.0/16", "cost"],
        ),
        (
            "delete_vrf_ospf_redistribute_metric",
            "bgp",
            ["vrf", "name", "blue", "protocols", "ospf", "redistribute", "bgp", "metric"],
        ),
        (
            "delete_vrf_ospf_neighbor_priority",
            "192.0.2.1",
            ["vrf", "name", "blue", "protocols", "ospf", "neighbor", "192.0.2.1", "priority"],
        ),
        (
            "delete_vrf_ospfv3_area_range_cost",
            "0,2001:db8::/64",
            ["vrf", "name", "blue", "protocols", "ospfv3", "area", "0", "range", "2001:db8::/64", "cost"],
        ),
        (
            "delete_vrf_bgp_neighbor_timers_keepalive",
            "192.0.2.1",
            ["vrf", "name", "blue", "protocols", "bgp", "neighbor", "192.0.2.1", "timers", "keepalive"],
        ),
    ]
    for method, entity, path in cases:
        vrf = VrfBatchBuilder("1.5")
        getattr(vrf, method)("blue", entity)
        assert vrf.get_operations() == [{"op": "delete", "path": path}], method

    vrf = VrfBatchBuilder("1.5")
    vrf.delete_vrf_isis_ldp_sync_holddown("blue")
    assert vrf.get_operations() == [
        {"op": "delete", "path": ["vrf", "name", "blue", "protocols", "isis", "ldp-sync", "holddown"]}
    ]
    vrf = VrfBatchBuilder("1.5")
    vrf.delete_vrf_isis_topology("blue")
    assert vrf.get_operations() == [
        {"op": "delete", "path": ["vrf", "name", "blue", "protocols", "isis", "topology"]}
    ]
