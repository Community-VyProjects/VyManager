"""DDM is physical-port-only and rides the shared dashboard SSE stream.

These two assertions are the user-visible contract:

1. ``GET /vyos/ethernet/{interface}/transceiver`` must reject a VLAN
   sub-interface. ``ethtool --module-info eth0.100`` answers "No such device"
   (lab-verified on 1.4 and 1.5), so accepting the name only produced a 502 and
   a phantom row on the Digital Diagnostic Monitoring card.
2. The card must consume the shared dashboard stream like every other live card,
   not run its own REST poll. A per-card ``setInterval`` re-runs one ethtool per
   port per client instead of one shared sweep.
"""

from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

FRONTEND = Path(__file__).resolve().parents[2] / "frontend" / "src"
CARD = FRONTEND / "components" / "dashboard" / "TransceiverHealthCard.tsx"


# ---------------------------------------------------------------------------
# The route refuses VLAN sub-interfaces
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def client():
    from routers.interfaces import ethernet

    app = FastAPI()
    app.include_router(ethernet.router)
    return TestClient(app, raise_server_exceptions=False)


@pytest.mark.parametrize("vlan", ["eth0.100", "eth1.4094", "eth0.10.20"])
def test_vlan_sub_interface_is_rejected_before_reaching_the_router(client, vlan):
    # 422 = the path pattern refused it. Anything else means the request was
    # accepted and would have run ethtool against a device with no module.
    response = client.get(f"/vyos/ethernet/{vlan}/transceiver")
    assert response.status_code == 422, (
        f"{vlan} reached the handler with status {response.status_code}"
    )


@pytest.mark.parametrize("port", ["eth0", "eth15"])
def test_physical_port_names_still_pass_the_path_pattern(client, port):
    response = client.get(f"/vyos/ethernet/{port}/transceiver")
    assert response.status_code != 422


# ---------------------------------------------------------------------------
# The card is an SSE consumer, not a poller
# ---------------------------------------------------------------------------


def test_card_consumes_the_shared_dashboard_stream():
    source = CARD.read_text()
    assert 'from "@/contexts/DashboardDataContext"' in source
    assert "useDashboardData()" in source
    assert "sseData.transceiverHealth" in source


def test_card_runs_no_rest_poll_of_its_own():
    source = CARD.read_text()
    for polled in ("setInterval", "ethernetService", "showService", "getTransceiver"):
        assert polled not in source, f"card still calls {polled}; it must ride the SSE stream"
