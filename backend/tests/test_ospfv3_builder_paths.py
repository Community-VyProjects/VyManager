"""Golden paths for every OSPFv3 builder op.

Each path matches a protocols ospfv3 node.def on the 1.4 and 1.5 labs (the
tree is identical on both). area-type normal and area-type stub|nssa
default-cost do not exist there and have no op.
"""

import inspect

import pytest

from vyos_builders.ospfv3.ospfv3_batch_builder import RANGES, Ospfv3BatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.ospfv3 import Ospfv3Mapper

BASE = ["protocols", "ospfv3"]
P = "2001:db8::/32"
A = ["area", "1"]
I = ["interface", "eth0"]
GR = ["graceful-restart"]
H = GR + ["helper"]
DI = ["default-information", "originate"]

# method, args, op, path after protocols ospfv3
CASES = [
    ("set_router_id", ("192.0.2.1",), "set", ["parameters", "router-id", "192.0.2.1"]),
    ("delete_router_id", (), "delete", ["parameters", "router-id"]),
    # areas
    ("set_area", ("1",), "set", A),
    ("delete_area", ("1",), "delete", A),
    ("set_area_type_stub", ("1",), "set", A + ["area-type", "stub"]),
    ("set_area_type_stub_no_summary", ("1",), "set", A + ["area-type", "stub", "no-summary"]),
    ("delete_area_type_stub_no_summary", ("1",), "delete", A + ["area-type", "stub", "no-summary"]),
    ("set_area_type_nssa", ("1",), "set", A + ["area-type", "nssa"]),
    ("set_area_type_nssa_no_summary", ("1",), "set", A + ["area-type", "nssa", "no-summary"]),
    ("delete_area_type_nssa_no_summary", ("1",), "delete", A + ["area-type", "nssa", "no-summary"]),
    ("set_area_type_nssa_default_information_originate", ("1",), "set",
     A + ["area-type", "nssa", "default-information-originate"]),
    ("delete_area_type_nssa_default_information_originate", ("1",), "delete",
     A + ["area-type", "nssa", "default-information-originate"]),
    ("delete_area_type", ("1",), "delete", A + ["area-type"]),
    ("set_area_range", ("1", P), "set", A + ["range", P]),
    ("delete_area_range", ("1", P), "delete", A + ["range", P]),
    ("set_area_range_advertise", ("1", P), "set", A + ["range", P, "advertise"]),
    ("delete_area_range_advertise", ("1", P), "delete", A + ["range", P, "advertise"]),
    ("set_area_range_not_advertise", ("1", P), "set", A + ["range", P, "not-advertise"]),
    ("delete_area_range_not_advertise", ("1", P), "delete", A + ["range", P, "not-advertise"]),
    ("set_area_export_list", ("1", "OUT"), "set", A + ["export-list", "OUT"]),
    ("delete_area_export_list", ("1",), "delete", A + ["export-list"]),
    ("set_area_import_list", ("1", "IN"), "set", A + ["import-list", "IN"]),
    ("delete_area_import_list", ("1",), "delete", A + ["import-list"]),
    # interfaces
    ("set_interface", ("eth0",), "set", I),
    ("delete_interface", ("eth0",), "delete", I),
    ("set_interface_area", ("eth0", "0.0.0.1"), "set", I + ["area", "0.0.0.1"]),
    ("delete_interface_area", ("eth0",), "delete", I + ["area"]),
    ("set_interface_cost", ("eth0", "10"), "set", I + ["cost", "10"]),
    ("delete_interface_cost", ("eth0",), "delete", I + ["cost"]),
    ("set_interface_priority", ("eth0", "0"), "set", I + ["priority", "0"]),
    ("delete_interface_priority", ("eth0",), "delete", I + ["priority"]),
    ("set_interface_hello_interval", ("eth0", "10"), "set", I + ["hello-interval", "10"]),
    ("delete_interface_hello_interval", ("eth0",), "delete", I + ["hello-interval"]),
    ("set_interface_dead_interval", ("eth0", "40"), "set", I + ["dead-interval", "40"]),
    ("delete_interface_dead_interval", ("eth0",), "delete", I + ["dead-interval"]),
    ("set_interface_retransmit_interval", ("eth0", "5"), "set", I + ["retransmit-interval", "5"]),
    ("delete_interface_retransmit_interval", ("eth0",), "delete", I + ["retransmit-interval"]),
    ("set_interface_transmit_delay", ("eth0", "1"), "set", I + ["transmit-delay", "1"]),
    ("delete_interface_transmit_delay", ("eth0",), "delete", I + ["transmit-delay"]),
    ("set_interface_network", ("eth0", "point-to-point"), "set", I + ["network", "point-to-point"]),
    ("delete_interface_network", ("eth0",), "delete", I + ["network"]),
    ("set_interface_passive", ("eth0",), "set", I + ["passive"]),
    ("delete_interface_passive", ("eth0",), "delete", I + ["passive"]),
    ("set_interface_bfd", ("eth0",), "set", I + ["bfd"]),
    ("delete_interface_bfd", ("eth0",), "delete", I + ["bfd"]),
    ("set_interface_bfd_profile", ("eth0", "fast"), "set", I + ["bfd", "profile", "fast"]),
    ("delete_interface_bfd_profile", ("eth0",), "delete", I + ["bfd", "profile"]),
    ("set_interface_mtu_ignore", ("eth0",), "set", I + ["mtu-ignore"]),
    ("delete_interface_mtu_ignore", ("eth0",), "delete", I + ["mtu-ignore"]),
    ("set_interface_ifmtu", ("eth0", "1400"), "set", I + ["ifmtu", "1400"]),
    ("delete_interface_ifmtu", ("eth0",), "delete", I + ["ifmtu"]),
    ("set_interface_instance_id", ("eth0", "0"), "set", I + ["instance-id", "0"]),
    ("delete_interface_instance_id", ("eth0",), "delete", I + ["instance-id"]),
    # redistribute
    ("set_redistribute", ("connected",), "set", ["redistribute", "connected"]),
    ("delete_redistribute", ("connected",), "delete", ["redistribute", "connected"]),
    ("set_redistribute_metric", ("bgp", "0"), "set", ["redistribute", "bgp", "metric", "0"]),
    ("delete_redistribute_metric", ("bgp",), "delete", ["redistribute", "bgp", "metric"]),
    ("set_redistribute_metric_type", ("bgp", "1"), "set", ["redistribute", "bgp", "metric-type", "1"]),
    ("delete_redistribute_metric_type", ("bgp",), "delete", ["redistribute", "bgp", "metric-type"]),
    ("set_redistribute_route_map", ("ripng", "RM"), "set", ["redistribute", "ripng", "route-map", "RM"]),
    ("delete_redistribute_route_map", ("ripng",), "delete", ["redistribute", "ripng", "route-map"]),
    # default-information originate
    ("set_default_information_originate", (), "set", DI),
    ("delete_default_information_originate", (), "delete", DI),
    ("set_default_information_originate_always", (), "set", DI + ["always"]),
    ("delete_default_information_originate_always", (), "delete", DI + ["always"]),
    ("set_default_information_originate_metric", ("16777214",), "set", DI + ["metric", "16777214"]),
    ("delete_default_information_originate_metric", (), "delete", DI + ["metric"]),
    ("set_default_information_originate_metric_type", ("2",), "set", DI + ["metric-type", "2"]),
    ("delete_default_information_originate_metric_type", (), "delete", DI + ["metric-type"]),
    ("set_default_information_originate_route_map", ("RM",), "set", DI + ["route-map", "RM"]),
    ("delete_default_information_originate_route_map", (), "delete", DI + ["route-map"]),
    # distance
    ("set_distance_global", ("110",), "set", ["distance", "global", "110"]),
    ("delete_distance_global", (), "delete", ["distance", "global"]),
    ("set_distance_ospfv3_external", ("120",), "set", ["distance", "ospfv3", "external", "120"]),
    ("delete_distance_ospfv3_external", (), "delete", ["distance", "ospfv3", "external"]),
    ("set_distance_ospfv3_inter_area", ("1",), "set", ["distance", "ospfv3", "inter-area", "1"]),
    ("delete_distance_ospfv3_inter_area", (), "delete", ["distance", "ospfv3", "inter-area"]),
    ("set_distance_ospfv3_intra_area", ("255",), "set", ["distance", "ospfv3", "intra-area", "255"]),
    ("delete_distance_ospfv3_intra_area", (), "delete", ["distance", "ospfv3", "intra-area"]),
    ("delete_distance_ospfv3", (), "delete", ["distance", "ospfv3"]),
    # auto-cost, log-adjacency-changes
    ("set_auto_cost_reference_bandwidth", ("4294967",), "set", ["auto-cost", "reference-bandwidth", "4294967"]),
    ("delete_auto_cost_reference_bandwidth", (), "delete", ["auto-cost", "reference-bandwidth"]),
    ("set_log_adjacency_changes", (), "set", ["log-adjacency-changes"]),
    ("delete_log_adjacency_changes", (), "delete", ["log-adjacency-changes"]),
    ("set_log_adjacency_changes_detail", (), "set", ["log-adjacency-changes", "detail"]),
    ("delete_log_adjacency_changes_detail", (), "delete", ["log-adjacency-changes", "detail"]),
    # graceful-restart
    ("set_graceful_restart", (), "set", GR),
    ("delete_graceful_restart", (), "delete", GR),
    ("set_graceful_restart_grace_period", ("5",), "set", GR + ["grace-period", "5"]),
    ("delete_graceful_restart_grace_period", (), "delete", GR + ["grace-period"]),
    ("set_graceful_restart_helper_enable", (), "set", H + ["enable"]),
    ("delete_graceful_restart_helper_enable", (), "delete", H + ["enable"]),
    ("set_graceful_restart_helper_enable_router_id", ("192.0.2.1",), "set",
     H + ["enable", "router-id", "192.0.2.1"]),
    ("delete_graceful_restart_helper_enable_router_id", ("192.0.2.1",), "delete",
     H + ["enable", "router-id", "192.0.2.1"]),
    ("set_graceful_restart_helper_lsa_check_disable", (), "set", H + ["lsa-check-disable"]),
    ("delete_graceful_restart_helper_lsa_check_disable", (), "delete", H + ["lsa-check-disable"]),
    ("set_graceful_restart_helper_planned_only", (), "set", H + ["planned-only"]),
    ("delete_graceful_restart_helper_planned_only", (), "delete", H + ["planned-only"]),
    ("set_graceful_restart_helper_supported_grace_time", ("1800",), "set", H + ["supported-grace-time", "1800"]),
    ("delete_graceful_restart_helper_supported_grace_time", (), "delete", H + ["supported-grace-time"]),
    ("delete_graceful_restart_helper", (), "delete", H),
    ("delete_ospfv3", (), "delete", []),
]


