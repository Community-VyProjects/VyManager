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
    ("delete_bmp_target_monitor", ("T1", AFI, "pre-policy"), "delete", ["protocols", "bgp", "bmp", "target", "T1", "monitor", AFI, "pre-policy"]),
    ("delete_bmp_target_address", ("T1",), "delete", ["protocols", "bgp", "bmp", "target", "T1", "address"]),
    ("delete_bmp_target_port", ("T1",), "delete", ["protocols", "bgp", "bmp", "target", "T1", "port"]),
    ("delete_bmp_target_min_retry", ("T1",), "delete", ["protocols", "bgp", "bmp", "target", "T1", "min-retry"]),
    ("delete_bmp_target_max_retry", ("T1",), "delete", ["protocols", "bgp", "bmp", "target", "T1", "max-retry"]),
    ("delete_bmp_target_mirror", ("T1",), "delete", ["protocols", "bgp", "bmp", "target", "T1", "mirror"]),
    ("delete_neighbor_bfd_profile", (NEIGHBOR,), "delete", ["protocols", "bgp", "neighbor", NEIGHBOR, "bfd", "profile"]),
    ("delete_neighbor_af_route_map_import", (NEIGHBOR, AFI), "delete", ["protocols", "bgp", "neighbor", NEIGHBOR, "address-family", AFI, "route-map", "import"]),
    ("set_af_redistribute_table", (AFI, "10"), "set", ["protocols", "bgp", "address-family", AFI, "redistribute", "table", "10"]),
    ("delete_af_redistribute_table", (AFI, "10"), "delete", ["protocols", "bgp", "address-family", AFI, "redistribute", "table", "10"]),
]

ONLY_15 = [
    ("set_parameters_as_notation", ("asdot",), "set", ["protocols", "bgp", "parameters", "as-notation", "asdot"]),
    ("delete_parameters_as_notation", (), "delete", ["protocols", "bgp", "parameters", "as-notation"]),
    ("set_parameters_input_queue_limit", ("100",), "set", ["protocols", "bgp", "parameters", "input-queue-limit", "100"]),
    ("delete_parameters_output_queue_limit", (), "delete", ["protocols", "bgp", "parameters", "output-queue-limit"]),
    ("set_parameters_update_delay_establish_wait", ("30",), "set", ["protocols", "bgp", "parameters", "update-delay", "establish-wait", "30"]),
    ("delete_parameters_update_delay_max_delay", (), "delete", ["protocols", "bgp", "parameters", "update-delay", "max-delay"]),
    ("set_neighbor_link_state", (NEIGHBOR,), "set", ["protocols", "bgp", "neighbor", NEIGHBOR, "address-family", "link-state"]),
    ("delete_neighbor_link_state", (NEIGHBOR,), "delete", ["protocols", "bgp", "neighbor", NEIGHBOR, "address-family", "link-state"]),
    ("set_neighbor_bfd_strict", (NEIGHBOR,), "set", ["protocols", "bgp", "neighbor", NEIGHBOR, "bfd", "strict"]),
    ("delete_neighbor_bfd_strict", (NEIGHBOR,), "delete", ["protocols", "bgp", "neighbor", NEIGHBOR, "bfd", "strict"]),
    ("delete_neighbor_bfd_strict_hold_time", (NEIGHBOR,), "delete", ["protocols", "bgp", "neighbor", NEIGHBOR, "bfd", "strict", "hold-time"]),
    ("set_neighbor_bfd_strict_hold_time", (NEIGHBOR, "5"), "set", ["protocols", "bgp", "neighbor", NEIGHBOR, "bfd", "strict", "hold-time", "5"]),
    ("set_peer_group_solo", ("UPSTREAM",), "set", ["protocols", "bgp", "peer-group", "UPSTREAM", "solo"]),
    ("delete_peer_group_solo", ("UPSTREAM",), "delete", ["protocols", "bgp", "peer-group", "UPSTREAM", "solo"]),
    ("set_peer_group_link_state", ("UPSTREAM",), "set", ["protocols", "bgp", "peer-group", "UPSTREAM", "address-family", "link-state"]),
    ("delete_peer_group_link_state", ("UPSTREAM",), "delete", ["protocols", "bgp", "peer-group", "UPSTREAM", "address-family", "link-state"]),
    ("set_peer_group_bfd_strict", ("UPSTREAM",), "set", ["protocols", "bgp", "peer-group", "UPSTREAM", "bfd", "strict"]),
    ("delete_peer_group_bfd_strict", ("UPSTREAM",), "delete", ["protocols", "bgp", "peer-group", "UPSTREAM", "bfd", "strict"]),
    ("set_peer_group_bfd_strict_hold_time", ("UPSTREAM", "5"), "set", ["protocols", "bgp", "peer-group", "UPSTREAM", "bfd", "strict", "hold-time", "5"]),
    ("delete_peer_group_bfd_strict_hold_time", ("UPSTREAM",), "delete", ["protocols", "bgp", "peer-group", "UPSTREAM", "bfd", "strict", "hold-time"]),
    ("delete_parameters_input_queue_limit", (), "delete", ["protocols", "bgp", "parameters", "input-queue-limit"]),
    ("set_parameters_output_queue_limit", ("100",), "set", ["protocols", "bgp", "parameters", "output-queue-limit", "100"]),
    ("delete_parameters_update_delay_establish_wait", (), "delete", ["protocols", "bgp", "parameters", "update-delay", "establish-wait"]),
    ("set_parameters_update_delay_max_delay", ("60",), "set", ["protocols", "bgp", "parameters", "update-delay", "max-delay", "60"]),
    ("set_bmp_target_monitor", ("T1", AFI, "local-rib"), "set", ["protocols", "bgp", "bmp", "target", "T1", "monitor", AFI, "local-rib"]),
    ("set_af_redistribute", ("ipv4-unicast", "nhrp"), "set", ["protocols", "bgp", "address-family", "ipv4-unicast", "redistribute", "nhrp"]),
    ("set_af_redistribute_table_metric", ("ipv6-unicast", "10", "20"), "set", ["protocols", "bgp", "address-family", "ipv6-unicast", "redistribute", "table", "10", "metric", "20"]),
    ("set_af_redistribute_table_route_map", ("ipv6-unicast", "10", "RM"), "set", ["protocols", "bgp", "address-family", "ipv6-unicast", "redistribute", "table", "10", "route-map", "RM"]),
    ("set_bmp_target_source_interface", ("T1", "eth0"), "set", ["protocols", "bgp", "bmp", "target", "T1", "source-interface", "eth0"]),
    ("delete_bmp_target_source_interface", ("T1",), "delete", ["protocols", "bgp", "bmp", "target", "T1", "source-interface"]),
    ("set_af_redistribute", ("ipv6-unicast", "nhrp"), "set", ["protocols", "bgp", "address-family", "ipv6-unicast", "redistribute", "nhrp"]),
    ("set_af_redistribute_table", ("ipv6-unicast", "10"), "set", ["protocols", "bgp", "address-family", "ipv6-unicast", "redistribute", "table", "10"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_bgp_builder_paths(method, args, op, expected_path, version):
    builder = BgpBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", ONLY_15)
def test_bgp_builder_paths_1_5_only(method, args, op, expected_path):
    builder = BgpBatchBuilder(version="2026.09.23-rolling")
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]
    with pytest.raises(ValueError):
        BgpBatchBuilder(version="1.4.3").__getattribute__(method)(*args)