"""Transceiver DDM: physical-port-only sweep and dashboard SSE channel.

Covers the two faults this change fixes:

1. The Digital Diagnostic Monitoring card listed VLAN sub-interfaces, which have
   no transceiver of their own (``ethtool --module-info eth0.100`` -> "No such
   device" on the lab).
2. The card polled REST on its own ``setInterval`` instead of riding the shared
   dashboard SSE stream like every other live card.
"""

import asyncio
import json

import pytest

from transceiver_status import (
    TRANSCEIVER_MAX_PORTS,
    build_transceiver_status,
    physical_ethernet_interfaces,
    transceiver_alias,
    transceiver_fetch_timeout,
    transceiver_gql_fields,
)
from routers.show import DeviceDataBroadcaster, _STREAM_INTERESTS


# ---------------------------------------------------------------------------
# Physical ports only
# ---------------------------------------------------------------------------

# Shape of `show configuration` for a box whose ports carry 802.1q, QinQ
# service and QinQ customer VLANs. Only eth0/eth1 are physical.
CONFIG_WITH_VLANS = {
    "interfaces": {
        "ethernet": {
            "eth1": {
                "address": ["10.0.1.1/24"],
                "vif": {"100": {"address": ["10.0.100.1/24"]}, "200": {}},
            },
            "eth0": {
                "vif-s": {
                    "10": {
                        "vif-c": {"20": {"description": "customer"}},
                    }
                },
            },
        },
        "bonding": {"bond0": {"vif": {"30": {}}}},
        "wireguard": {"wg0": {}},
    }
}


def test_only_physical_ethernet_ports_are_swept():
    assert physical_ethernet_interfaces(CONFIG_WITH_VLANS) == ["eth0", "eth1"]


def test_vlan_sub_interfaces_never_appear_in_the_sweep():
    swept = physical_ethernet_interfaces(CONFIG_WITH_VLANS)
    assert not any("." in name for name in swept)
    for vlan in ("eth1.100", "eth1.200", "eth0.10", "eth0.10.20"):
        assert vlan not in swept


def test_non_ethernet_interface_types_are_not_swept():
    swept = physical_ethernet_interfaces(CONFIG_WITH_VLANS)
    assert "bond0" not in swept
    assert "wg0" not in swept


@pytest.mark.parametrize("config", [None, {}, {"interfaces": {}}, {"interfaces": {"ethernet": None}}])
def test_missing_or_empty_config_yields_no_ports(config):
    assert physical_ethernet_interfaces(config) == []


# ---------------------------------------------------------------------------
# GraphQL field building
# ---------------------------------------------------------------------------


def test_gql_fields_query_only_the_named_physical_ports():
    fields = transceiver_gql_fields(json.dumps("secret-key"), ["eth0", "eth1"])
    assert len(fields) == 2
    joined = " ".join(fields)
    assert '["interfaces", "ethernet", "eth0", "transceiver"]' in joined
    assert '["interfaces", "ethernet", "eth1", "transceiver"]' in joined
    # The API key is JSON-encoded exactly once by the caller.
    assert joined.count('"secret-key"') == 2


def test_gql_fields_are_capped_so_a_high_port_count_cannot_run_away():
    names = [f"eth{i}" for i in range(TRANSCEIVER_MAX_PORTS + 25)]
    assert len(transceiver_gql_fields(json.dumps("k"), names)) == TRANSCEIVER_MAX_PORTS


def test_no_fields_for_an_empty_port_list():
    assert transceiver_gql_fields(json.dumps("k"), []) == []


def test_fetch_timeout_scales_with_port_count():
    # A 2-port lab VM and a 48-port switch must not share one fixed ceiling.
    assert transceiver_fetch_timeout(2) == pytest.approx(10.0)
    assert transceiver_fetch_timeout(48) > transceiver_fetch_timeout(8)
    # Capped by the same port ceiling as the query itself.
    assert transceiver_fetch_timeout(10_000) == transceiver_fetch_timeout(TRANSCEIVER_MAX_PORTS)


# ---------------------------------------------------------------------------
# Payload building
# ---------------------------------------------------------------------------

# Real text shape from `show interfaces ethernet <n> transceiver`.
SFP_OUTPUT = """Identifier: SFP+
Vendor name: Acme
Vendor PN: OPT-10G
Vendor SN: ABC123
Module temperature: 31.2 C
TX optical power: -2.1 dBm
Alarm flags: None
Warning flags: Rx power low
"""


def _gql_for(ports):
    return {transceiver_alias(name): {"data": {"result": text}} for name, text in ports.items()}


def test_payload_is_built_per_physical_port():
    gql = _gql_for({"eth0": SFP_OUTPUT, "eth1": "Transceiver: not present"})
    payload = build_transceiver_status(gql, ["eth0", "eth1"])

    assert payload["total"] == 2
    assert [p["interface"] for p in payload["interfaces"]] == ["eth0", "eth1"]

    eth0 = payload["interfaces"][0]
    assert eth0["transceiver"] == "SFP+"
    assert eth0["vendor"] == "Acme"
    assert eth0["warnings"] == ["Rx power low"]
    assert eth0["alarms"] == []
    assert eth0["measurements"]["temperature"]["value"] == "31.2 C"

    assert payload["interfaces"][1]["present"] is False


def test_payload_omits_raw_ethtool_text():
    # `raw` is unrendered and would be re-sent to every subscriber each sweep.
    payload = build_transceiver_status(_gql_for({"eth0": SFP_OUTPUT}), ["eth0"])
    assert "raw" not in payload["interfaces"][0]


