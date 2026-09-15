"""PPPoE session connections use show conntrack table ipv4/ipv6.

`show conntrack` is incomplete on 1.4 and 1.5 (lab-checked with
vyatta-op-cmd-wrapper). The table family command returns rows.
"""

from pathlib import Path

from pppoe_connections import conntrack_show_path

REPO = Path(__file__).resolve().parents[2]
ROUTER = REPO / "backend/routers/pppoe_server/pppoe_server.py"
PAGE = REPO / "frontend/src/app/service/pppoe-server/page.tsx"


def test_ipv4_uses_conntrack_table_ipv4():
    assert conntrack_show_path("100.127.200.187") == ["conntrack", "table", "ipv4"]


def test_ipv6_uses_conntrack_table_ipv6():
    assert conntrack_show_path("2001:db8::1") == ["conntrack", "table", "ipv6"]


def test_router_does_not_show_bare_conntrack():
    text = ROUTER.read_text()
    assert "conntrack_show_path" in text
    assert 'path=["conntrack"]' not in text


def test_page_reads_api_error_message():
    text = PAGE.read_text()
    assert "thrownMessage" in text
    assert 'err instanceof Error ? err.message : "Failed to load connections"' not in text
