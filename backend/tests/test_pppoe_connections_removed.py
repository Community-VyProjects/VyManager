"""The PPPoE session connections (conntrack) feature is removed.

VyOS exposes conntrack only as a full-table dump: the op-mode script runs
``conntrack --dump --family <inet|inet6>`` and neither the CLI nor GraphQL
``ShowConntrack`` accepts a source or destination filter. Reading one
subscriber's flows therefore costs the whole table, which is linear in
session count and times out on a BNG. The feature was deleted rather than
kept behind an SSH call.

These assertions fail if any part of it is reintroduced.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SHOW = REPO / "backend/routers/show.py"
PPPOE_ROUTER = REPO / "backend/routers/pppoe_server/pppoe_server.py"
SSE_HOOK = REPO / "frontend/src/hooks/useDashboardSSE.ts"
PPPOE_API = REPO / "frontend/src/lib/api/pppoe-server.ts"
PAGE = REPO / "frontend/src/app/service/pppoe-server/page.tsx"


def test_backend_conntrack_module_is_gone():
    assert not (REPO / "backend/pppoe_connections.py").exists()
    assert not (REPO / "backend/tests/test_pppoe_connections.py").exists()


def test_frontend_conntrack_helper_is_gone():
    assert not (REPO / "frontend/src/lib/pppoe-connections.ts").exists()
    assert not (REPO / "frontend/src/lib/pppoe-connections.test.ts").exists()


def test_stream_no_longer_advertises_or_accepts_the_conntrack_interest():
    text = SHOW.read_text()
    # The removed feature must not come back as a stream interest. Unrelated
    # channels may be added to the allowlist; conntrack may not.
    from routers.show import _STREAM_INTERESTS

    assert "pppoe-sessions" in _STREAM_INTERESTS
    assert not any("conn" in name for name in _STREAM_INTERESTS)
    assert "pppoe-connections" not in text
    assert "conntrack_ip" not in text


def test_broadcaster_has_no_conntrack_sidecar():
    text = SHOW.read_text()
    for symbol in (
        "_conntrack_task",
        "_handle_conntrack_cycle",
        "_watched_conntrack_ips",
        "fetch_conntrack_snapshot",
        "CONNTRACK_PER_IP_LIMIT",
    ):
        assert symbol not in text, f"{symbol} still referenced in show.py"


def test_pppoe_router_has_no_connections_endpoint():
    text = PPPOE_ROUTER.read_text()
    assert "/connections" not in text
    assert "PPPoEConnectionsResponse" not in text
    assert "fetch_session_connections" not in text
    assert "ConntrackUnavailable" not in text


def test_frontend_has_no_connections_client_or_dialog():
    hook = SSE_HOOK.read_text()
    assert "pppoe-connections" not in hook
    assert "pppoeConnections" not in hook
    assert "conntrackIp" not in hook

    api = PPPOE_API.read_text()
    assert "getSessionConnections" not in api
    assert "PPPoEConnectionsResponse" not in api

    page = PAGE.read_text()
    assert "inspectConnections" not in page
    assert "connectionLineMatchesIp" not in page
    assert "pppoe-connections" not in page
    # the live sessions stream itself must survive the removal
    assert 'interests: ["pppoe-sessions"]' in page
