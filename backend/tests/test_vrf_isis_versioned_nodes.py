"""VRF IS-IS 1.5-only leaves follow the VRF IS-IS mapper allowlist.

Interface fast-reroute, segment-routing srv6, traffic-engineering export and
redistribute ipv4 nhrp exist under ``vrf name <vrf> protocols isis`` only on
the 1.5 lab. Their path methods live on ``VrfIsisMapperV1_5``; the capability
flags and the VRF op gate read the mapper, so a version string alone cannot
turn either on.
"""

import pytest

from vyos_builders.vrf.vrf_protocol import ArityError

from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.vrf.vrf_isis import VrfIsisMapper
from vyos_mappers.vrf.vrf_isis_versions import VrfIsisMapperV1_5

ROLLING = "2026.09.23-0027-rolling"
PREFIX = ["vrf", "name", "T-V", "protocols", "isis"]
IFACE_FR = PREFIX + ["interface", "eth0", "fast-reroute"]
SRV6 = PREFIX + ["segment-routing", "srv6"]

LAB_15_ONLY = frozenset({"interface fast-reroute", "segment-routing srv6", "traffic-engineering export"})

# (op, value, node, verb, path)
V15_OPS = [
    ("set_vrf_isis_interface_fr_lfa_level_enable", "eth0,level-1", "interface fast-reroute",
     "set", IFACE_FR + ["lfa", "level-1", "enable"]),
    ("delete_vrf_isis_interface_fr_lfa_level_enable", "eth0,level-1", "interface fast-reroute",
     "delete", IFACE_FR + ["lfa", "level-1", "enable"]),
    ("set_vrf_isis_interface_fr_lfa_level_exclude_interface", "eth0,level-2,eth1", "interface fast-reroute",
     "set", IFACE_FR + ["lfa", "level-2", "exclude", "interface", "eth1"]),
    ("delete_vrf_isis_interface_fr_lfa_level_exclude_interface", "eth0,level-2,eth1", "interface fast-reroute",
     "delete", IFACE_FR + ["lfa", "level-2", "exclude", "interface", "eth1"]),
    ("set_vrf_isis_interface_fr_remote_lfa_level_maximum_metric", "eth0,level-1,100", "interface fast-reroute",
     "set", IFACE_FR + ["remote-lfa", "level-1", "maximum-metric", "100"]),
    ("delete_vrf_isis_interface_fr_remote_lfa_level_maximum_metric", "eth0,level-1", "interface fast-reroute",
     "delete", IFACE_FR + ["remote-lfa", "level-1", "maximum-metric"]),
    ("set_vrf_isis_interface_fr_remote_lfa_level_tunnel_mpls_ldp", "eth0,level-2", "interface fast-reroute",
     "set", IFACE_FR + ["remote-lfa", "level-2", "tunnel", "mpls-ldp"]),
    ("set_vrf_isis_interface_fr_ti_lfa_level", "eth0,level-1", "interface fast-reroute",
     "set", IFACE_FR + ["ti-lfa", "level-1"]),
    ("set_vrf_isis_interface_fr_ti_lfa_level_node_protection", "eth0,level-1", "interface fast-reroute",
     "set", IFACE_FR + ["ti-lfa", "level-1", "node-protection"]),
    ("set_vrf_isis_interface_fr_ti_lfa_level_node_protection_link_fallback", "eth0,level-2", "interface fast-reroute",
     "set", IFACE_FR + ["ti-lfa", "level-2", "node-protection", "link-fallback"]),
    ("delete_vrf_isis_interface_fr_ti_lfa_level_node_protection_link_fallback", "eth0,level-2",
     "interface fast-reroute", "delete", IFACE_FR + ["ti-lfa", "level-2", "node-protection", "link-fallback"]),
    ("set_vrf_isis_segment_routing_srv6_interface", "eth1", "segment-routing srv6",
     "set", SRV6 + ["interface", "eth1"]),
    ("delete_vrf_isis_segment_routing_srv6_interface", "eth1", "segment-routing srv6",
     "delete", SRV6 + ["interface", "eth1"]),
    ("set_vrf_isis_segment_routing_srv6_locator", "T-LOC", "segment-routing srv6",
     "set", SRV6 + ["locator", "T-LOC"]),
    ("delete_vrf_isis_segment_routing_srv6_locator", "T-LOC", "segment-routing srv6",
     "delete", SRV6 + ["locator", "T-LOC"]),
    ("set_vrf_isis_segment_routing_srv6_node_msd", "max-segs-left,8", "segment-routing srv6",
     "set", SRV6 + ["node-msd", "max-segs-left", "8"]),
    ("delete_vrf_isis_segment_routing_srv6_node_msd", "max-segs-left", "segment-routing srv6",
     "delete", SRV6 + ["node-msd", "max-segs-left"]),
    ("set_vrf_isis_traffic_engineering_export", None, "traffic-engineering export",
     "set", PREFIX + ["traffic-engineering", "export"]),
    ("delete_vrf_isis_traffic_engineering_export", None, "traffic-engineering export",
     "delete", PREFIX + ["traffic-engineering", "export"]),
]
IDS = [f"{row[0]}:{row[1]}" for row in V15_OPS]

