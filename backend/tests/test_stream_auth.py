import asyncio
from contextlib import asynccontextmanager
from types import SimpleNamespace

import stream_auth
from rbac_permissions import FeatureGroup, PermissionLevel


def _run(coro):
    return asyncio.run(coro)


def test_recheck_passes_write_and_feature(monkeypatch):
    seen = {}

    @asynccontextmanager
    async def connection(*args):
        yield object()

    async def check_permission(conn, user_id, instance_id, feature, level, org_id=None):
        seen.update(user_id=user_id, instance_id=instance_id, feature=feature, level=level)
        return False

    monkeypatch.setattr(stream_auth, "ws_org_conn", connection)
    monkeypatch.setattr(stream_auth, "check_permission", check_permission)

    result = _run(
        stream_auth.recheck_stream_permission(
            object(), "user-1", "inst-1", FeatureGroup.SSH_CONSOLE
        )
    )
    assert seen == {
        "user_id": "user-1",
        "instance_id": "inst-1",
        "feature": FeatureGroup.SSH_CONSOLE,
        "level": PermissionLevel.WRITE,
    }
    assert result.allowed is False
    assert result.failed is False
    assert result.close_reason == stream_auth.DENIED


def test_recheck_allows_when_permission_holds(monkeypatch):
    @asynccontextmanager
    async def connection(*args):
        yield object()

    async def check_permission(*args, **kwargs):
        return True

    monkeypatch.setattr(stream_auth, "ws_org_conn", connection)
    monkeypatch.setattr(stream_auth, "check_permission", check_permission)

    result = _run(
        stream_auth.recheck_stream_permission(
            object(), "user", "instance", FeatureGroup.MONITORING
        )
    )
    assert result.allowed is True
    assert result.close_reason is None


def test_recheck_fails_closed_on_error(monkeypatch):
    class FailingConnection:
        async def __aenter__(self):
            raise RuntimeError("database unavailable")

        async def __aexit__(self, *args):
            return False

    monkeypatch.setattr(stream_auth, "ws_org_conn", lambda *args: FailingConnection())

    result = _run(
        stream_auth.recheck_stream_permission(
            object(), "user", "instance", FeatureGroup.MONITORING
        )
    )
    assert result.allowed is False
    assert result.failed is True
    assert result.close_reason == stream_auth.FAILED


def test_watch_closes_when_recheck_raises(monkeypatch):
    closed = []

    class Queue:
        def __init__(self):
            self.calls = 0

        async def get(self):
            self.calls += 1
            if self.calls > 1:
                raise AssertionError("watch did not close after the revocation")
            return "user:user-1"

    class FailingConnection:
        async def __aenter__(self):
            raise RuntimeError("database unavailable")

        async def __aexit__(self, *args):
            return False

    monkeypatch.setattr(stream_auth.revocation_bus, "subscribe", lambda: Queue())
    monkeypatch.setattr(stream_auth.revocation_bus, "unsubscribe", lambda queue: None)
    monkeypatch.setattr(
        stream_auth.revocation_bus,
        "payload_matches",
        lambda payload, user_id, instance_id: True,
    )
    monkeypatch.setattr(stream_auth, "ws_org_conn", lambda *args: FailingConnection())

    async def on_close(reason):
        closed.append(reason)

    _run(
        stream_auth.watch_stream_revocation(
            object(),
            "user-1",
            "inst-1",
            FeatureGroup.SSH_CONSOLE,
            on_close,
        )
    )
    assert closed == [stream_auth.FAILED]


def test_watch_ignores_unrelated_revocation_then_closes_on_denial(monkeypatch):
    closed = []

    class Queue:
        def __init__(self):
            self.payloads = ["user:other", "instance:inst-1"]

        async def get(self):
            if not self.payloads:
                raise AssertionError("watch did not close after the matching revocation")
            return self.payloads.pop(0)

    monkeypatch.setattr(stream_auth.revocation_bus, "subscribe", lambda: Queue())
    monkeypatch.setattr(stream_auth.revocation_bus, "unsubscribe", lambda queue: None)
    monkeypatch.setattr(
        stream_auth.revocation_bus,
        "payload_matches",
        lambda payload, user_id, instance_id: payload == f"instance:{instance_id}",
    )

    async def denied(*args, **kwargs):
        return stream_auth.StreamRecheck(allowed=False)

    monkeypatch.setattr(stream_auth, "recheck_stream_permission", denied)

    async def on_close(reason):
        closed.append(reason)

    _run(
        stream_auth.watch_stream_revocation(
            object(),
            "user-1",
            "inst-1",
            FeatureGroup.MONITORING,
            on_close,
        )
    )
    assert closed == [stream_auth.DENIED]


