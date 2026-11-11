"""The live pump and show parsers do not live in the request router.

Hardware, firewall statistics, and BGP status already have their own modules.
The dashboard pump and the remaining show parsers follow that split.
"""

import ast
import asyncio
import json
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace
from typing import cast

from fastapi import HTTPException, Request

import fastapi_permissions
from rbac_permissions import FeatureGroup, PermissionLevel

from interface_show import (
    InterfaceName,
    _interfaces_from_kernel,
    parse_interface_counters,
    parse_show_ethernet_names,
)
from wireguard_status import _parse_wg_handshake, _parse_wg_summary

ROOT = Path(__file__).resolve().parents[1]

# Closed set of top-level names the request router may own. Functions, classes,
# and assignments are all counted, so a leftover parser table fails this
# instead of a denylist that misses the next one.
ROUTER_NAMES = {
    "logger",
    "router",
    "dashboard_session_closed",
    "SystemMemory",
    "DiskPartition",
    "get_hardware_sensors",
    "firewall_statistics_access",
    "get_firewall_statistics",
    "_extract_show_output",
    "_fetch_graphql_hardware",
    "get_interface_counters",
    "AllInterfacesResponse",
    "_interfaces_from_config",
    "get_all_interfaces",
    "AvailableEthernetInterfacesResponse",
    "get_available_ethernet_interfaces",
    "get_system_updates",
    "retain_firewall_interest",
    "dashboard_stream",
}


def _assigned(node) -> set[str]:
    names = set()
    if isinstance(node, ast.Name):
        names.add(node.id)
    elif isinstance(node, (ast.Tuple, ast.List)):
        for elt in node.elts:
            names.update(_assigned(elt))
    return names


def _top_level(rel: str) -> set[str]:
    tree = ast.parse((ROOT / rel).read_text())
    names = set()
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.add(node.name)
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                names.update(_assigned(target))
        elif isinstance(node, ast.AnnAssign):
            names.update(_assigned(node.target))
    return names


def test_show_router_owns_only_endpoints():
    assert _top_level("routers/show.py") == ROUTER_NAMES
    show_src = _top_level("interface_show.py")
    assert "_interfaces_from_kernel" in show_src
    assert "_kernel_iface_type" in show_src
    assert "_KERNEL_KIND_TO_TYPE" in show_src
    assert "DeviceDataBroadcaster" in _top_level("dashboard_broadcaster.py")
    assert "_gql_result" not in _top_level("dashboard_broadcaster.py")
    assert "_gql_result" in _top_level("wireguard_status.py")


def test_pump_and_parsers_do_not_import_the_show_router():
    for rel in ("dashboard_broadcaster.py", "interface_show.py", "wireguard_status.py"):
        tree = ast.parse((ROOT / rel).read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module:
                assert node.module != "routers.show", rel
                assert not node.module.startswith("routers.show."), rel


def test_interface_counter_text_parser_reads_the_show_table():
    output = (
        "Interface    Rx Packets    Rx Bytes      Tx Packets    Tx Bytes      "
        "Rx Dropped    Tx Dropped    Rx Errors    Tx Errors\n"
        "-----------  ------------  ------------  ------------  ------------  "
        "------------  ------------  -----------  -----------\n"
        "eth0         10            20            30            40            "
        "1             2             3            4\n"
    )
    parsed = parse_interface_counters(output)
    assert len(parsed) == 1
    assert parsed[0].interface == "eth0"
    assert parsed[0].rx_packets == 10
    assert parsed[0].tx_errors == 4


def test_ethernet_show_text_keeps_only_physical_names():
    output = "eth0\neth1\nvlan10\neth2.10\n"
    assert parse_show_ethernet_names(output) == ["eth0", "eth1"]


def test_kernel_show_drops_pim_registers_and_keeps_config():
    config_index = {
        "eth0": InterfaceName(name="eth0", type="ethernet", description="wan"),
        "pppoe0": InterfaceName(name="pppoe0", type="pppoe", description=None),
    }
    raw = json.dumps([
        {"ifname": "eth0", "link_type": "ether", "ifalias": "ignored"},
        {"ifname": "pim6reg0", "link_type": "pimreg"},
        {"ifname": "veth0", "linkinfo": {"info_kind": "veth"}},
    ])
    names = {item.name: item for item in _interfaces_from_kernel(raw, config_index)}
    assert names["eth0"].type == "ethernet"
    assert names["eth0"].description == "wan"
    assert "pim6reg0" not in names
    assert names["veth0"].type == "virtual-ethernet"
    assert names["pppoe0"].type == "pppoe"


def test_wireguard_summary_text_records_handshake_seconds():
    pubkey = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP="
    output = (
        f"peer: {pubkey}\n"
        "  endpoint: 192.0.2.1:51820\n"
        "  latest handshake: 1 minute, 30 seconds ago\n"
        "  transfer: 1.00 KiB received, 2.00 KiB sent\n"
    )
    peers = _parse_wg_summary(output)
    assert pubkey in peers
    assert peers[pubkey]["endpoint"] == "192.0.2.1:51820"
    assert peers[pubkey]["latest_handshake_seconds"] == 90
    assert _parse_wg_handshake("(none)") is None


def test_show_read_routes_check_a_permission():
    """A device read in this router names the check. The shared catalog cannot use one feature."""
    tree = ast.parse((ROOT / "routers/show.py").read_text())
    handlers = {
        node.name: node
        for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef)
    }

    def calls(name):
        found = []
        for node in ast.walk(handlers[name]):
            if isinstance(node, ast.Call):
                func = getattr(node.func, "id", None)
                if func and func.startswith("require_"):
                    found.append((func, [getattr(arg, "attr", None) for arg in node.args]))
        return found

    assert ("require_read_permission", [None, "ETHERNET"]) in calls(
        "get_available_ethernet_interfaces"
    )
    assert ("require_read_permission", [None, "INTERFACES"]) in calls("get_interface_counters")
    assert ("require_read_permission", [None, "SYSTEM"]) in calls("get_system_updates")
    assert ("require_any_read_permission", [None]) in calls("get_all_interfaces")


def test_any_read_allows_one_feature_and_refuses_none(monkeypatch):
    @asynccontextmanager
    async def connection(request):
        yield object()

    async def not_admin(conn, user_id):
        return False

    grants = {feature: PermissionLevel.NONE for feature in FeatureGroup}

    async def permissions(conn, user_id, instance_id, org_id=None):
        return grants

    monkeypatch.setattr(fastapi_permissions, "request_scoped_conn", connection)
    monkeypatch.setattr(fastapi_permissions, "is_super_admin", not_admin)
    monkeypatch.setattr(fastapi_permissions, "get_user_permissions", permissions)

    request = cast(
        Request,
        SimpleNamespace(state=SimpleNamespace(user={"id": "u"}, instance={"id": "i"})),
    )
    grants[FeatureGroup.OSPF] = PermissionLevel.READ
    asyncio.run(fastapi_permissions.require_any_read_permission(request))

    grants[FeatureGroup.OSPF] = PermissionLevel.NONE
    try:
        asyncio.run(fastapi_permissions.require_any_read_permission(request))
    except HTTPException as exc:
        assert exc.status_code == 403
    else:
        raise AssertionError("a user with no feature read must be refused")

    bare = cast(Request, SimpleNamespace(state=SimpleNamespace()))
    try:
        asyncio.run(fastapi_permissions.require_any_read_permission(bare))
    except HTTPException as exc:
        assert exc.status_code == 401
    else:
        raise AssertionError("a missing user must be refused")
