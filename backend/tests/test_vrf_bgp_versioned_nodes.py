"""VRF BGP 1.5-only leaves follow the VRF BGP mapper allowlist.

Peer-group solo, redistribute nhrp, ipv6-unicast redistribute table and BMP
monitor local-rib exist under ``vrf name <vrf> protocols bgp`` only on the 1.5
lab. Their paths and allowlist entries live on ``VrfBgpMapperV1_5``; the
capability flag and the VRF op gate read the mapper, so a version string alone
cannot turn any of them on.
"""

import pytest

from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.bgp.bgp_versions import get_bgp_mapper
from vyos_mappers.vrf.vrf_bgp import VrfBgpMapper
from vyos_mappers.vrf.vrf_bgp_versions import VrfBgpMapperV1_5

ROLLING = "2026.09.23-0027-rolling"
PREFIX = ["vrf", "name", "T-V", "protocols", "bgp"]
V4 = PREFIX + ["address-family", "ipv4-unicast"]
V6 = PREFIX + ["address-family", "ipv6-unicast"]

# `ls .../vrf/name/node.tag/protocols/bgp/address-family/<afi>/redistribute`
LAB_REDIST_IPV4_14 = {"babel", "connected", "isis", "kernel", "ospf", "rip", "static"}
LAB_REDIST_IPV6_14 = {"babel", "connected", "isis", "kernel", "ospfv3", "ripng", "static"}
LAB_15_ONLY = frozenset({"peer-group solo"})


def _features(version: str):
    return VrfBatchBuilder(version).get_capabilities()["features"]


def _run(version: str, op: str, value):
    builder = VrfBatchBuilder(version)
    getattr(builder, op)("T-V", value)
    return [(o["op"], o["path"]) for o in builder.get_operations()]


def _vrf_bgp(version: str) -> VrfBgpMapper:
    mapper = CommandMapperRegistry.get_mapper("vrf_bgp", version)
    assert isinstance(mapper, VrfBgpMapper)
    return mapper


@pytest.mark.parametrize(
    "version, cls",
    [("1.4", VrfBgpMapper), ("1.4.3", VrfBgpMapper), ("1.5", VrfBgpMapperV1_5), (ROLLING, VrfBgpMapperV1_5)],
)
def test_registry_returns_the_version_class(version, cls):
    assert type(CommandMapperRegistry.get_mapper("vrf_bgp", version)) is cls


@pytest.mark.parametrize("version, nodes", [("1.4", frozenset()), ("1.5", LAB_15_ONLY), (ROLLING, LAB_15_ONLY)])
def test_versioned_nodes_follow_the_labs(version, nodes):
    assert _vrf_bgp(version).versioned_nodes() == nodes


def test_shared_class_has_no_1_5_paths():
    for methods in VrfBgpMapper._VERSIONED_NODES.values():
        for method in methods:
            assert not hasattr(VrfBgpMapper, method), method
            assert callable(getattr(VrfBgpMapperV1_5, method)), method


def test_shared_class_does_not_read_the_version():
    mapper = VrfBgpMapper(ROLLING)
    assert mapper.redistribute_ipv4_protocols() == LAB_REDIST_IPV4_14
    assert mapper.redistribute_ipv6_protocols() == LAB_REDIST_IPV6_14
    assert mapper.redistribute_table_afis() == {"ipv4-unicast"}
    assert mapper.bmp_monitor_policies() == {"pre-policy", "post-policy"}
    assert mapper.versioned_nodes() == frozenset()


def test_subclass_owns_the_1_5_leaves_not_the_version_string():
    mapper = VrfBgpMapperV1_5("1.4.2")
    assert mapper.redistribute_ipv4_protocols() == LAB_REDIST_IPV4_14 | {"nhrp"}
    assert mapper.redistribute_ipv6_protocols() == LAB_REDIST_IPV6_14 | {"nhrp"}
    assert mapper.redistribute_table_afis() == {"ipv4-unicast", "ipv6-unicast"}
    assert mapper.bmp_monitor_policies() == {"pre-policy", "post-policy", "local-rib"}
    assert mapper.get_bgp_peer_group_solo("T-V", "PG") == PREFIX + ["peer-group", "PG", "solo"]