def test_ssh_watches_pass_the_feature_and_console_close_handler():
    import ast
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]

    def calls(rel, name):
        tree = ast.parse((root / rel).read_text())
        found = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            func = node.func
            called = func.id if isinstance(func, ast.Name) else getattr(func, "attr", None)
            if called == name:
                found.append(node)
        return found

    console = calls("routers/console/console.py", "watch_stream_revocation")
    assert len(console) == 1
    console_args = [ast.unparse(arg) for arg in console[0].args]
    assert "FeatureGroup.SSH_CONSOLE" in console_args
    assert "on_close" in console_args

    monitoring = calls("routers/monitoring/monitoring.py", "watch_stream_revocation")
    assert len(monitoring) == 1
    monitoring_args = [ast.unparse(arg) for arg in monitoring[0].args]
    assert monitoring_args[-1] == "FeatureGroup.MONITORING"

    events = calls("routers/events.py", "banner_access_revoked")
    assert len(events) == 1
    assert calls("routers/events.py", "configuration_read_allowed")
    assert calls("routers/show.py", "dashboard_session_closed")


def test_no_session_denies_configuration_read(monkeypatch):
    from routers import events

    async def no_session(*args):
        return False

    async def should_not_run(*args, **kwargs):
        raise AssertionError("permission checked without a session")

    monkeypatch.setattr(events, "_has_active_session", no_session)
    monkeypatch.setattr(events, "check_permission", should_not_run)

    assert _run(events.configuration_read_allowed(object(), "user", "inst", None)) is False


def test_banner_closes_when_the_recheck_fails():
    from routers import events

    async def boom():
        raise RuntimeError("database unavailable")

    assert _run(events.banner_access_revoked(boom)) is True


def test_dashboard_closes_when_the_session_check_raises(monkeypatch):
    from routers import events
    from routers import show

    class Connection:
        async def __aenter__(self):
            return object()

        async def __aexit__(self, *args):
            return False

    async def boom(*args):
        raise RuntimeError("database unavailable")

    monkeypatch.setattr(events, "_has_active_session", boom)

    assert _run(show.dashboard_session_closed(lambda: Connection(), "user", "inst")) is True


def test_banner_stays_open_only_when_read_holds():
    from routers import events

    async def allowed():
        return True

    async def denied():
        return False

    assert _run(events.banner_access_revoked(allowed)) is False
    assert _run(events.banner_access_revoked(denied)) is True


def test_dashboard_stream_ends_when_session_check_raises(monkeypatch):
    from routers.show import dashboard_stream

    class Broadcaster:
        def subscribe(self, interests):
            return asyncio.Queue()

        def unsubscribe(self, queue):
            return None

    class Request:
        def __init__(self):
            self.state = SimpleNamespace(user={"id": "user"})

        async def is_disconnected(self):
            await asyncio.sleep(0)
            return False

    class Connection:
        async def __aenter__(self):
            await asyncio.sleep(0)
            return object()

        async def __aexit__(self, *args):
            await asyncio.sleep(0)
            return False

    async def deny(*args, **kwargs):
        await asyncio.sleep(0)
        return False

    async def boom(*args, **kwargs):
        await asyncio.sleep(0)
        raise RuntimeError("database unavailable")

    real_wait_for = asyncio.wait_for

    calls = {"n": 0}

    async def timeout_now(coro, timeout=None):
        coro.close()
        calls["n"] += 1
        if calls["n"] > 1:
            raise AssertionError("dashboard stream did not end when the session check raised")
        await asyncio.sleep(0)
        raise asyncio.TimeoutError

    monkeypatch.setattr(
        "routers.show.get_session_vyos_service",
        lambda request: SimpleNamespace(config=SimpleNamespace(instance_id="inst")),
    )
    monkeypatch.setattr("routers.show.has_permission", deny)
    monkeypatch.setattr("routers.show._get_broadcaster", lambda service: Broadcaster())
    monkeypatch.setattr("routers.show.asyncio.wait_for", timeout_now)
    monkeypatch.setattr("routers.show.request_scoped_conn", lambda request: Connection())
    monkeypatch.setattr("routers.events._has_active_session", boom)

    async def scenario():
        response = await dashboard_stream(Request(), interest=[])
        chunks = []

        async def read():
            async for chunk in response.body_iterator:
                chunks.append(chunk)

        try:
            await real_wait_for(read(), timeout=1)
        except TimeoutError:
            raise AssertionError("dashboard stream did not end when the session check raised")
        return "".join(chunks)

    body = _run(scenario())
    assert "Dashboard stream connected" in body
    assert ": keep-alive" not in body


