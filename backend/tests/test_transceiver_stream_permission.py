"""The transceiver-health SSE channel is gated like its REST endpoint.

``GET /vyos/ethernet/{interface}/transceiver`` requires ETHERNET read. Because
the broadcaster fans every event out to *all* subscribers on the device, an
unprivileged client sharing that broadcaster would otherwise receive another
client's DDM events. The stream therefore filters on the same FeatureGroup, and
also refuses to register the interest at all.
"""

import ast
from pathlib import Path

SHOW = Path(__file__).resolve().parents[1] / "routers" / "show.py"


def _stream_endpoint() -> ast.AsyncFunctionDef:
    tree = ast.parse(SHOW.read_text())
    for node in ast.walk(tree):
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "dashboard_stream":
            return node
    raise AssertionError("dashboard_stream endpoint not found")


def test_stream_resolves_ethernet_read_permission():
    source = ast.unparse(_stream_endpoint())
    assert "FeatureGroup.ETHERNET" in source, "stream does not consult the ETHERNET group"
    assert "include_transceiver" in source


def test_unprivileged_subscriber_cannot_register_the_interest():
    # Without the discard, the broadcaster would start the sweep on behalf of a
    # client that is not allowed to see the result.
    source = ast.unparse(_stream_endpoint())
    assert 'requested.discard(\'transceiver-health\')' in source


def test_events_are_filtered_before_being_written_to_an_unprivileged_client():
    # _push_to_all reaches every subscriber, so the per-event gate is what stops
    # the leak when a permitted and an unpermitted client share a broadcaster.
    source = ast.unparse(_stream_endpoint())
    assert "'transceiver-health'" in source
    assert "not include_transceiver" in source