NHRP_OPS = [
    ("set_vrf_isis_redistribute", "ipv4,nhrp", PREFIX + ["redistribute", "ipv4", "nhrp"]),
    ("set_vrf_isis_redistribute_level", "ipv4,nhrp,level-1", PREFIX + ["redistribute", "ipv4", "nhrp", "level-1"]),
    ("set_vrf_isis_redistribute_metric", "ipv4,nhrp,level-2,10",
     PREFIX + ["redistribute", "ipv4", "nhrp", "level-2", "metric", "10"]),
    ("set_vrf_isis_redistribute_route_map", "ipv4,nhrp,level-2,T-RM",
     PREFIX + ["redistribute", "ipv4", "nhrp", "level-2", "route-map", "T-RM"]),
]


def _features(version: str):
    return VrfBatchBuilder(version).get_capabilities()["features"]


def _run(version: str, op: str, value):
    builder = VrfBatchBuilder(version)
    getattr(builder, op)("T-V", value)
    return [(o["op"], o["path"]) for o in builder.get_operations()]


@pytest.mark.parametrize(
    "version, cls", [("1.4", VrfIsisMapper), ("1.4.3", VrfIsisMapper), ("1.5", VrfIsisMapperV1_5),
                     (ROLLING, VrfIsisMapperV1_5)]
)
def test_registry_returns_the_version_class(version, cls):
    assert type(CommandMapperRegistry.get_mapper("vrf_isis", version)) is cls


@pytest.mark.parametrize("version, nodes", [("1.4", frozenset()), ("1.5", LAB_15_ONLY), (ROLLING, LAB_15_ONLY)])
def test_versioned_nodes_follow_the_labs(version, nodes):
    mapper = CommandMapperRegistry.get_mapper("vrf_isis", version)
    assert isinstance(mapper, VrfIsisMapper)
    assert mapper.versioned_nodes() == nodes


def test_shared_class_has_no_1_5_paths():
    for methods in VrfIsisMapper._VERSIONED_NODES.values():
        for method in methods:
            assert not hasattr(VrfIsisMapper, method), method
            assert callable(getattr(VrfIsisMapperV1_5, method)), method


@pytest.mark.parametrize("version, expected", [("1.4", False), ("1.5", True), (ROLLING, True)])
def test_flags_follow_the_labs(version, expected):
    features = _features(version)
    assert features["isis_fast_reroute"]["supported"] is expected
    assert features["isis_redistribute_nhrp"]["supported"] is expected


@pytest.mark.parametrize("op, value, node, verb, path", V15_OPS, ids=IDS)
def test_vrf_ops_build_the_lab_path_on_1_5(op, value, node, verb, path):
    assert _run(ROLLING, op, value) == [(verb, path)]