@pytest.mark.parametrize("version", ["1.4", ROLLING])
def test_allowlists_match_the_global_bgp_mapper(version):
    """VRF sets run the global BGP builder; the VRF fallback must agree with it."""
    vrf, glob = _vrf_bgp(version), get_bgp_mapper(version)
    assert vrf.redistribute_ipv4_protocols() == glob.redistribute_ipv4_protocols()
    assert vrf.redistribute_ipv6_protocols() == glob.redistribute_ipv6_protocols()
    assert vrf.redistribute_table_afis() == glob.redistribute_table_afis()
    assert vrf.bmp_monitor_policies() == glob.bmp_monitor_policies()
    assert vrf.versioned_nodes() <= glob.versioned_nodes()


@pytest.mark.parametrize("version, expected", [("1.4", False), ("1.5", True), (ROLLING, True)])
def test_nhrp_flag_follows_the_labs(version, expected):
    assert _features(version)["bgp_redistribute_nhrp"]["supported"] is expected


def test_flag_and_gate_read_the_mapper_not_the_version(monkeypatch):
    """Removing the subclass members hides and rejects the 1.5 leaves on a
    1.5 string; adding them to the shared class allows them on a 1.4 string.
    A version check in the VRF builder or dispatch fails this."""
    saved = {
        name: member
        for name, member in vars(VrfBgpMapperV1_5).items()
        if callable(member) and not name.startswith("__")
    }
    for name in saved:
        monkeypatch.delattr(VrfBgpMapperV1_5, name)
    assert _features(ROLLING)["bgp_redistribute_nhrp"]["supported"] is False
    mapper = _vrf_bgp(ROLLING)
    with pytest.raises(ValueError, match="^peer-group solo is not supported on this device$"):
        mapper.require_node("peer-group solo")
    with pytest.raises(ValueError, match="^redistribute nhrp is not supported on this device$"):
        _run(ROLLING, "delete_vrf_bgp_af_redistribute_metric", "ipv4-unicast,nhrp")
    with pytest.raises(ValueError, match="^redistribute table is not supported for ipv6-unicast"):
        _run(ROLLING, "delete_vrf_bgp_af_redistribute_table_metric", "ipv6-unicast,10")
    with pytest.raises(ValueError, match="^BMP monitor policy local-rib is not supported"):
        mapper.get_bgp_bmp_target_monitor("T-V", "T1", "ipv4-unicast", "local-rib")

    base = {
        "redistribute_ipv4_protocols": lambda self: LAB_REDIST_IPV4_14 | {"nhrp"},
        "redistribute_ipv6_protocols": lambda self: LAB_REDIST_IPV6_14 | {"nhrp"},
        "redistribute_table_afis": lambda self: frozenset({"ipv4-unicast", "ipv6-unicast"}),
        "bmp_monitor_policies": lambda self: frozenset({"pre-policy", "post-policy", "local-rib"}),
        "get_bgp_peer_group_solo": saved["get_bgp_peer_group_solo"],
    }
    assert set(base) == set(saved)
    for name, member in base.items():
        monkeypatch.setattr(VrfBgpMapper, name, member, raising=False)
    assert type(CommandMapperRegistry.get_mapper("vrf_bgp", "1.4")) is VrfBgpMapper
    assert _features("1.4")["bgp_redistribute_nhrp"]["supported"] is True
    mapper = _vrf_bgp("1.4")
    assert mapper.versioned_nodes() == LAB_15_ONLY
    assert _run("1.4", "delete_vrf_bgp_af_redistribute_metric", "ipv4-unicast,nhrp") == [
        ("delete", V4 + ["redistribute", "nhrp", "metric"])
    ]
    assert _run("1.4", "delete_vrf_bgp_af_redistribute_table_metric", "ipv6-unicast,10") == [
        ("delete", V6 + ["redistribute", "table", "10", "metric"])
    ]
    assert mapper.get_bgp_bmp_target_monitor("T-V", "T1", "ipv4-unicast", "local-rib")[-1] == "local-rib"


