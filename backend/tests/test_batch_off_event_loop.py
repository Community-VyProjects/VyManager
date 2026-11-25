"""Named async routes must not call blocking VyOS I/O on the event loop.

Same rule as NTP and BFD: execute_batch goes through run_in_threadpool.
generate_openvpn_shared_secret has no execute_batch; its blocking call is
device.generate, and that call is offloaded the same way.
get_full_config on the named config handlers is offloaded the same way.
"""

import ast
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]

# handler, file, blocking attribute, expected offload count
OFFLOADED = [
    ("wireguard_interface_batch", "routers/wireguard/wireguard.py", "execute_batch", 1),
    ("wireguard_peer_batch", "routers/wireguard/wireguard.py", "execute_batch", 1),
    ("container_batch_configure", "routers/container/container.py", "execute_batch", 1),
    ("pim6_batch_configure", "routers/pim6/pim6.py", "execute_batch", 1),
    ("console_server_batch_configure", "routers/console_server/console_server.py", "execute_batch", 1),
    ("tftp_server_batch_configure", "routers/tftp_server/tftp_server.py", "execute_batch", 1),
    ("nhrp_batch_configure", "routers/nhrp/nhrp.py", "execute_batch", 1),
    ("rpki_batch_configure", "routers/rpki/rpki.py", "execute_batch", 1),
    ("service_monitoring_batch_configure", "routers/service_monitoring/service_monitoring.py", "execute_batch", 1),
    ("broadcast_relay_batch_configure", "routers/broadcast_relay/broadcast_relay.py", "execute_batch", 1),
    ("ntp_batch_configure", "routers/ntp/ntp.py", "execute_batch", 1),
    ("event_handler_batch_configure", "routers/event_handler/event_handler.py", "execute_batch", 1),
    ("batch_configure_nat", "routers/nat/nat.py", "execute_batch", 1),
    ("reorder_nat_rules", "routers/nat/nat.py", "execute_batch", 1),
    ("batch_configure", "routers/high_availability/high_availability.py", "execute_batch", 1),
    ("pki_batch_configure", "routers/pki/pki.py", "execute_batch", 1),
    ("generate_ca", "routers/pki/pki.py", "execute_batch", 1),
    ("generate_key_pair", "routers/pki/pki.py", "execute_batch", 1),
    ("generate_dh", "routers/pki/pki.py", "execute_batch", 1),
    ("generate_certificate", "routers/pki/pki.py", "execute_batch", 1),
    ("generate_openvpn_shared_secret", "routers/pki/pki.py", "generate", 1),
    ("generate_openssh", "routers/pki/pki.py", "execute_batch", 2),
]

# Same offload, added for the remaining config readers and the batch
# handlers in those files. Ids include the path so they stay unique.
REMAINING_OFFLOADED = [
    ("get_config", "routers/nat64/nat64.py", "get_full_config", 1),
    ("batch_configure", "routers/nat64/nat64.py", "execute_batch", 1),
    ("reorder_nat64_rules", "routers/nat64/nat64.py", "execute_batch", 1),
    ("get_config", "routers/nat66/nat66.py", "get_full_config", 1),
    ("batch_configure", "routers/nat66/nat66.py", "execute_batch", 1),
    ("reorder_nat66_rules", "routers/nat66/nat66.py", "execute_batch", 1),
    ("get_l2tp_config", "routers/l2tp/l2tp.py", "get_full_config", 1),
    ("l2tp_batch_configure", "routers/l2tp/l2tp.py", "execute_batch", 1),
    ("get_ipsec_config", "routers/ipsec/ipsec.py", "get_full_config", 1),
    ("ipsec_batch_configure", "routers/ipsec/ipsec.py", "execute_batch", 1),
    ("get_config", "routers/load_balancing/load_balancing.py", "get_full_config", 1),
    ("batch_configure", "routers/load_balancing/load_balancing.py", "execute_batch", 1),
    ("get_available_ethernet_interfaces", "routers/show.py", "get_full_config", 1),
    ("get_available_ethernet_interfaces", "routers/show.py", "show", 1),
    ("get_interface_counters", "routers/show.py", "show", 1),
    ("get_system_updates", "routers/show.py", "show", 1),
    ("get_all_interfaces", "routers/show.py", "get_full_config", 1),
    ("get_all_interfaces", "routers/show.py", "show", 1),
    ("get_dhcp_config", "routers/dhcp_server/dhcp_server.py", "get_full_config", 1),
    ("dhcp_batch_configure", "routers/dhcp_server/dhcp_server.py", "execute_batch", 1),
    ("get_webproxy_config", "routers/webproxy/webproxy.py", "get_full_config", 1),
    ("webproxy_batch_configure", "routers/webproxy/webproxy.py", "execute_batch", 1),
    ("get_isis_config", "routers/isis/isis.py", "get_full_config", 1),
    ("isis_batch_configure", "routers/isis/isis.py", "execute_batch", 1),
    ("get_local_route_config", "routers/local_route/local_route.py", "get_full_config", 1),
    ("local_route_batch_configure", "routers/local_route/local_route.py", "execute_batch", 1),
    ("local_route_reorder_rules", "routers/local_route/local_route.py", "execute_batch", 1),
    ("get_groups_config", "routers/firewall/groups.py", "get_full_config", 1),
    ("configure_group_batch", "routers/firewall/groups.py", "execute_batch", 1),
]