@pytest.mark.parametrize("op, value, node, verb, path", V15_OPS, ids=IDS)
def test_vrf_ops_are_rejected_on_1_4(op, value, node, verb, path):
    with pytest.raises(ValueError, match=f"^{node} is not supported on this device$"):
        _run("1.4", op, value)


@pytest.mark.parametrize("op, value, path", NHRP_OPS, ids=[row[0] for row in NHRP_OPS])
def test_redistribute_nhrp_follows_the_labs(op, value, path):
    assert _run(ROLLING, op, value) == [("set", path)]
    with pytest.raises(ValueError, match="redistribute nhrp is not supported on this device"):
        _run("1.4", op, value)


def test_redistribute_nhrp_delete_runs_on_1_4():
    """A 1.4 device cannot hold the node, but the delete stays harmless."""
    assert _run("1.4", "delete_vrf_isis_redistribute", "ipv4,nhrp") == [
        ("delete", PREFIX + ["redistribute", "ipv4", "nhrp"])
    ]


def test_gate_reads_the_mapper_not_the_version(monkeypatch):
    """Removing the 1.5 path methods hides and rejects the leaves on a 1.5
    string; adding them to the shared class allows them on a 1.4 string. A
    version check in the VRF builder or dispatch fails this."""
    saved = {
        name: member
        for name, member in vars(VrfIsisMapperV1_5).items()
        if callable(member) and not name.startswith("__")
    }
    for name in saved:
        monkeypatch.delattr(VrfIsisMapperV1_5, name)
    assert _features(ROLLING)["isis_fast_reroute"]["supported"] is False
    assert _features(ROLLING)["isis_redistribute_nhrp"]["supported"] is False
    for op, value, node, _verb, _path in V15_OPS:
        with pytest.raises(ValueError, match=f"^{node} is not supported on this device$"):
            _run(ROLLING, op, value)
    with pytest.raises(ValueError, match="redistribute nhrp is not supported"):
        _run(ROLLING, *NHRP_OPS[0][:2])

    monkeypatch.setattr(
        VrfIsisMapper, "redistribute_ipv4_protocols", lambda self: frozenset({"connected", "nhrp"})
    )
    for name, member in saved.items():
        if name != "redistribute_ipv4_protocols":
            monkeypatch.setattr(VrfIsisMapper, name, member, raising=False)
    assert type(CommandMapperRegistry.get_mapper("vrf_isis", "1.4")) is VrfIsisMapper
    assert _features("1.4")["isis_fast_reroute"]["supported"] is True
    assert _features("1.4")["isis_redistribute_nhrp"]["supported"] is True
    for op, value, _node, verb, path in V15_OPS:
        assert _run("1.4", op, value) == [(verb, path)]
    assert _run("1.4", *NHRP_OPS[0][:2]) == [("set", NHRP_OPS[0][2])]


@pytest.mark.parametrize(
    "missing",
    [
        "get_isis_interface_fr_ti_lfa_level",
        "get_isis_segment_routing_srv6_locator",
        "get_isis_traffic_engineering_export",
    ],
)
def test_fast_reroute_flag_needs_every_node(monkeypatch, missing):
    """The screen gates interface fast-reroute, SRv6 and TE export on one flag."""
    monkeypatch.delattr(VrfIsisMapperV1_5, missing)
    assert _features(ROLLING)["isis_fast_reroute"]["supported"] is False


def test_unknown_redistribute_family_is_rejected():
    with pytest.raises(ValueError, match="unknown IS-IS redistribute address family"):
        VrfIsisMapper("1.4").get_isis_redistribute("T-V", "ipv5", "connected")