def test_missing_or_non_string_alias_degrades_to_an_absent_port():
    gql = {transceiver_alias("eth1"): {"data": {"result": {"unexpected": "shape"}}}}
    payload = build_transceiver_status(gql, ["eth0", "eth1"])
    assert [p["interface"] for p in payload["interfaces"]] == ["eth0", "eth1"]
    assert all(p["transceiver"] is None for p in payload["interfaces"])


# ---------------------------------------------------------------------------
# SSE channel wiring
# ---------------------------------------------------------------------------


def test_transceiver_health_is_a_recognised_stream_interest():
    assert "transceiver-health" in _STREAM_INTERESTS


def test_sweep_does_not_start_without_a_subscriber_interest():
    broadcaster = DeviceDataBroadcaster("instance", service=object())
    broadcaster._transceiver_interfaces = ["eth0"]
    broadcaster._handle_transceiver_cycle(start=True)
    assert broadcaster._transceiver_task is None


def test_sweep_reports_no_ports_without_starting_a_fetch():
    broadcaster = DeviceDataBroadcaster("instance", service=object())
    pushed = []
    broadcaster._push_to_all = lambda event: pushed.append(event)
    broadcaster._subscribers.append((asyncio.Queue(), frozenset({"transceiver-health"})))
    broadcaster._transceiver_interfaces = []

    async def scenario():
        broadcaster._handle_transceiver_cycle(start=True)

    asyncio.run(scenario())
    assert broadcaster._transceiver_task is None
    assert pushed == [{"type": "transceiver-health", "data": {"interfaces": [], "total": 0}}]


def test_sweep_starts_once_and_is_not_restarted_every_cycle():
    async def scenario():
        broadcaster = DeviceDataBroadcaster("instance", service=object())
        broadcaster._subscribers.append((asyncio.Queue(), frozenset({"transceiver-health"})))
        broadcaster._transceiver_interfaces = ["eth0", "eth1"]

        started = []

        async def fake_fetch(service, interfaces):
            started.append(list(interfaces))
            await asyncio.sleep(60)

        import routers.show as show_module

        original = show_module._fetch_gql_transceivers
        show_module._fetch_gql_transceivers = fake_fetch
        try:
            broadcaster._handle_transceiver_cycle(start=True)
            await asyncio.sleep(0)
            # The 3 s loop ticks again while the sweep is still in flight.
            broadcaster._handle_transceiver_cycle(start=True)
            broadcaster._handle_transceiver_cycle(start=True)
            await asyncio.sleep(0)
            assert started == [["eth0", "eth1"]]
            assert broadcaster._transceiver_task is not None
            broadcaster._transceiver_task.cancel()
        finally:
            show_module._fetch_gql_transceivers = original

    asyncio.run(scenario())


def test_completed_sweep_pushes_the_channel_event():
    async def scenario():
        broadcaster = DeviceDataBroadcaster("instance", service=object())
        pushed = []
        broadcaster._push_to_all = lambda event: pushed.append(event)
        broadcaster._transceiver_pending = ["eth0"]

        async def done():
            return _gql_for({"eth0": SFP_OUTPUT})

        broadcaster._transceiver_task = asyncio.create_task(done())
        await broadcaster._transceiver_task
        broadcaster._handle_transceiver_cycle(start=False)

        assert len(pushed) == 1
        assert pushed[0]["type"] == "transceiver-health"
        assert pushed[0]["data"]["interfaces"][0]["interface"] == "eth0"
        assert broadcaster._transceiver_task is None

    asyncio.run(scenario())


def test_failed_sweep_emits_an_error_not_an_empty_port_list():
    async def scenario():
        broadcaster = DeviceDataBroadcaster("instance", service=object())
        pushed = []
        broadcaster._push_to_all = lambda event: pushed.append(event)
        broadcaster._transceiver_pending = ["eth0"]

        async def failed():
            return None  # _fetch_gql_transceivers signals failure with None

        broadcaster._transceiver_task = asyncio.create_task(failed())
        await broadcaster._transceiver_task
        broadcaster._handle_transceiver_cycle(start=False)

        assert all(event["type"] != "transceiver-health" for event in pushed)
        assert pushed == [
            {"type": "error", "data": {"channel": "transceiver-health", "message": "Failed to fetch"}}
        ]

    asyncio.run(scenario())


def test_cancelled_sweep_does_not_kill_the_shared_loop():
    async def scenario():
        broadcaster = DeviceDataBroadcaster("instance", service=object())
        task = asyncio.create_task(asyncio.sleep(60))
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        broadcaster._transceiver_task = task
        # CancelledError is a BaseException; a bare `except Exception` here
        # would let it escape and take the broadcaster down for every client.
        broadcaster._handle_transceiver_cycle(start=False)
        assert broadcaster._transceiver_task is None

    asyncio.run(scenario())


def test_unsubscribing_the_last_interested_viewer_cancels_the_sweep():
    async def scenario():
        broadcaster = DeviceDataBroadcaster("instance", service=object())
        queue = asyncio.Queue()
        other = asyncio.Queue()
        broadcaster._subscribers.append((queue, frozenset({"transceiver-health"})))
        broadcaster._subscribers.append((other, frozenset()))
        broadcaster._transceiver_task = asyncio.create_task(asyncio.sleep(60))

        broadcaster.unsubscribe(queue)
        assert broadcaster._transceiver_task is None
        assert broadcaster._subscribers == [(other, frozenset())]

    asyncio.run(scenario())
