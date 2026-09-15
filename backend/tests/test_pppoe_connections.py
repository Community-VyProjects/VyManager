"""PPPoE session connections use GraphQL ShowConntrack.

ShowConntrack(family: inet|inet6) is the op-mode table dump on 1.4 and 1.5.
`show conntrack` is incomplete. Do not fall back to REST device.show.
"""

import json
from pathlib import Path

import pytest

from pppoe_connections import (
    ConntrackUnavailable,
    connections_from_graphql_body,
    conntrack_family,
    parse_conntrack_result,
    show_conntrack_query,
    show_conntrack_snapshot_query,
    snapshot_from_graphql_body,
)

REPO = Path(__file__).resolve().parents[2]
ROUTER = REPO / "backend/routers/pppoe_server/pppoe_server.py"
PAGE = REPO / "frontend/src/app/service/pppoe-server/page.tsx"

FLOW = {
    "meta": [
        {
            "direction": "original",
            "layer3": {"src": "100.127.200.187", "dst": "1.1.1.1", "protoname": "ipv4"},
            "layer4": {"protoname": "tcp", "sport": "51234", "dport": "443"},
        },
        {
            "direction": "reply",
            "layer3": {"src": "1.1.1.1", "dst": "100.127.200.187", "protoname": "ipv4"},
            "layer4": {"protoname": "tcp", "sport": "443", "dport": "51234"},
        },
        {
            "direction": "independent",
            "id": "42",
            "state": "ESTABLISHED",
            "timeout": "100",
            "mark": "0",
        },
    ]
}


def test_family_from_session_ip():
    assert conntrack_family("100.127.200.187") == "inet"
    assert conntrack_family("2001:db8::1") == "inet6"


def test_query_json_dumps_key_and_enum_family():
    query = show_conntrack_query("k\"ey", "inet")
    assert "ShowConntrack" in query
    assert json.dumps("k\"ey") in query
    assert "family: inet" in query
    assert "family: \"inet\"" not in query
    with pytest.raises(ValueError):
        show_conntrack_query("k", "ipv4")


def test_parse_filters_by_session_ip():
    result = {"conntrack": {"flow": [FLOW, {"meta": [{"direction": "original", "layer3": {"src": "10.0.0.1", "dst": "10.0.0.2"}}]}]}}
    lines = parse_conntrack_result(result, "100.127.200.187")
    assert len(lines) == 1
    assert "100.127.200.187:51234" in lines[0]
    assert "1.1.1.1:443" in lines[0]
    assert "ESTABLISHED" in lines[0]


def test_parse_empty_and_error():
    assert parse_conntrack_result({"conntrack": {"error": True, "reason": "entries not found"}}, "10.0.0.1") == []
    assert parse_conntrack_result(None, "10.0.0.1") == []
    single = {"conntrack": {"flow": FLOW}}
    assert len(parse_conntrack_result(single, "100.127.200.187")) == 1


def test_graphql_envelope_success_and_failure():
    body = {"data": {"ShowConntrack": {"success": True, "errors": None, "data": {"result": {"conntrack": {"flow": [FLOW]}}}}}}
    lines = connections_from_graphql_body(body, "100.127.200.187")
    assert len(lines) == 1
    with pytest.raises(ConntrackUnavailable):
        connections_from_graphql_body({"errors": [{"message": "nope"}]}, "10.0.0.1")
    with pytest.raises(ConntrackUnavailable):
        connections_from_graphql_body({"data": {"ShowConntrack": {"success": False, "errors": ["op_mode_error"]}}}, "10.0.0.1")


def test_router_uses_graphql_not_rest_show():
    text = ROUTER.read_text()
    assert "fetch_session_connections" in text
    assert "ShowConntrack" in Path(REPO / "backend/pppoe_connections.py").read_text()
    assert 'path=["conntrack"]' not in text
    assert "device.show" not in text.split("get_pppoe_session_connections")[1].split("pppoe_batch_configure")[0]


def test_page_reads_api_error_message():
    text = PAGE.read_text()
    assert "thrownMessage" in text
    assert 'err instanceof Error ? err.message : "Failed to load connections"' not in text
    assert '"pppoe-connections"' in text
    assert "connectionLineMatchesIp" in text


def test_snapshot_query_asks_both_families():
    query = show_conntrack_snapshot_query('k"ey')
    assert "v4: ShowConntrack" in query
    assert "v6: ShowConntrack" in query
    assert json.dumps('k"ey') in query
    assert "family: inet" in query
    assert "family: inet6" in query


def test_snapshot_body_merges_families_and_skips_empty():
    body = {
        "data": {
            "v4": {"success": True, "data": {"result": {"conntrack": {"flow": [FLOW]}}}},
            "v6": {"success": True, "data": {"result": {"conntrack": {"error": True, "reason": "entries not found"}}}},
        }
    }
    lines = snapshot_from_graphql_body(body)
    assert len(lines) == 1
    assert "100.127.200.187:51234" in lines[0]
    with pytest.raises(ConntrackUnavailable):
        snapshot_from_graphql_body({"errors": [{"message": "nope"}]})
