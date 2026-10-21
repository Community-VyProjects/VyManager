"""A dashboard live-poll timeout is a missed sample, not a card error.

The interface card flashes when a GraphQL read timeout is logged as an
exception and pushed as an SSE error. A miss keeps the last snapshot.
"""

import asyncio
import logging

import httpx

import routers.show as show
from routers.show import DeviceDataBroadcaster


class _Config:
    apikey = "test-key"
    protocol = "https"
    hostname = "10.0.0.1"
    port = 443
    verify = False


class _Service:
    config = _Config()


class _TimeoutClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, *args, **kwargs):
        raise httpx.ReadTimeout("timed out")


class _BoomClient(_TimeoutClient):
    async def post(self, *args, **kwargs):
        raise RuntimeError("graphql down")


def test_fast_fetch_timeout_is_a_warning_not_an_exception(monkeypatch, caplog):
    monkeypatch.setattr(show.httpx, "AsyncClient", _TimeoutClient)

    with caplog.at_level(logging.DEBUG):
        result = asyncio.run(show._fetch_graphql_fast(_Service()))

    assert result is None
    timeouts = [r for r in caplog.records if "timed out" in r.message]
    assert timeouts
    assert all(r.levelno == logging.WARNING for r in timeouts)
    assert not any(r.exc_info for r in timeouts)


def test_fast_fetch_unexpected_error_still_logs_a_traceback(monkeypatch, caplog):
    monkeypatch.setattr(show.httpx, "AsyncClient", _BoomClient)

    with caplog.at_level(logging.DEBUG):
        result = asyncio.run(show._fetch_graphql_fast(_Service()))

    assert result is None
    failures = [r for r in caplog.records if r.levelno >= logging.ERROR]
    assert failures
    assert any(r.exc_info for r in failures)


def _run_cycles(broadcaster, cycles, monkeypatch):
    calls = {"n": 0}

    async def sleep(_interval):
        calls["n"] += 1
        if calls["n"] >= cycles:
            broadcaster._subscribers.clear()

    async def refresh(self):
        return None

    monkeypatch.setattr(show.asyncio, "sleep", sleep)
    monkeypatch.setattr(DeviceDataBroadcaster, "_refresh_config_state", refresh)
    asyncio.run(broadcaster._run())


def test_fast_timeout_does_not_error_the_interface_card(monkeypatch):
    broadcaster = DeviceDataBroadcaster("instance", service=_Service())
    queue = asyncio.Queue()
    broadcaster._subscribers.append((queue, frozenset()))

    async def miss(*args, **kwargs):
        return None

    monkeypatch.setattr(show, "_fetch_graphql_dashboard", miss)
    monkeypatch.setattr(show, "_fetch_graphql_fast", miss)
    # Cycle 0 is the slow query. Cycle 1 is the fast counter query.
    _run_cycles(broadcaster, 2, monkeypatch)

    events = []
    while not queue.empty():
        events.append(queue.get_nowait())
    assert not any(event.get("type") == "error" for event in events)


def test_successful_fast_cycle_still_broadcasts_counters(monkeypatch):
    broadcaster = DeviceDataBroadcaster("instance", service=_Service())
    queue = asyncio.Queue()
    broadcaster._subscribers.append((queue, frozenset()))

    async def miss(*args, **kwargs):
        return None

    async def counters(*args, **kwargs):
        return {"InterfaceCounters": {"data": {"result": []}}}

    monkeypatch.setattr(show, "_fetch_graphql_dashboard", miss)
    monkeypatch.setattr(show, "_fetch_graphql_fast", counters)
    _run_cycles(broadcaster, 2, monkeypatch)

    events = []
    while not queue.empty():
        events.append(queue.get_nowait())
    assert any(event.get("type") == "interface-counters" for event in events)
    assert not any(event.get("type") == "error" for event in events)
