"""VRF instance ops build the lab paths from the VRF mapper.

`vrf name <vrf> {description,table,vni}` are value leaves and
`ip|ipv6 protocol <p> route-map` takes one value, so each delete drops the
value. Every instance op on the builder has a row here.
"""

import inspect

import pytest

from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder

VRF = ["vrf", "name", "T-V"]

# (method, args, op, path)
CASES = [
    ("set_bind_to_all", (), "set", ["vrf", "bind-to-all"]),
    ("delete_bind_to_all", (), "delete", ["vrf", "bind-to-all"]),
    ("set_vrf", ("T-V",), "set", VRF),
    ("delete_vrf", ("T-V",), "delete", VRF),
    ("set_vrf_description", ("T-V", "lab"), "set", VRF + ["description", "lab"]),
    ("delete_vrf_description", ("T-V",), "delete", VRF + ["description"]),
    ("set_vrf_disable", ("T-V",), "set", VRF + ["disable"]),
    ("delete_vrf_disable", ("T-V",), "delete", VRF + ["disable"]),
    ("set_vrf_table", ("T-V", "100"), "set", VRF + ["table", "100"]),
    ("delete_vrf_table", ("T-V",), "delete", VRF + ["table"]),
    ("set_vrf_vni", ("T-V", "1000"), "set", VRF + ["vni", "1000"]),
    ("delete_vrf_vni", ("T-V",), "delete", VRF + ["vni"]),
    ("set_vrf_ip_disable_forwarding", ("T-V",), "set", VRF + ["ip", "disable-forwarding"]),
    ("delete_vrf_ip_disable_forwarding", ("T-V",), "delete", VRF + ["ip", "disable-forwarding"]),
    ("set_vrf_ip_nht_no_resolve_via_default", ("T-V",), "set", VRF + ["ip", "nht", "no-resolve-via-default"]),
    ("delete_vrf_ip_nht_no_resolve_via_default", ("T-V",), "delete",
     VRF + ["ip", "nht", "no-resolve-via-default"]),
    ("set_vrf_ip_protocol_route_map", ("T-V", "bgp,T-RM"), "set",
     VRF + ["ip", "protocol", "bgp", "route-map", "T-RM"]),
    ("delete_vrf_ip_protocol_route_map", ("T-V", "bgp"), "delete", VRF + ["ip", "protocol", "bgp", "route-map"]),
    ("set_vrf_ipv6_disable_forwarding", ("T-V",), "set", VRF + ["ipv6", "disable-forwarding"]),
    ("delete_vrf_ipv6_disable_forwarding", ("T-V",), "delete", VRF + ["ipv6", "disable-forwarding"]),
    ("set_vrf_ipv6_nht_no_resolve_via_default", ("T-V",), "set",
     VRF + ["ipv6", "nht", "no-resolve-via-default"]),
    ("delete_vrf_ipv6_nht_no_resolve_via_default", ("T-V",), "delete",
     VRF + ["ipv6", "nht", "no-resolve-via-default"]),
    ("set_vrf_ipv6_protocol_route_map", ("T-V", "ospfv3,T-RM"), "set",
     VRF + ["ipv6", "protocol", "ospfv3", "route-map", "T-RM"]),
    ("delete_vrf_ipv6_protocol_route_map", ("T-V", "ospfv3"), "delete",
     VRF + ["ipv6", "protocol", "ospfv3", "route-map"]),
]


@pytest.mark.parametrize("version", ["1.4", "2026.09.23-0027-rolling"])
@pytest.mark.parametrize("method, args, op, path", CASES, ids=[row[0] for row in CASES])
def test_instance_op_builds_the_lab_path(version, method, args, op, path):
    builder = VrfBatchBuilder(version)
    getattr(builder, method)(*args)
    assert builder.get_operations() == [{"op": op, "path": path}]


def test_every_instance_op_has_a_row():
    ops = {
        name
        for name, _ in inspect.getmembers(VrfBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    }
    assert ops == {row[0] for row in CASES}
