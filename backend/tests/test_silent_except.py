"""Exception handlers must not swallow failures silently.

CodeQL flags an ``except`` whose body is only ``pass`` with no comment
(py/empty-except). Intentional swallows say why in a comment; the rest
log or let the error reach the caller.
"""

import ast
import asyncio
import io
import logging
import tokenize
from contextlib import asynccontextmanager
from pathlib import Path

import pytest

import routers.monitoring.monitoring as monitoring
import utils.archive_url as archive_url
from vyos_mappers.ipsec.ipsec import IPSecMapper

BACKEND = Path(__file__).resolve().parents[1]
_SKIP_DIRS = {"venv", ".venv", "node_modules", "__pycache__"}


def _silent_handlers(path: Path):
    src = path.read_text()
    tree = ast.parse(src)
    comment_lines = {
        tok.start[0]
        for tok in tokenize.generate_tokens(io.StringIO(src).readline)
        if tok.type == tokenize.COMMENT
    }
    for node in ast.walk(tree):
        if not isinstance(node, ast.Try) or node.orelse:
            continue
        for handler in node.handlers:
            if not all(isinstance(stmt, ast.Pass) for stmt in handler.body):
                continue
            end = handler.body[-1].end_lineno or handler.lineno
            if not any(handler.lineno <= line <= end for line in comment_lines):
                yield handler.lineno


def test_no_uncommented_empty_except_in_backend():
    offenders = []
    for path in sorted(BACKEND.rglob("*.py")):
        if _SKIP_DIRS.intersection(path.relative_to(BACKEND).parts):
            continue
        offenders += [f"{path.relative_to(BACKEND)}:{n}" for n in _silent_handlers(path)]
    assert offenders == []


def test_ipsec_parse_error_reaches_the_caller():
    # A parser bug used to return an empty IPsec config, which the UI
    # showed as "nothing configured". The router turns it into a 500.
    broken = {"vpn": {"ipsec": {"log": "not-a-dict"}}}
    with pytest.raises(AttributeError):
        IPSecMapper("1.4").parse_config(broken)


def test_ftp_nlst_fallback_failure_is_logged(monkeypatch, caplog):
    class RefusingFTP:
        def connect(self, *args, **kwargs):
            raise OSError("refused")

    monkeypatch.setattr(archive_url.ftplib, "FTP", RefusingFTP)
    caplog.set_level(logging.WARNING, logger=archive_url.logger.name)

    files = asyncio.run(
        archive_url._list_ftp(hostname="h", port=21, username="u", password="p", path="/")
    )

    assert files == []
    messages = [r.getMessage() for r in caplog.records]
    assert "FTP directory listing failed" in messages
    assert "FTP NLST fallback listing failed" in messages


class _FakeWebSocket:
    headers = {"origin": "https://vymanager.test"}

    def __init__(self):
        self.sent = []
        self._received = False

    async def accept(self):
        pass

    async def send_json(self, data):
        self.sent.append(data)

    async def receive_json(self):
        if not self._received:
            self._received = True
            return {"command": "anything", "params": {}}
        await asyncio.Event().wait()

    async def close(self):
        pass


def test_monitoring_logs_pending_task_teardown_error(monkeypatch, caplog):
    # When the output stream ends, the other tasks are cancelled and
    # awaited. A task that fails during that teardown used to vanish.
    user = {"user_id": "u_mon", "instance_id": "i_mon"}

    async def authenticate(_ws):
        return user

    class Conn:
        async def fetchrow(self, *args):
            return {
                "host": "h", "sshPort": 22, "sshUsername": "vyos",
                "sshEncryptedPrivKey": "enc", "sshKeyNonce": "n",
                "sshKeyConfigured": True,
            }

    @asynccontextmanager
    async def org_conn(*args):
        yield Conn()

    async def allowed(*args, **kwargs):
        return True

    class Stdout:
        async def read(self, _n):
            return ""

    class Process:
        stdout = Stdout()

        def terminate(self):
            pass

    class SshConn:
        async def create_process(self, *args, **kwargs):
            return Process()

        def close(self):
            pass

    async def connect(**kwargs):
        return SshConn()

    async def revocation_watch_that_fails_on_cancel(*args):
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            raise RuntimeError("teardown failed")

    monkeypatch.setattr(monitoring, "websocket_origin_allowed", lambda origin: True)
    monkeypatch.setattr(monitoring, "_authenticate_websocket", authenticate)
    monkeypatch.setattr(monitoring, "ws_org_conn", org_conn)
    monkeypatch.setattr(monitoring, "check_permission", allowed)
    monkeypatch.setattr(monitoring, "build_command", lambda name, params: "show version")
    monkeypatch.setattr(monitoring, "decrypt_private_key", lambda *args: b"pem")
    monkeypatch.setattr(monitoring.asyncssh, "import_private_key", lambda pem: object())
    monkeypatch.setattr(monitoring, "connect_ssh", connect)
    monkeypatch.setattr(
        monitoring, "watch_stream_revocation", revocation_watch_that_fails_on_cancel
    )
    monkeypatch.setattr(monitoring, "_active_sessions", {})
    caplog.set_level(logging.ERROR, logger=monitoring.logger.name)

    ws = _FakeWebSocket()
    asyncio.run(asyncio.wait_for(monitoring.websocket_monitor(ws), timeout=5))

    teardown = [
        r for r in caplog.records
        if r.getMessage() == "Monitoring: error while cancelling pending task"
    ]
    assert len(teardown) == 1
    assert isinstance(teardown[0].exc_info[1], RuntimeError)
    assert {"type": "stopped"} in ws.sent
