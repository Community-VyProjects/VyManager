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

import pytest
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
    errors = []

    def worker():
        try:
            manager.emit("inst", EVENT_CONFIG_DIFF, None)
        except Exception as exc:  # pragma: no cover - the assertion reports it
            errors.append(exc)

    thread = threading.Thread(target=worker)
    thread.start()
    thread.join()
    manager.emit("inst", EVENT_CONFIG_DIFF, None)
    assert errors == []


def test_each_queue_is_served_on_its_own_loop():
    """Two loops with subscribers: each put runs on the loop that owns that queue."""
    manager = EventManager()
    ready = threading.Event()
    release = threading.Event()
    seen = {}

    def other_loop():
        async def run():
            queue = manager.subscribe("inst")
            ready.set()
            seen["other"] = await asyncio.wait_for(queue.get(), timeout=2)
            seen["other_thread"] = threading.get_ident()
        asyncio.run(run())
        release.set()

    thread = threading.Thread(target=other_loop)
    thread.start()
    ready.wait(2)

    async def main():
        queue = manager.subscribe("inst")
        await asyncio.to_thread(manager.emit, "inst", EVENT_CONFIG_DIFF, {"n": 1})
        return await asyncio.wait_for(queue.get(), timeout=2)

    mine = asyncio.run(main())
    release.wait(3)
    thread.join()
    assert '"n": 1' in mine
    assert '"n": 1' in seen["other"]
    assert seen["other_thread"] == thread.ident


class _JsonResp:
    def __init__(self, status_code, body):
        self.status_code = status_code
        self._body = body

    def json(self):
        return self._body


def _confirm_service(monkeypatch, status_code, body):
    import commit_confirm_state
    from vyos_service import VyOSDeviceConfig, VyOSService

    service = VyOSService(VyOSDeviceConfig(hostname="lab", apikey="key", version="1.5", instance_id="inst-1703"))
    commit_confirm_state.set_active("inst-1703", 3)
    monkeypatch.setattr("vyos_service._requests.post", lambda url, data, verify, timeout: _JsonResp(status_code, body))
    emitted = []
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: emitted.append(args[:2]))
    return service, emitted


def test_confirm_commit_emits_each_banner_event_once(monkeypatch):
    import commit_confirm_state
    from events.event_manager import EVENT_COMMIT_CONFIRM

    service, emitted = _confirm_service(monkeypatch, 200, {"success": True, "data": "Reload timer stopped"})
    try:
        assert service.confirm_commit("inst-1703").status == 200
    finally:
        commit_confirm_state.clear("inst-1703")
    assert sorted(emitted) == sorted([("inst-1703", EVENT_COMMIT_CONFIRM), ("inst-1703", EVENT_CONFIG_DIFF)])


def test_rejected_confirm_emits_nothing(monkeypatch):
    import commit_confirm_state

    service, emitted = _confirm_service(monkeypatch, 400, {"success": False, "error": "nope", "data": None})
    try:
        assert service.confirm_commit("inst-1703").status == 400
    finally:
        commit_confirm_state.clear("inst-1703")
    assert emitted == []


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
            raise AssertionError("a confirm changes no config; it must not re-read and re-mark it")

    monkeypatch.setattr(config_router, "require_write_permission", allowed)
    monkeypatch.setattr(config_router, "get_session_vyos_service", lambda request: _Service())
    request = cast(Request, SimpleNamespace(state=SimpleNamespace(instance={"id": "inst"})))

    response = asyncio.run(config_router.confirm_commit(request))

    assert response.success is True
    assert emitted == []


# ---------------------------------------------------------------------------
# Save and discard succeed even when the re-read after them fails
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _clear_config_state():
    import config_state

    yield
    config_state.clear_saved_config("inst-cfg")


def _config_request():
    return cast(Request, SimpleNamespace(state=SimpleNamespace(instance={"id": "inst-cfg"})))


def _route_stubs(monkeypatch, service):
    async def allowed(request, feature):
        return None

    emitted = []
    monkeypatch.setattr(config_router, "require_write_permission", allowed)
    monkeypatch.setattr(config_router, "require_read_permission", allowed)
    monkeypatch.setattr(config_router, "get_session_vyos_service", lambda request: service)
    monkeypatch.setattr(config_router.event_manager, "emit", lambda *args: emitted.append(args))
    return emitted


class _WriteThenRead:
    """The write lands; reads after it raise when fail_after_write is set."""

    def __init__(self, live, fail_after_write):
        self.live = live
        self.fail_after_write = fail_after_write
        self.wrote = False
        self.ops = None

    def config_file_save(self):
        from pyvyos.core.rest_client import ApiResponse
        self.wrote = True
        return ApiResponse(status=200, request={}, result={}, error="")

    def commit_operations(self, operations):
        from pyvyos.core.rest_client import ApiResponse
        self.wrote = True
        self.ops = operations
        return ApiResponse(status=200, request={}, result={}, error="")

    def get_full_config(self, refresh=False):
        if self.wrote and self.fail_after_write:
            raise ConnectionError("Network error: device went away")
        return self.live


def test_save_succeeds_and_drops_the_baseline_when_the_reread_fails(monkeypatch):
    import config_state

    config_state.set_saved_config("inst-cfg", {"system": {"host-name": "old"}})
    service = _WriteThenRead(live={"system": {"host-name": "old"}}, fail_after_write=True)
    emitted = _route_stubs(monkeypatch, service)

    response = asyncio.run(config_router.save_config(_config_request()))

    assert response.success is True
    assert config_state.get_saved_config("inst-cfg") is None
    assert emitted == [("inst-cfg", EVENT_CONFIG_DIFF, None)]


def test_discard_succeeds_and_drops_the_baseline_when_the_reread_fails(monkeypatch):
    import config_state

    config_state.set_saved_config("inst-cfg", {"system": {"host-name": "old"}})
    # VyManager made the change, so it is unsaved rather than external.
    config_state.set_managed_config("inst-cfg", {"system": {"host-name": "new"}})
    service = _WriteThenRead(live={"system": {"host-name": "new"}}, fail_after_write=True)
    emitted = _route_stubs(monkeypatch, service)

    response = asyncio.run(config_router.discard_config(_config_request()))

    assert response.success is True
    assert service.ops  # the reverse ops were committed
    assert config_state.get_saved_config("inst-cfg") is None
    assert emitted == [("inst-cfg", EVENT_CONFIG_DIFF, None)]


def test_save_reseeds_the_baseline_from_live_config(monkeypatch):
    import config_state

    config_state.set_saved_config("inst-cfg", {"system": {"host-name": "old"}})
    service = _WriteThenRead(live={"system": {"host-name": "new"}}, fail_after_write=False)
    _route_stubs(monkeypatch, service)

    assert asyncio.run(config_router.save_config(_config_request())).success is True
    assert config_state.get_saved_config("inst-cfg") == {"system": {"host-name": "new"}}


def test_refresh_passes_the_no_session_400_through(monkeypatch):
    from fastapi import HTTPException

    async def allowed(request, feature):
        return None

    def no_session(request):
        raise HTTPException(status_code=400, detail={"error": "No active instance"})

    monkeypatch.setattr(config_router, "require_read_permission", allowed)
    monkeypatch.setattr(config_router, "get_session_vyos_service", no_session)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(config_router.refresh_config(_config_request()))
    assert exc.value.status_code == 400
