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
        async def get(self):
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


def test_ssh_watches_use_the_shared_helper():
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    for rel in (
        "routers/console/console.py",
        "routers/monitoring/monitoring.py",
    ):
        text = (root / rel).read_text()
        assert "watch_stream_revocation(" in text, rel
        assert "still = True" not in text, rel
    events = (root / "routers/events.py").read_text()
    assert "fail_closed(" in events
    assert "assume valid when the database is unavailable" not in events