# Firewall family batch and reorder. Ids include the path so batch_configure
# does not collide with the same handler name in other files.
FIREWALL_FAMILY_OFFLOADED = [
    ("batch_configure", "routers/firewall/family.py", "execute_batch", 1),
    ("reorder_rules", "routers/firewall/family.py", "execute_batch", 1),
]

FIREWALL_FLOWTABLES_OFFLOADED = [
    ("get_flowtables_config", "routers/firewall/flowtables.py", "get_full_config", 1),
    ("batch_configure_flowtable", "routers/firewall/flowtables.py", "execute_batch", 1),
]

FIREWALL_ZONES_OFFLOADED = [
    ("get_config", "routers/firewall/zones.py", "get_full_config", 1),
    ("batch_configure", "routers/firewall/zones.py", "execute_batch", 1),
    ("provision_zone", "routers/firewall/zones.py", "execute_batch", 1),
    ("provision_zone", "routers/firewall/zones.py", "get_full_config", 1),
    ("deprovision_zone", "routers/firewall/zones.py", "execute_batch", 1),
    ("deprovision_zone", "routers/firewall/zones.py", "get_full_config", 1),
]

FIREWALL_BRIDGE_OFFLOADED = [
    ("configure_bridge_batch", "routers/firewall/bridge.py", "execute_batch", 1),
    ("reorder_bridge_rules", "routers/firewall/bridge.py", "execute_batch", 1),
]

BABEL_OFFLOADED = [
    ("babel_batch_configure", "routers/babel/babel.py", "execute_batch", 1),
]

BGP_OFFLOADED = [
    ("get_bgp_config", "routers/bgp/bgp.py", "get_full_config", 1),
    ("bgp_batch_configure", "routers/bgp/bgp.py", "execute_batch", 1),
]

CONNTRACK_SYNC_OFFLOADED = [
    ("get_conntrack_sync_config", "routers/conntrack_sync/conntrack_sync.py", "get_full_config", 1),
    ("conntrack_sync_batch_configure", "routers/conntrack_sync/conntrack_sync.py", "execute_batch", 1),
]

SURICATA_OFFLOADED = [
    ("get_suricata_config", "routers/suricata/suricata.py", "get_full_config", 1),
    ("suricata_batch_configure", "routers/suricata/suricata.py", "execute_batch", 1),
]

HTTPS_OFFLOADED = [
    ("get_https_config", "routers/https/https.py", "get_full_config", 1),
    ("https_batch_configure", "routers/https/https.py", "execute_batch", 1),
]

OSPF_OFFLOADED = [
    ("get_ospf_config", "routers/ospf/ospf.py", "get_full_config", 1),
    ("ospf_batch_configure", "routers/ospf/ospf.py", "execute_batch", 1),
]

IPOE_SERVER_OFFLOADED = [
    ("get_ipoe_config", "routers/ipoe_server/ipoe_server.py", "get_full_config", 1),
    ("ipoe_batch_configure", "routers/ipoe_server/ipoe_server.py", "execute_batch", 1),
]

