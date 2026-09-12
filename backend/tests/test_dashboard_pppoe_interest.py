"""Interest gating for the dashboard PPPoE sessions SSE event."""

import asyncio

from routers.show import DeviceDataBroadcaster, _STREAM_INTERESTS


def test_stream_interests_allowlist():
    assert _STREAM_INTERESTS == frozenset({"pppoe-sessions"})


def test_has_interest_false_until_a_viewer_subscribes():
    broadcaster = DeviceDataBroadcaster("instance", service=object())
    assert broadcaster._has_interest("pppoe-sessions") is False

    queue = asyncio.Queue()
    broadcaster._subscribers.append((queue, frozenset({"pppoe-sessions"})))
    assert broadcaster._has_interest("pppoe-sessions") is True

    broadcaster.unsubscribe(queue)
    assert broadcaster._has_interest("pppoe-sessions") is False
    assert broadcaster._subscribers == []


def test_unknown_interest_does_not_enable_pppoe_fetch():
    broadcaster = DeviceDataBroadcaster("instance", service=object())
    queue = asyncio.Queue()
    broadcaster._subscribers.append((queue, frozenset({"not-a-real-interest"})))
    assert broadcaster._has_interest("pppoe-sessions") is False


def test_pppoe_cycle_does_not_start_fetch_without_config_and_interest():
    broadcaster = DeviceDataBroadcaster("instance", service=object())
    broadcaster._pppoe_configured = False
    broadcaster._handle_pppoe_cycle(start=True)
    assert broadcaster._pppoe_task is None

    queue = asyncio.Queue()
    broadcaster._subscribers.append((queue, frozenset({"pppoe-sessions"})))
    broadcaster._handle_pppoe_cycle(start=True)
    assert broadcaster._pppoe_task is None

    broadcaster._pppoe_configured = True
    # No interest after removing the subscriber.
    broadcaster._subscribers = []
    broadcaster._handle_pppoe_cycle(start=True)
    assert broadcaster._pppoe_task is None