@pytest.mark.parametrize(
    "op, value",
    [
        ("delete_vrf_isis_interface_fr_lfa_level_enable", "eth0"),
        ("delete_vrf_isis_interface_fr_ti_lfa_level_node_protection", "eth0"),
        ("delete_vrf_isis_interface_fr_ti_lfa_level_node_protection_link_fallback", "eth0"),
        ("delete_vrf_isis_interface_fr_remote_lfa_level_tunnel_mpls_ldp", "eth0"),
        ("delete_vrf_isis_default_information_originate_always", "ipv4"),
        ("delete_vrf_isis_segment_routing_prefix_index_explicit_null", None),
        ("delete_vrf_isis_segment_routing_prefix_absolute_no_php_flag", None),
        ("set_vrf_isis_interface_fr_ti_lfa_level", "eth0"),
        ("delete_vrf_isis_segment_routing_srv6_node_msd", None),
        ("delete_vrf_isis_redistribute_level", "ipv4,connected"),
        ("delete_vrf_isis_redistribute", "ipv4"),
        ("delete_vrf_isis_interface_fr_ti_lfa_level", "eth0"),
        ("delete_vrf_isis_fr_lfa_local_priority_limit_level", "critical"),
        ("delete_vrf_isis_default_information_originate", "ipv4"),
        ("set_vrf_isis_traffic_engineering_export", "extra"),
        ("set_vrf_isis_set_attached_bit", "extra"),
    ],
)
def test_value_that_fits_no_path_is_an_arity_error(op, value):
    """A short value must not drop a middle element to a parent delete (the
    dummy would reach the device), and a value on a valueless leaf is not
    silently ignored."""
    with pytest.raises(ArityError, match=f"^Operation {op} has the wrong number of comma-separated values$"):
        _run(ROLLING, op, value)


def test_trailing_value_delete_still_drops_to_the_parent():
    assert _run(ROLLING, "delete_vrf_isis_interface_fr_remote_lfa_level_maximum_metric", "eth0,level-1") == [
        ("delete", IFACE_FR + ["remote-lfa", "level-1", "maximum-metric"])
    ]


def test_unprefixed_alias_is_gated_too():
    """`get_{suffix}` is a lookup candidate, so the gate checks it as well."""
    with pytest.raises(ValueError, match="^interface fast-reroute is not supported on this device$"):
        _run("1.4", "set_vrf_isis_isis_interface_fr_ti_lfa_level", "eth0,level-1")


@pytest.mark.parametrize("op, value", [
    ("delete_vrf_isis_redistribute", "ipv5,connected"),
    ("delete_vrf_isis_redistribute_level", "ipv5,connected,level-1"),
])
def test_redistribute_delete_checks_the_family(op, value):
    with pytest.raises(ValueError, match="unknown IS-IS redistribute address family ipv5"):
        _run("1.4", op, value)


@pytest.mark.parametrize("method", [
    "get_isis_set_overload_bit_on_startup",
    "get_isis_area_password_authenticate_snp",
    "get_isis_domain_password_authenticate_snp",
    "get_isis_traffic_engineering_inter_area",
    "get_isis_traffic_engineering_address_family",
])
def test_no_path_for_a_node_neither_lab_has(method):
    for cls in (VrfIsisMapper, VrfIsisMapperV1_5):
        assert not hasattr(cls, method)


def test_delete_misfit_names_the_vrf_op_when_only_the_global_builder_has_it():
    """delete_vrf_isis_default_info_ipv4 exists only on the global builder;
    a value that does not fit it is a 400 naming the VRF op, not an unknown op."""
    with pytest.raises(ArityError, match="^Operation delete_vrf_isis_default_info_ipv4 has the wrong number"):
        _run(ROLLING, "delete_vrf_isis_default_info_ipv4", None)


def test_set_op_with_only_a_delete_getter_is_not_an_arity_error():
    """No value can fit a set whose only VRF path is a delete path."""
    with pytest.raises(AttributeError) as err:
        _run(ROLLING, "set_vrf_bgp_af_distance", "x")
    assert not isinstance(err.value, ArityError)