POLICY_LIST_OFFLOADED = [
    ("get_config", "routers/policy_list/policy_list.py", "get_full_config", 1),
    ("batch_configure", "routers/policy_list/policy_list.py", "execute_batch", 1),
    ("reorder_rules", "routers/policy_list/policy_list.py", "execute_batch", 1),
]

SEGMENT_ROUTING_OFFLOADED = [
    ("get_segment_routing_config", "routers/segment_routing/segment_routing.py", "get_full_config", 1),
    ("segment_routing_batch_configure", "routers/segment_routing/segment_routing.py", "execute_batch", 1),
]

VRF_OFFLOADED = [
    ("get_vrf_config", "routers/vrf/vrf.py", "get_full_config", 1),
    ("vrf_batch_configure", "routers/vrf/vrf.py", "execute_batch", 1),
]

STATIC_ROUTES_OFFLOADED = [
    ("get_static_routes_config", "routers/static_routes/static_routes.py", "get_full_config", 1),
    ("static_routes_batch_configure", "routers/static_routes/static_routes.py", "execute_batch", 1),
]

BFD_OFFLOADED = [
    ("get_bfd_config", "routers/bfd/bfd.py", "get_full_config", 1),
    ("bfd_batch_configure", "routers/bfd/bfd.py", "execute_batch", 1),
    ("get_bfd_status", "routers/bfd/bfd.py", "show", 1),
]

WIREGUARD_OFFLOADED = [
    ("generate_keypair", "routers/wireguard/wireguard.py", "generate", 1),
    ("generate_psk", "routers/wireguard/wireguard.py", "generate", 1),
    ("get_interface_status", "routers/wireguard/wireguard.py", "show", 1),
    ("get_interface_public_key", "routers/wireguard/wireguard.py", "show", 1),
]

RIP_OFFLOADED = [
    ("get_rip_config", "routers/rip/rip.py", "get_full_config", 1),
    ("rip_batch_configure", "routers/rip/rip.py", "execute_batch", 1),
]

CONSOLE_SERVER_OFFLOADED = [
    ("get_console_server_config", "routers/console_server/console_server.py", "get_full_config", 1),
]

TFTP_SERVER_OFFLOADED = [
    ("get_tftp_server_config", "routers/tftp_server/tftp_server.py", "get_full_config", 1),
]

NHRP_OFFLOADED = [
    ("get_nhrp_config", "routers/nhrp/nhrp.py", "get_full_config", 1),
]

RPKI_OFFLOADED = [
    ("get_rpki_config", "routers/rpki/rpki.py", "get_full_config", 1),
]

SERVICE_MONITORING_OFFLOADED = [
    ("get_service_monitoring_config", "routers/service_monitoring/service_monitoring.py", "get_full_config", 1),
]

BROADCAST_RELAY_OFFLOADED = [
    ("get_broadcast_relay_config", "routers/broadcast_relay/broadcast_relay.py", "get_full_config", 1),
]

NTP_OFFLOADED = [
    ("get_ntp_config", "routers/ntp/ntp.py", "get_full_config", 1),
]

PPPOE_SERVER_OFFLOADED = [
    ("get_pppoe_config", "routers/pppoe_server/pppoe_server.py", "get_full_config", 1),
    ("reset_pppoe_session", "routers/pppoe_server/pppoe_server.py", "reset", 1),
    ("pppoe_batch_configure", "routers/pppoe_server/pppoe_server.py", "execute_batch", 1),
]

VXLAN_OFFLOADED = [
    ("get_vxlan_config", "routers/vxlan/vxlan.py", "get_full_config", 1),
    ("vxlan_batch_configure", "routers/vxlan/vxlan.py", "execute_batch", 1),
]

CONTAINER_OFFLOADED = [
    ("get_container_config", "routers/container/container.py", "get_full_config", 1),
    ("_configured_container_image", "routers/container/container.py", "get_full_config", 1),
    ("_show_output", "routers/container/container.py", "show", 1),
]