def _public_ops():
    return sorted(
        name for name, _ in inspect.getmembers(Ospfv3BatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_"))
    )


@pytest.mark.parametrize("version", ["1.4", "1.5"])
@pytest.mark.parametrize("method,args,op,path", CASES, ids=[c[0] for c in CASES])
def test_op_path(version, method, args, op, path):
    builder = Ospfv3BatchBuilder(version)
    getattr(builder, method)(*args)
    assert builder.get_operations() == [{"op": op, "path": BASE + path}]


def test_every_op_has_a_golden_path():
    assert sorted(c[0] for c in CASES) == _public_ops()


@pytest.mark.parametrize("method", [
    "set_area_type_normal",
    "set_area_type_stub_default_cost",
    "set_area_type_nssa_default_cost",
])
def test_paths_the_labs_lack_have_no_op(method):
    assert not hasattr(Ospfv3BatchBuilder, method)
    assert not hasattr(Ospfv3Mapper, method.replace("set_", "get_", 1))


@pytest.mark.parametrize("method,args", [
    ("set_interface_cost", ("eth0", "0")),
    ("set_interface_cost", ("eth0", "65536")),
    ("set_interface_cost", ("eth0", "ten")),
    ("set_interface_priority", ("eth0", "256")),
    ("set_interface_instance_id", ("eth0", "-1")),
    ("set_interface_ifmtu", ("eth0", "0")),
    ("set_interface_hello_interval", ("eth0", "65536")),
    ("set_interface_dead_interval", ("eth0", "0")),
    ("set_interface_retransmit_interval", ("eth0", "0")),
    ("set_interface_transmit_delay", ("eth0", "70000")),
    ("set_interface_network", ("eth0", "non-broadcast")),
    ("set_interface_area", ("eth0", "4294967296")),
    ("set_interface_area", ("eth0", "backbone")),
    ("set_area", ("4294967296",)),
    ("set_area", ("1.2.3",)),
    ("set_area_range", ("1", "10.0.0.0/8")),
    ("set_area_range", ("1", "2001:db8::")),
    ("set_area_range", ("1", "2001:db8::1/48")),
    ("set_area_range_advertise", ("1", "2001:db8::1/48")),
    ("delete_area_range", ("1", "2001:db8::1/48")),
    ("set_router_id", ("2001:db8::1",)),
    ("set_graceful_restart_helper_enable_router_id", ("300.0.0.1",)),
    ("set_auto_cost_reference_bandwidth", ("0",)),
    ("set_auto_cost_reference_bandwidth", ("4294968",)),
    ("set_default_information_originate_metric", ("16777215",)),
    ("set_default_information_originate_metric_type", ("3",)),
    ("set_distance_global", ("0",)),
    ("set_distance_ospfv3_external", ("256",)),
    ("set_distance_ospfv3_inter_area", ("256",)),
    ("set_distance_ospfv3_intra_area", ("0",)),
    ("set_graceful_restart_grace_period", ("4",)),
    ("set_graceful_restart_helper_supported_grace_time", ("9",)),
    ("set_redistribute", ("ospf",)),
    ("set_redistribute_metric", ("bgp", "16777215")),
    ("set_redistribute_metric_type", ("bgp", "0")),
    ("delete_redistribute", ("rip",)),
])
def test_bad_value_raises_before_any_op(method, args):
    builder = Ospfv3BatchBuilder("1.5")
    with pytest.raises(ValueError):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


def test_capabilities_do_not_branch_on_version():
    caps = {v: Ospfv3BatchBuilder(v).get_capabilities() for v in ("1.4", "1.5", "2026.09.23-0027-rolling")}
    for caps_v in caps.values():
        caps_v.pop("version")
    assert caps["1.4"] == caps["1.5"] == caps["2026.09.23-0027-rolling"]
    c = caps["1.5"]
    assert "version_info" not in c
    assert c["features"]["areas"]["area_types"] == ["stub", "nssa"]
    assert c["features"]["interfaces"]["network_types"] == ["broadcast", "point-to-point"]
    assert c["features"]["redistribute"]["protocols"] == [
        "babel", "bgp", "connected", "isis", "kernel", "ripng", "static",
    ]
    assert c["features"]["redistribute"]["metric_types"] == ["1", "2"]
    assert c["features"]["default_information"]["metric_types"] == ["1", "2"]
    assert c["ranges"] is RANGES


def test_ranges_match_the_lab():
    assert RANGES["grace_period"] == {"min": 5, "max": 1800}
    assert RANGES["supported_grace_time"] == {"min": 10, "max": 1800}
    assert RANGES["reference_bandwidth"] == {"min": 1, "max": 4294967}
    assert RANGES["metric"] == {"min": 0, "max": 16777214}
    for key in ("cost", "dead_interval", "hello_interval", "ifmtu", "retransmit_interval", "transmit_delay"):
        assert RANGES[key] == {"min": 1, "max": 65535}
    for key in ("instance_id", "priority"):
        assert RANGES[key] == {"min": 0, "max": 255}


def test_registry_returns_the_shared_mapper():
    assert type(CommandMapperRegistry.get_mapper("ospfv3", "1.4")) is Ospfv3Mapper
    assert type(CommandMapperRegistry.get_mapper("ospfv3", "1.5")) is Ospfv3Mapper


@pytest.mark.parametrize("prefix", ["2001:db8::/48", "::/0", "2001:db8:0:1::/64"])
def test_range_prefix_without_host_bits_is_accepted(prefix):
    builder = Ospfv3BatchBuilder("1.5").set_area_range("1", prefix)
    assert builder.get_operations() == [{"op": "set", "path": BASE + ["area", "1", "range", prefix]}]


def test_range_prefix_with_host_bits_names_the_problem():
    with pytest.raises(ValueError, match="host bits"):
        Ospfv3BatchBuilder("1.4").set_area_range("1", "2001:db8::1/48")
