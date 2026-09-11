"""Golden (method, args, expected_path) cases for BgpBatchBuilder."""

import pytest

from vyos_builders.bgp.bgp_batch_builder import BgpBatchBuilder


NEIGHBOR = "192.0.2.1"
AFI = "ipv4-unicast"

CASES = [
    ("set_system_as", ("65000",), "set", ["protocols", "bgp", "system-as", "65000"]),
    ("delete_system_as", (), "delete", ["protocols", "bgp", "system-as"]),
    ("set_timers_keepalive", ("30",), "set", ["protocols", "bgp", "timers", "keepalive", "30"]),
    ("delete_timers_holdtime", (), "delete", ["protocols", "bgp", "timers", "holdtime"]),
    ("set_parameters_router_id", ("192.0.2.10",), "set", ["protocols", "bgp", "parameters", "router-id", "192.0.2.10"]),
    ("set_parameters_log_neighbor_changes", (), "set", ["protocols", "bgp", "parameters", "log-neighbor-changes"]),
    ("set_parameters_no_ipv6_auto_ra", (), "set", ["protocols", "bgp", "parameters", "no-ipv6-auto-ra"]),
    ("delete_parameters_no_ipv6_auto_ra", (), "delete", ["protocols", "bgp", "parameters", "no-ipv6-auto-ra"]),
    ("delete_parameters_bestpath_bandwidth", (), "delete", ["protocols", "bgp", "parameters", "bestpath", "bandwidth"]),
    ("set_neighbor", (NEIGHBOR,), "set", ["protocols", "bgp", "neighbor", NEIGHBOR]),
    ("set_neighbor_remote_as", (NEIGHBOR, "65100"), "set", ["protocols", "bgp", "neighbor", NEIGHBOR, "remote-as", "65100"]),
    ("delete_neighbor_description", (NEIGHBOR,), "delete", ["protocols", "bgp", "neighbor", NEIGHBOR, "description"]),
    ("set_neighbor_shutdown", (NEIGHBOR,), "set", ["protocols", "bgp", "neighbor", NEIGHBOR, "shutdown"]),
    ("set_neighbor_af", (NEIGHBOR, AFI), "set", ["protocols", "bgp", "neighbor", NEIGHBOR, "address-family", AFI]),
    ("set_neighbor_af_route_map_export", (NEIGHBOR, AFI, "EXPORT"), "set", ["protocols", "bgp", "neighbor", NEIGHBOR, "address-family", AFI, "route-map", "export", "EXPORT"]),
    ("delete_neighbor_af_soft_reconfiguration_inbound", (NEIGHBOR, AFI), "delete", ["protocols", "bgp", "neighbor", NEIGHBOR, "address-family", AFI, "soft-reconfiguration", "inbound"]),
    ("set_peer_group", ("UPSTREAM",), "set", ["protocols", "bgp", "peer-group", "UPSTREAM"]),
    ("set_peer_group_remote_as", ("UPSTREAM", "65100"), "set", ["protocols", "bgp", "peer-group", "UPSTREAM", "remote-as", "65100"]),
    ("set_af_network", (AFI, "203.0.113.0/24"), "set", ["protocols", "bgp", "address-family", AFI, "network", "203.0.113.0/24"]),
    ("set_af_redistribute", (AFI, "connected"), "set", ["protocols", "bgp", "address-family", AFI, "redistribute", "connected"]),
    ("set_listen_range", ("192.0.2.0/24",), "set", ["protocols", "bgp", "listen", "range", "192.0.2.0/24"]),
    ("set_bmp_mirror_buffer_limit", ("4096",), "set", ["protocols", "bgp", "bmp", "mirror-buffer-limit", "4096"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_bgp_builder_paths(method, args, op, expected_path, version):
    builder = BgpBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]