# reboot_system and poweroff_system send through _run_power_action.
POWER_OFFLOADED = [
    ("_run_power_action", "routers/power.py", "reboot", 1),
    ("_run_power_action", "routers/power.py", "poweroff", 1),
    ("get_scheduled_power_status", "routers/power.py", "show", 1),
    ("get_vyos_timezone", "routers/power.py", "get_full_config", 1),
]

# handler, file, blocking attribute, expected offload count
CONFIG_OFFLOADED = [
    ("get_pki_config", "routers/pki/pki.py", "get_full_config", 1),
    ("reveal_pki_value", "routers/pki/pki.py", "get_full_config", 1),
    ("generate_certificate", "routers/pki/pki.py", "get_full_config", 1),
    ("get_wireguard_config", "routers/wireguard/wireguard.py", "get_full_config", 1),
    ("get_config", "routers/high_availability/high_availability.py", "get_full_config", 1),
]


def _handler(path: Path, name: str) -> ast.AsyncFunctionDef:
    tree = ast.parse(path.read_text())
    return next(
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.AsyncFunctionDef) and node.name == name
    )


def _direct_calls(handler: ast.AST, attr: str) -> list[ast.Call]:
    return [
        node
        for node in ast.walk(handler)
        if isinstance(node, ast.Call) and getattr(node.func, "attr", None) == attr
    ]


def _offloaded(handler: ast.AST, attr: str) -> list[ast.Await]:
    found = []
    for node in ast.walk(handler):
        if not isinstance(node, ast.Await):
            continue
        call = node.value
        if not isinstance(call, ast.Call):
            continue
        func = call.func
        if not (isinstance(func, ast.Name) and func.id == "run_in_threadpool"):
            continue
        if (
            call.args
            and isinstance(call.args[0], ast.Attribute)
            and call.args[0].attr == attr
        ):
            found.append(node)
    return found


@pytest.mark.parametrize(
    "name,rel,attr,count",
    OFFLOADED,
    ids=[row[0] for row in OFFLOADED],
)
def test_named_handler_runs_blocking_io_off_the_event_loop(name, rel, attr, count):
    handler = _handler(BACKEND / rel, name)
    assert not _direct_calls(handler, attr), f"{attr} must not run on the event loop"
    assert len(_offloaded(handler, attr)) == count, (
        f"{attr} must go through run_in_threadpool"
    )


@pytest.mark.parametrize(
    "name,rel,attr,count",
    CONFIG_OFFLOADED,
    ids=[row[0] for row in CONFIG_OFFLOADED],
)
def test_named_config_handler_reads_config_off_the_event_loop(name, rel, attr, count):
    handler = _handler(BACKEND / rel, name)
    assert not _direct_calls(handler, attr), f"{attr} must not run on the event loop"
    assert len(_offloaded(handler, attr)) == count, (
        f"{attr} must go through run_in_threadpool"
    )


