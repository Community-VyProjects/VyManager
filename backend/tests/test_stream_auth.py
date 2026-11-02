import asyncio
from contextlib import asynccontextmanager

import stream_auth


def test_recheck_stream_permission_returns_permission(monkeypatch):
    class Connection:
        pass

    @asynccontextmanager
    async def connection(*args):
        yield Connection()

    async def check_permission(*args):
        return True

    monkeypatch.setattr(stream_auth, "ws_org_conn", connection)
    monkeypatch.setattr(stream_auth, "check_permission", check_permission)

    assert asyncio.run(
        stream_auth.recheck_stream_permission(
            object(), "user", "instance", stream_auth.FeatureGroup.MONITORING
        )
    )


def test_recheck_stream_permission_fails_closed_on_error(monkeypatch):
    class FailingConnection:
        async def __aenter__(self):
            raise RuntimeError("database unavailable")

        async def __aexit__(self, *args):
            return False

    monkeypatch.setattr(
        stream_auth,
        "ws_org_conn",
        lambda *args: FailingConnection(),
    )

    assert not asyncio.run(
        stream_auth.recheck_stream_permission(
            object(), "user", "instance", stream_auth.FeatureGroup.MONITORING
        )
    )
