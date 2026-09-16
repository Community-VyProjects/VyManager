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


def test_pppoe_cycle_emits_empty_snapshot_when_not_configured():
    broadcaster = DeviceDataBroadcaster("instance", service=object())
    pushed = []
    broadcaster._push_to_all = lambda event: pushed.append(event)
    queue = asyncio.Queue()
    broadcaster._subscribers.append((queue, frozenset({"pppoe-sessions"})))
    broadcaster._pppoe_configured = False
    broadcaster._handle_pppoe_cycle(start=True)
    assert broadcaster._pppoe_task is None
    assert pushed == [{"type": "pppoe-sessions", "data": {"sessions": [], "total": 0}}]


def test_unsubscribe_clears_in_flight_pppoe_task():
    async def scenario():
        broadcaster = DeviceDataBroadcaster("instance", service=object())
        queue = asyncio.Queue()
        other = asyncio.Queue()
        broadcaster._subscribers.append((queue, frozenset({"pppoe-sessions"})))
        broadcaster._subscribers.append((other, frozenset()))
        broadcaster._pppoe_task = asyncio.create_task(asyncio.sleep(60))
        broadcaster.unsubscribe(queue)
        assert broadcaster._pppoe_task is None
        assert broadcaster._subscribers == [(other, frozenset())]

    asyncio.run(scenario())


def test_pppoe_cycle_swallows_cancelled_task_without_killing_the_loop():
    async def scenario():
        broadcaster = DeviceDataBroadcaster("instance", service=object())
        task = asyncio.create_task(asyncio.sleep(60))
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        broadcaster._pppoe_task = task
        broadcaster._handle_pppoe_cycle(start=False)
        assert broadcaster._pppoe_task is None

    asyncio.run(scenario())


def test_pppoe_cycle_failed_fetch_emits_error_not_empty_sessions():
    async def scenario():
        broadcaster = DeviceDataBroadcaster("instance", service=object())
        pushed = []
        broadcaster._push_to_all = lambda event: pushed.append(event)

        async def boom():
            raise RuntimeError("router down")

        task = asyncio.create_task(boom())
        try:
            await task
        except RuntimeError:
            pass
        broadcaster._pppoe_task = task
        broadcaster._handle_pppoe_cycle(start=False)
        assert all(event["type"] != "pppoe-sessions" for event in pushed)
        assert any(
            event["type"] == "error" and event["data"]["channel"] == "pppoe-sessions"
            for event in pushed
        )
        assert broadcaster._pppoe_task is None

    asyncio.run(scenario())