@pytest.mark.parametrize(
    "name,rel,attr,count",
    REMAINING_OFFLOADED + FIREWALL_FAMILY_OFFLOADED + FIREWALL_FLOWTABLES_OFFLOADED + FIREWALL_ZONES_OFFLOADED + FIREWALL_BRIDGE_OFFLOADED + BABEL_OFFLOADED + BGP_OFFLOADED + CONNTRACK_SYNC_OFFLOADED + SURICATA_OFFLOADED + HTTPS_OFFLOADED + OSPF_OFFLOADED + IPOE_SERVER_OFFLOADED + POLICY_LIST_OFFLOADED + SEGMENT_ROUTING_OFFLOADED + STATIC_ROUTES_OFFLOADED + VRF_OFFLOADED + POWER_OFFLOADED + BFD_OFFLOADED + WIREGUARD_OFFLOADED + RIP_OFFLOADED + CONSOLE_SERVER_OFFLOADED + CONTAINER_OFFLOADED + TFTP_SERVER_OFFLOADED + NHRP_OFFLOADED + RPKI_OFFLOADED + SERVICE_MONITORING_OFFLOADED + BROADCAST_RELAY_OFFLOADED + NTP_OFFLOADED + PPPOE_SERVER_OFFLOADED + VXLAN_OFFLOADED,
    ids=[f"{row[1]}:{row[0]}:{row[2]}" for row in REMAINING_OFFLOADED + FIREWALL_FAMILY_OFFLOADED + FIREWALL_FLOWTABLES_OFFLOADED + FIREWALL_ZONES_OFFLOADED + FIREWALL_BRIDGE_OFFLOADED + BABEL_OFFLOADED + BGP_OFFLOADED + CONNTRACK_SYNC_OFFLOADED + SURICATA_OFFLOADED + HTTPS_OFFLOADED + OSPF_OFFLOADED + IPOE_SERVER_OFFLOADED + POLICY_LIST_OFFLOADED + SEGMENT_ROUTING_OFFLOADED + STATIC_ROUTES_OFFLOADED + VRF_OFFLOADED + POWER_OFFLOADED + BFD_OFFLOADED + WIREGUARD_OFFLOADED + RIP_OFFLOADED + CONSOLE_SERVER_OFFLOADED + CONTAINER_OFFLOADED + TFTP_SERVER_OFFLOADED + NHRP_OFFLOADED + RPKI_OFFLOADED + SERVICE_MONITORING_OFFLOADED + BROADCAST_RELAY_OFFLOADED + NTP_OFFLOADED + PPPOE_SERVER_OFFLOADED + VXLAN_OFFLOADED],
)
def test_remaining_config_io_runs_off_the_event_loop(name, rel, attr, count):
    handler = _handler(BACKEND / rel, name)
    assert not _direct_calls(handler, attr), f"{attr} must not run on the event loop"
    assert len(_offloaded(handler, attr)) == count, (
        f"{attr} must go through run_in_threadpool"
    )


def _handler_names(exc):
    names = set()
    etype = exc.type
    if isinstance(etype, ast.Name):
        names.add(etype.id)
    elif isinstance(etype, ast.Tuple):
        names.update(e.id for e in etype.elts if isinstance(e, ast.Name))
    return names


# handler, file: ValueError (a missing leaf) is HTTP 400 around the op loop;
# an empty batch ValueError from execute_batch stays a 500.
VALUE_ERROR_SCOPED = [
    ("batch_configure", "routers/load_balancing/load_balancing.py"),
    ("local_route_batch_configure", "routers/local_route/local_route.py"),
    ("local_route_reorder_rules", "routers/local_route/local_route.py"),
    ("configure_group_batch", "routers/firewall/groups.py"),
]

FIREWALL_FAMILY_VALUE_ERROR = [
    ("batch_configure", "routers/firewall/family.py"),
    ("reorder_rules", "routers/firewall/family.py"),
]

FIREWALL_BRIDGE_VALUE_ERROR = [
    ("configure_bridge_batch", "routers/firewall/bridge.py"),
    ("reorder_bridge_rules", "routers/firewall/bridge.py"),
]

BABEL_VALUE_ERROR = [
    ("babel_batch_configure", "routers/babel/babel.py"),
]

BGP_VALUE_ERROR = [
    ("bgp_batch_configure", "routers/bgp/bgp.py"),
]

SURICATA_VALUE_ERROR = [
    ("suricata_batch_configure", "routers/suricata/suricata.py"),
]

HTTPS_VALUE_ERROR = [
    ("https_batch_configure", "routers/https/https.py"),
]

OSPF_VALUE_ERROR = [
    ("ospf_batch_configure", "routers/ospf/ospf.py"),
]

L2TP_VALUE_ERROR = [
    ("l2tp_batch_configure", "routers/l2tp/l2tp.py"),
]

NAT66_VALUE_ERROR = [
    ("batch_configure", "routers/nat66/nat66.py"),
    ("reorder_nat66_rules", "routers/nat66/nat66.py"),
]

IPOE_SERVER_VALUE_ERROR = [
    ("ipoe_batch_configure", "routers/ipoe_server/ipoe_server.py"),
]

STATIC_ROUTES_VALUE_ERROR = [
    ("static_routes_batch_configure", "routers/static_routes/static_routes.py"),
]

VRF_VALUE_ERROR = [
    ("vrf_batch_configure", "routers/vrf/vrf.py"),
]

RIP_VALUE_ERROR = [
    ("rip_batch_configure", "routers/rip/rip.py"),
]

CONNTRACK_SYNC_VALUE_ERROR = [
    ("conntrack_sync_batch_configure", "routers/conntrack_sync/conntrack_sync.py"),
]

