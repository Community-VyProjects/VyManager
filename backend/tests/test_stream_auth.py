import asyncio
from contextlib import asynccontextmanager

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

    show = calls("routers/show.py", "fail_closed")
    assert len(show) == 1
    assert "assume valid when the database is unavailable" not in (
        root / "routers/show.py"
    ).read_text()


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


def test_banner_stays_open_only_when_read_holds():
    from routers import events

    async def allowed():
        return True

    async def denied():
        return False

    assert _run(events.banner_access_revoked(allowed)) is False
    assert _run(events.banner_access_revoked(denied)) is True
