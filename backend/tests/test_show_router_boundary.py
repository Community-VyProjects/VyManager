"""The live pump and show-text parsers do not live in the request router.

Hardware, firewall statistics, and BGP status already have their own modules.
The dashboard pump and the remaining show-text parsers follow that split.
"""

import ast
from pathlib import Path

from interface_show import parse_interface_counters, parse_show_ethernet_names
from wireguard_status import _parse_wg_handshake, _parse_wg_summary

ROOT = Path(__file__).resolve().parents[1]


def _defined(rel: str) -> set[str]:
    tree = ast.parse((ROOT / rel).read_text())
    names = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.add(node.name)
    return names


def test_show_router_does_not_own_the_pump_or_show_text_parsers():
    router = _defined("routers/show.py")
    for name in (
        "DeviceDataBroadcaster",
        "parse_interface_counters",
        "parse_gql_interface_counters",
        "parse_gql_memory",
        "_parse_vyos_text_config",
        "_parse_wg_summary",
        "_parse_wg_handshake",
        "_collect_wg_from_gql",
    ):
        assert name not in router, name

    assert "DeviceDataBroadcaster" in _defined("dashboard_broadcaster.py")
    assert "parse_interface_counters" in _defined("interface_show.py")
    assert "_parse_wg_summary" in _defined("wireguard_status.py")


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