FIREWALL_ZONES_VALUE_ERROR = [
    ("batch_configure", "routers/firewall/zones.py"),
]

CONTAINER_VALUE_ERROR = [
    ("container_batch_configure", "routers/container/container.py"),
]

RPKI_VALUE_ERROR = [
    ("rpki_batch_configure", "routers/rpki/rpki.py"),
]

SERVICE_MONITORING_VALUE_ERROR = [
    ("service_monitoring_batch_configure", "routers/service_monitoring/service_monitoring.py"),
]

NTP_VALUE_ERROR = [
    ("ntp_batch_configure", "routers/ntp/ntp.py"),
]

PPPOE_SERVER_VALUE_ERROR = [
    ("pppoe_batch_configure", "routers/pppoe_server/pppoe_server.py"),
]

VXLAN_VALUE_ERROR = [
    ("vxlan_batch_configure", "routers/vxlan/vxlan.py"),
]


@pytest.mark.parametrize(
    "name,rel",
    VALUE_ERROR_SCOPED + FIREWALL_FAMILY_VALUE_ERROR + FIREWALL_BRIDGE_VALUE_ERROR + BABEL_VALUE_ERROR + BGP_VALUE_ERROR + SURICATA_VALUE_ERROR + HTTPS_VALUE_ERROR + OSPF_VALUE_ERROR + IPOE_SERVER_VALUE_ERROR + L2TP_VALUE_ERROR + NAT66_VALUE_ERROR + STATIC_ROUTES_VALUE_ERROR + VRF_VALUE_ERROR + RIP_VALUE_ERROR + CONNTRACK_SYNC_VALUE_ERROR + FIREWALL_ZONES_VALUE_ERROR + CONTAINER_VALUE_ERROR + RPKI_VALUE_ERROR + SERVICE_MONITORING_VALUE_ERROR + NTP_VALUE_ERROR + PPPOE_SERVER_VALUE_ERROR + VXLAN_VALUE_ERROR,
    ids=[f"{row[1]}:{row[0]}" for row in VALUE_ERROR_SCOPED + FIREWALL_FAMILY_VALUE_ERROR + FIREWALL_BRIDGE_VALUE_ERROR + BABEL_VALUE_ERROR + BGP_VALUE_ERROR + SURICATA_VALUE_ERROR + HTTPS_VALUE_ERROR + OSPF_VALUE_ERROR + IPOE_SERVER_VALUE_ERROR + L2TP_VALUE_ERROR + NAT66_VALUE_ERROR + STATIC_ROUTES_VALUE_ERROR + VRF_VALUE_ERROR + RIP_VALUE_ERROR + CONNTRACK_SYNC_VALUE_ERROR + FIREWALL_ZONES_VALUE_ERROR + CONTAINER_VALUE_ERROR + RPKI_VALUE_ERROR + SERVICE_MONITORING_VALUE_ERROR + NTP_VALUE_ERROR + PPPOE_SERVER_VALUE_ERROR + VXLAN_VALUE_ERROR],
)
def test_value_error_does_not_wrap_execute_batch(name, rel):
    """A missing leaf is HTTP 400. An empty batch ValueError stays a 500."""
    handler = _handler(BACKEND / rel, name)
    value_error_tries = []
    for node in ast.walk(handler):
        if not isinstance(node, ast.Try):
            continue
        for exc in node.handlers:
            if isinstance(exc, ast.ExceptHandler) and "ValueError" in _handler_names(exc):
                value_error_tries.append(node)

    assert value_error_tries, f"{name} must catch ValueError"
    for try_node in value_error_tries:
        for call in ast.walk(try_node):
            if not isinstance(call, ast.Call):
                continue
            func = call.func
            called = getattr(func, "attr", None) or getattr(func, "id", None)
            assert called != "execute_batch", "ValueError handler must not wrap execute_batch"

    offloaded = _offloaded(handler, "execute_batch")
    assert len(offloaded) == 1
    covered = set()
    for try_node in value_error_tries:
        covered.update(range(try_node.lineno, (try_node.end_lineno or try_node.lineno) + 1))
    for node in offloaded:
        assert node.lineno not in covered