def test_banner_stream_ends_when_recheck_raises(monkeypatch):
    from routers.events import banner_events

    class Request:
        def __init__(self):
            self.state = SimpleNamespace(
                user={"id": "user"},
                instance={"id": "inst"},
            )

    class Connection:
        async def __aenter__(self):
            await asyncio.sleep(0)
            return object()

        async def __aexit__(self, *args):
            await asyncio.sleep(0)
            return False

    async def allow(*args, **kwargs):
        await asyncio.sleep(0)
        return None

    async def empty_state(request):
        await asyncio.sleep(0)
        return {}

    async def boom(*args, **kwargs):
        await asyncio.sleep(0)
        raise RuntimeError("database unavailable")

    calls = {"n": 0}

    async def timeout_wait(aws, timeout=None, return_when=None):
        for fut in aws:
            fut.cancel()
        calls["n"] += 1
        if calls["n"] > 1:
            raise AssertionError("banner stream did not end when the recheck raised")
        await asyncio.sleep(0)
        return set(), set()

    monkeypatch.setattr("routers.events.require_read_permission", allow)
    monkeypatch.setattr("routers.events._gather_banner_state", empty_state)
    monkeypatch.setattr("routers.events.event_manager.subscribe", lambda instance_id: asyncio.Queue())
    monkeypatch.setattr("routers.events.event_manager.unsubscribe", lambda instance_id, queue: None)
    monkeypatch.setattr("routers.events.revocation_bus.subscribe", lambda: asyncio.Queue())
    monkeypatch.setattr("routers.events.revocation_bus.unsubscribe", lambda queue: None)
    monkeypatch.setattr("routers.events.asyncio.wait", timeout_wait)
    monkeypatch.setattr("routers.events.request_scoped_conn", lambda request: Connection())
    monkeypatch.setattr("routers.events.configuration_read_allowed", boom)

    async def scenario():
        response = await banner_events(Request())
        chunks = []

        async def read():
            async for chunk in response.body_iterator:
                chunks.append(chunk)

        try:
            await asyncio.wait_for(read(), timeout=1)
        except TimeoutError:
            raise AssertionError("banner stream did not end when the recheck raised")
        return "".join(chunks)

    body = _run(scenario())
    assert "banner_state" in body
    assert ": keepalive" not in body


def test_banner_stream_ends_on_matching_revocation(monkeypatch):
    from routers.events import banner_events

    class ExplodingQueue(asyncio.Queue):
        def __init__(self):
            super().__init__()
            self.gets = 0

        async def get(self):
            self.gets += 1
            if self.gets > 1:
                raise AssertionError("banner stream did not end after the matching revocation")
            return await super().get()

    events = ExplodingQueue()
    revocations = ExplodingQueue()
    revocations.put_nowait("user:user")

    class Request:
        def __init__(self):
            self.state = SimpleNamespace(
                user={"id": "user"},
                instance={"id": "inst"},
            )

    class Connection:
        async def __aenter__(self):
            await asyncio.sleep(0)
            return object()

        async def __aexit__(self, *args):
            await asyncio.sleep(0)
            return False

    async def allow(*args, **kwargs):
        await asyncio.sleep(0)
        return None

    async def empty_state(request):
        await asyncio.sleep(0)
        return {}

    async def boom(*args, **kwargs):
        await asyncio.sleep(0)
        raise RuntimeError("database unavailable")

    monkeypatch.setattr("routers.events.require_read_permission", allow)
    monkeypatch.setattr("routers.events._gather_banner_state", empty_state)
    monkeypatch.setattr("routers.events.event_manager.subscribe", lambda instance_id: events)
    monkeypatch.setattr("routers.events.event_manager.unsubscribe", lambda instance_id, queue: None)
    monkeypatch.setattr("routers.events.revocation_bus.subscribe", lambda: revocations)
    monkeypatch.setattr("routers.events.revocation_bus.unsubscribe", lambda queue: None)
    monkeypatch.setattr("routers.events.request_scoped_conn", lambda request: Connection())
    monkeypatch.setattr("routers.events.configuration_read_allowed", boom)

    async def scenario():
        response = await banner_events(Request())
        chunks = []

        async def read():
            async for chunk in response.body_iterator:
                chunks.append(chunk)

        try:
            await asyncio.wait_for(read(), timeout=1)
        except TimeoutError:
            raise AssertionError("banner stream did not end after the matching revocation")
        return "".join(chunks)

    body = _run(scenario())
    assert "banner_state" in body
    assert ": keepalive" not in body
