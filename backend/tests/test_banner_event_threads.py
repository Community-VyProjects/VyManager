"""Banner events reach SSE subscribers from threadpool workers (#1703).

VyOSService.execute_batch runs under run_in_threadpool and calls
event_manager.emit there. asyncio queues are not thread-safe: a put from a
worker thread did not wake the stream waiting in queue.get(), so the banner
waited for the next unrelated wake-up (the 30 s keepalive).
"""

import asyncio
import threading
from types import SimpleNamespace
from typing import cast

from fastapi import Request

from events.event_manager import EVENT_CONFIG_DIFF, EventManager
from routers.config import config as config_router


async def _wait_while_worker_runs(manager: EventManager, queue: asyncio.Queue, offload) -> str:
    """Park a getter, emit from a worker that keeps running, then collect.

    The SSE stream is parked in queue.get() when a save emits from a
    threadpool worker. The worker returning wakes the loop as a side effect,
    so it is held open here until the getter has been served: the emit
    itself has to wake the loop. The old emit only woke it at the timeout.
    """
    getter = asyncio.ensure_future(queue.get())
    await asyncio.sleep(0)  # the getter is now waiting
    release = threading.Event()

    def worker():
        manager.emit("inst", EVENT_CONFIG_DIFF, {"x": 1})
        release.wait(5)

    running = asyncio.ensure_future(offload(worker))
    try:
        return await asyncio.wait_for(getter, timeout=2)
    finally:
        release.set()
        await running


def test_emit_from_a_worker_thread_wakes_a_waiting_subscriber():
    manager = EventManager()

    async def main():
        queue = manager.subscribe("inst")
        return await _wait_while_worker_runs(manager, queue, asyncio.to_thread)

    assert '"x": 1' in asyncio.run(main())


def test_emit_through_run_in_threadpool_wakes_a_waiting_subscriber():
    from starlette.concurrency import run_in_threadpool

    manager = EventManager()

    async def main():
        queue = manager.subscribe("inst")
        return await _wait_while_worker_runs(manager, queue, run_in_threadpool)

    assert '"x": 1' in asyncio.run(main())


def test_subscribers_change_while_a_worker_emits():
    """Delivery runs on the loop, so a subscribe/unsubscribe never races the fan-out."""
    manager = EventManager()

    async def main():
        queues = [manager.subscribe("inst") for _ in range(50)]

        def burst():
            for _ in range(200):
                manager.emit("inst", EVENT_CONFIG_DIFF, None)

        worker = asyncio.ensure_future(asyncio.to_thread(burst))
        for _ in range(200):
            q = manager.subscribe("inst")
            manager.unsubscribe("inst", q)
            await asyncio.sleep(0)
        await worker
        await asyncio.sleep(0.05)
        return min(q.qsize() for q in queues)

    assert asyncio.run(main()) == 200


def test_emit_on_the_loop_delivers_immediately():
    manager = EventManager()

    async def main():
        queue = manager.subscribe("inst")
        manager.emit("inst", EVENT_CONFIG_DIFF, None)
        return queue.get_nowait()

    assert '"config_diff"' in asyncio.run(main())


def test_emit_only_reaches_that_instance():
    manager = EventManager()

    async def main():
        mine = manager.subscribe("inst")
        other = manager.subscribe("other")
        await asyncio.to_thread(manager.emit, "inst", EVENT_CONFIG_DIFF, None)
        await asyncio.wait_for(mine.get(), timeout=2)
        return other.qsize()

    assert asyncio.run(main()) == 0


def test_emit_before_any_subscriber_is_a_no_op():
    EventManager().emit("inst", EVENT_CONFIG_DIFF, None)


def test_emit_after_the_loop_closed_does_not_raise():
    manager = EventManager()

    async def main():
        manager.subscribe("inst")

    asyncio.run(main())
    threading.Thread(target=manager.emit, args=("inst", EVENT_CONFIG_DIFF, None)).start()
    manager.emit("inst", EVENT_CONFIG_DIFF, None)


def test_confirm_route_leaves_the_banner_events_to_confirm_commit(monkeypatch):
    """confirm_commit emits commit_confirm and config_diff; the route does not repeat them."""
    from pyvyos.core.rest_client import ApiResponse

    emitted = []
    monkeypatch.setattr(config_router.event_manager, "emit", lambda *args: emitted.append(args))

    async def allowed(request, feature):
        return None

    class _Service:
        def confirm_commit(self, instance_id):
            return ApiResponse(status=200, request={}, result={}, error="")

        def get_full_config(self, refresh=False):
            return {}

    monkeypatch.setattr(config_router, "require_write_permission", allowed)
    monkeypatch.setattr(config_router, "get_session_vyos_service", lambda request: _Service())
    monkeypatch.setattr(config_router, "set_managed_config", lambda instance_id, config: None)
    request = cast(Request, SimpleNamespace(state=SimpleNamespace(instance={"id": "inst"})))

    response = asyncio.run(config_router.confirm_commit(request))

    assert response.success is True
    assert emitted == []