@pytest.mark.parametrize("op, value, path", [
    ("delete_vrf_bgp_af_redistribute_metric", "ipv4-unicast,nhrp", V4 + ["redistribute", "nhrp", "metric"]),
    ("delete_vrf_bgp_af_redistribute_route_map", "ipv6-unicast,nhrp", V6 + ["redistribute", "nhrp", "route-map"]),
    ("delete_vrf_bgp_af_redistribute_table_metric", "ipv6-unicast,10",
     V6 + ["redistribute", "table", "10", "metric"]),
    ("delete_vrf_bgp_af_redistribute_table_route_map", "ipv6-unicast,10",
     V6 + ["redistribute", "table", "10", "route-map"]),
])
def test_1_5_fallback_deletes_follow_the_labs(op, value, path):
    """These deletes have no global builder method and reach the VRF mapper."""
    assert _run(ROLLING, op, value) == [("delete", path)]
    with pytest.raises(ValueError, match="not supported"):
        _run("1.4", op, value)


@pytest.mark.parametrize("version", ["1.4", ROLLING])
@pytest.mark.parametrize("op, value, path", [
    ("delete_vrf_bgp_af_redistribute_metric", "ipv6-unicast,ospfv3", V6 + ["redistribute", "ospfv3", "metric"]),
    ("delete_vrf_bgp_af_redistribute_route_map", "ipv6-unicast,ripng", V6 + ["redistribute", "ripng", "route-map"]),
    ("delete_vrf_bgp_af_redistribute_metric", "ipv4-unicast,ospf", V4 + ["redistribute", "ospf", "metric"]),
    ("delete_vrf_bgp_af_redistribute_table_metric", "ipv4-unicast,10",
     V4 + ["redistribute", "table", "10", "metric"]),
])
def test_shared_fallback_deletes_run_on_both_labs(version, op, value, path):
    """ipv6-unicast redistributes ospfv3 and ripng, not ospf and rip."""
    assert _run(version, op, value) == [("delete", path)]


@pytest.mark.parametrize("version", ["1.4", ROLLING])
def test_redistribute_family_lists_differ(version):
    mapper = _vrf_bgp(version)
    with pytest.raises(ValueError, match="^redistribute ospf is not supported on this device$"):
        mapper.get_bgp_af_redistribute("T-V", "ipv6-unicast", "ospf")
    with pytest.raises(ValueError, match="^redistribute ospfv3 is not supported on this device$"):
        mapper.get_bgp_af_redistribute("T-V", "ipv4-unicast", "ospfv3")


@pytest.mark.parametrize("version", ["1.4", ROLLING])
def test_redistribute_needs_a_unicast_family(version):
    mapper = _vrf_bgp(version)
    for call in (
        lambda: mapper.get_bgp_af_redistribute("T-V", "ipv4-multicast", "connected"),
        lambda: mapper.get_bgp_af_redistribute_delete("T-V", "ipv4-multicast", "connected"),
    ):
        with pytest.raises(ValueError, match="^redistribute is not supported for ipv4-multicast on this device$"):
            call()


def test_redistribute_delete_skips_the_protocol_allowlist():
    """A 1.4 device cannot hold the node, but the delete stays harmless."""
    assert _vrf_bgp("1.4").get_bgp_af_redistribute_delete("T-V", "ipv4-unicast", "nhrp") == V4 + [
        "redistribute", "nhrp",
    ]


def test_peer_group_solo_runs_the_global_builder_gate():
    assert _run(ROLLING, "set_vrf_bgp_peer_group_solo", "PG") == [
        ("set", PREFIX + ["peer-group", "PG", "solo"])
    ]
    with pytest.raises(ValueError, match="^peer-group solo is not supported on this device$"):
        _run("1.4", "set_vrf_bgp_peer_group_solo", "PG")


@pytest.mark.parametrize("method", [
    "get_bgp_parameters_default_no_ipv4_unicast",
    "get_bgp_parameters_log_change",
    "get_bgp_parameters_multipath",
])
def test_no_path_for_a_node_neither_lab_has(method):
    for cls in (VrfBgpMapper, VrfBgpMapperV1_5):
        assert not hasattr(cls, method)
