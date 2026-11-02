"""SSH host-key pinning. No database required."""

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace

import asyncssh
import pytest
from fastapi import HTTPException

import routers.container.container as container_router
import routers.system as system_router
import utils.archive_url as archive_url
import utils.ssh as ssh
from utils.ssh import SshHostKeyRejected


def _run(coro):
    return asyncio.run(coro)


class _Conn:
    def __init__(self, row=None, in_transaction=True):
        self.row = row
        self.in_transaction = in_transaction
        self.queries = []
        self.entered_transaction = False
        self.keys = {}
        self.held = 0
        self.committed = {}

    def is_in_transaction(self):
        return self.in_transaction

    def transaction(self):
        conn = self

        class _Tx:
            async def __aenter__(self):
                conn.entered_transaction = True
                conn.in_transaction = True
                return conn

            async def __aexit__(self, *args):
                conn.in_transaction = False
                return False

        return _Tx()

    async def execute(self, query, *args):
        self.queries.append((query, args))
        if "INSERT INTO ssh_host_keys" in query:
            self.keys[(args[0], args[1], args[2])] = args[3]
            self.row = {"hostKey": args[3]}

    async def fetchrow(self, query, *args):
        self.queries.append((query, args))
        if "ssh_host_keys" in query:
            stored = self.keys.get((args[0], args[1], args[2]))
            if stored is None and self.row is not None:
                return self.row
            if stored is None:
                return None
            return {"hostKey": stored}
        return self.row


def _opener(conn):
    """Commit pin writes when the short connection exits, not later."""
    def open_conn():
        @asynccontextmanager
        async def _cm():
            conn.held += 1
            snapshot = dict(conn.keys)
            try:
                yield conn
            except BaseException:
                conn.keys = snapshot
                raise
            else:
                conn.committed = dict(conn.keys)
            finally:
                conn.held -= 1
        return _cm()
    return open_conn


def test_rejection_is_not_an_ssh_error():
    assert not issubclass(SshHostKeyRejected, asyncssh.Error)
    assert not issubclass(SshHostKeyRejected, OSError)
    assert "ssh-ed25519" not in SshHostKeyRejected.message
    assert "AAAA" not in SshHostKeyRejected.message


def test_pinned_connect_uses_known_hosts_object_not_a_filename(monkeypatch):
    private = asyncssh.generate_private_key("ssh-ed25519")
    stored = private.export_public_key().decode().strip()
    seen = {}

    async def fake_connect(host, port=22, **kwargs):
        assert conn.held == 0
        seen["known_hosts"] = kwargs.get("known_hosts")
        seen["username"] = kwargs.get("username")
        return object()

    conn = _Conn(row={"hostKey": stored})
    monkeypatch.setattr(ssh.asyncssh, "connect", fake_connect)
    _run(ssh.connect(
        open_conn=_opener(conn),
        instance_id="inst",
        host="router.example",
        port=22,
        username="vyos",
        known_hosts=None,
    ))

    known = seen["known_hosts"]
    assert not isinstance(known, (str, bytes))
    assert isinstance(known, asyncssh.SSHKnownHosts)
    assert seen["username"] == "vyos"
    matched = known.match("router.example", "203.0.113.8", None)[0]
    assert matched[0].export_public_key().decode().strip() == stored
    other = asyncssh.generate_private_key("ssh-ed25519")
    assert other.export_public_key() not in [key.export_public_key() for key in matched]
    assert conn.held == 0
    assert not any("pg_advisory_xact_lock" in query for query, _args in conn.queries)


def test_nonstandard_port_pattern_matches_only_that_port(monkeypatch):
    private = asyncssh.generate_private_key("ssh-ed25519")
    stored = private.export_public_key().decode().strip()
    seen = {}

    async def fake_connect(host, port=22, **kwargs):
        seen["known_hosts"] = kwargs["known_hosts"]
        return object()

    monkeypatch.setattr(ssh.asyncssh, "connect", fake_connect)
    _run(ssh.connect(
        open_conn=_opener(_Conn(row={"hostKey": stored})),
        instance_id="inst",
        host="2001:db8::5",
        port=2222,
    ))
    known = seen["known_hosts"]
    assert known.match("2001:db8::5", "", 2222)[0]
    assert not known.match("2001:db8::5", "", None)[0]


def test_corrupt_pin_is_refused_without_accepting_any_key(monkeypatch):
    called = False

    async def fake_connect(*args, **kwargs):
        nonlocal called
        called = True
        return object()

    monkeypatch.setattr(ssh.asyncssh, "connect", fake_connect)
    with pytest.raises(SshHostKeyRejected):
        _run(ssh.connect(
            open_conn=_opener(_Conn(row={"hostKey": "not-a-key"})),
            instance_id="inst",
            host="router.example",
        ))
    assert called is False


def test_first_use_stores_the_presented_key_and_closes_on_insert_failure(monkeypatch):
    private = asyncssh.generate_private_key("ssh-ed25519")

    class _SSH:
        def __init__(self):
            self.closed = False

        def get_server_host_key(self):
            return private

        def close(self):
            self.closed = True

    opened = _SSH()

    async def fake_connect(*args, **kwargs):
        assert kwargs.get("known_hosts") is None
        return opened

    class _FailInsert(_Conn):
        async def execute(self, query, *args):
            self.queries.append((query, args))
            if "INSERT INTO ssh_host_keys" in query:
                raise RuntimeError("disk full")

    monkeypatch.setattr(ssh.asyncssh, "connect", fake_connect)
    conn = _FailInsert(row=None, in_transaction=False)
    with pytest.raises(RuntimeError, match="disk full"):
        _run(ssh.connect(open_conn=_opener(conn), instance_id="inst", host="router.example"))
    assert opened.closed is True
    assert conn.entered_transaction is True
    assert conn.held == 0
    assert conn.keys == {}


def test_missing_server_key_does_not_store_a_pin(monkeypatch):
    class _SSH:
        def __init__(self):
            self.closed = False

        def get_server_host_key(self):
            return None

        def close(self):
            self.closed = True

    opened = _SSH()

    async def fake_connect(*args, **kwargs):
        return opened

    monkeypatch.setattr(ssh.asyncssh, "connect", fake_connect)
    conn = _Conn(row=None)
    with pytest.raises(asyncssh.HostKeyNotVerifiable):
        _run(ssh.connect(open_conn=_opener(conn), instance_id="inst", host="router.example"))
    assert opened.closed is True
    assert not any("INSERT INTO ssh_host_keys" in query for query, _args in conn.queries)


def test_changed_key_is_refused_and_pin_is_not_replaced(monkeypatch):
    private = asyncssh.generate_private_key("ssh-ed25519")
    stored = private.export_public_key().decode().strip()
    called = False

    async def fake_connect(*args, **kwargs):
        nonlocal called
        called = True
        assert isinstance(kwargs.get("known_hosts"), asyncssh.SSHKnownHosts)
        raise asyncssh.HostKeyNotVerifiable(
            "Host key is not trusted for host router.example"
        )

    monkeypatch.setattr(ssh.asyncssh, "connect", fake_connect)
    conn = _Conn(row={"hostKey": stored})
    with pytest.raises(SshHostKeyRejected, match=SshHostKeyRejected.message):
        _run(ssh.connect(
            open_conn=_opener(conn),
            instance_id="inst",
            host="router.example",
            known_hosts=None,
        ))
    assert called is True
    assert not any("INSERT INTO ssh_host_keys" in query for query, _args in conn.queries)


class _AllowAll(asyncssh.SSHServer):
    def begin_auth(self, username):
        return False


def test_loopback_pin_accepts_the_same_key_and_refuses_a_different_one(monkeypatch):
    real_connect = asyncssh.connect
    seen = []

    async def wrapped(host, port=22, **kwargs):
        seen.append(kwargs.get("known_hosts"))
        return await real_connect(host, port=port, **kwargs)

    monkeypatch.setattr(ssh.asyncssh, "connect", wrapped)

    async def scenario():
        server_key = asyncssh.generate_private_key("ssh-ed25519")
        other_key = asyncssh.generate_private_key("ssh-ed25519")
        server = await asyncssh.create_server(
            _AllowAll,
            "127.0.0.1",
            0,
            server_host_keys=[server_key],
        )
        port = server.sockets[0].getsockname()[1]
        db = _Conn(row=None)
        try:
            first = await ssh.connect(
                open_conn=_opener(db),
                instance_id="inst",
                host="127.0.0.1",
                port=port,
                username="vyos",
            )
            first.close()
            await first.wait_closed()
            stored = db.keys[("inst", "127.0.0.1", port)]
            assert stored == server_key.export_public_key().decode().strip()
            assert seen[0] is None

            second = await ssh.connect(
                open_conn=_opener(db),
                instance_id="inst",
                host="127.0.0.1",
                port=port,
                username="vyos",
                known_hosts=None,
            )
            second.close()
            await second.wait_closed()
            assert isinstance(seen[1], asyncssh.SSHKnownHosts)

            db.keys[("inst", "127.0.0.1", port)] = other_key.export_public_key().decode().strip()
            db.row = {"hostKey": db.keys[("inst", "127.0.0.1", port)]}
            with pytest.raises(SshHostKeyRejected) as raised:
                await ssh.connect(
                    open_conn=_opener(db),
                    instance_id="inst",
                    host="127.0.0.1",
                    port=port,
                    username="vyos",
                )
            assert str(raised.value) == SshHostKeyRejected.message
            assert server_key.export_public_key().decode().strip() not in str(raised.value)
            assert db.keys[("inst", "127.0.0.1", port)] == other_key.export_public_key().decode().strip()
            assert isinstance(seen[2], asyncssh.SSHKnownHosts)
        finally:
            server.close()
            await server.wait_closed()

    _run(scenario())


def test_sftp_archive_does_not_hide_a_changed_host_key(monkeypatch):
    async def reject(**kwargs):
        raise SshHostKeyRejected()

    monkeypatch.setattr(archive_url, "connect_ssh", reject)
    with pytest.raises(SshHostKeyRejected):
        _run(archive_url.list_archive_files(
            "sftp://vyos:secret@backup.example/cfg/",
            open_conn=lambda: None,
            instance_id="inst",
        ))
    with pytest.raises(SshHostKeyRejected):
        _run(archive_url.fetch_archive_file_content(
            "sftp://vyos:secret@backup.example/cfg/",
            "config.boot",
            open_conn=lambda: None,
            instance_id="inst",
        ))


def test_sftp_archive_without_instance_does_not_connect(monkeypatch):
    def fail_connect(*args, **kwargs):
        raise AssertionError("unpinned SSH connect")

    monkeypatch.setattr(archive_url.asyncssh, "connect", fail_connect)
    with pytest.raises(ValueError, match="active instance"):
        _run(archive_url.list_archive_files("scp://backup.example/cfg/"))


def test_http_archive_does_not_require_an_instance(monkeypatch):
    async def empty(url):
        return [{"filename": "config.boot", "modified": None, "size": None}]

    monkeypatch.setattr(archive_url, "_list_http", empty)
    files = _run(archive_url.list_archive_files("https://backup.example/cfg/"))
    assert files[0]["filename"] == "config.boot"


def test_call_sites_do_not_disable_host_key_checks():
    root = Path(__file__).resolve().parents[1]
    for relative in (
        "routers/console/console.py",
        "routers/monitoring/monitoring.py",
        "routers/container/container.py",
        "utils/archive_url.py",
    ):
        text = (root / relative).read_text()
        assert "known_hosts=None" not in text
        assert "known_hosts = None" not in text
        assert "asyncssh.connect" not in text


def test_container_ssh_passes_instance_and_hides_key_material(monkeypatch):
    calls = []

    class _RowConn:
        async def fetchrow(self, *args):
            return {
                "host": "10.0.0.5",
                "sshPort": 22,
                "sshUsername": "vyos",
                "sshEncryptedPrivKey": b"enc",
                "sshKeyNonce": "nonce",
                "sshKeyConfigured": True,
            }

    @asynccontextmanager
    async def scoped(request):
        yield _RowConn()

    async def reject(**kwargs):
        calls.append(kwargs)
        raise SshHostKeyRejected()

    monkeypatch.setattr(container_router, "request_scoped_conn", scoped)
    monkeypatch.setattr(container_router, "decrypt_private_key", lambda *args: b"pem")
    monkeypatch.setattr(container_router.asyncssh, "import_private_key", lambda pem: "client-key")
    monkeypatch.setattr(container_router, "connect_ssh", reject)

    request = SimpleNamespace(state=SimpleNamespace(
        user={"id": "user"},
        instance={"id": "inst-1"},
    ))
    with pytest.raises(HTTPException) as raised:
        _run(container_router._get_ssh_connection(request))
    assert raised.value.status_code == 502
    assert raised.value.detail == SshHostKeyRejected.message
    assert "ssh-ed25519" not in raised.value.detail
    assert calls[0]["instance_id"] == "inst-1"
    assert calls[0]["host"] == "10.0.0.5"
    assert calls[0]["port"] == 22
    assert calls[0]["username"] == "vyos"
    assert calls[0]["client_keys"] == ["client-key"]
    assert "known_hosts" not in calls[0]


def _archive_request(instance):
    return SimpleNamespace(state=SimpleNamespace(instance=instance))


def _patch_archive_endpoint(monkeypatch, error):
    async def allow(*args, **kwargs):
        return None

    class _Service:
        def get_full_config(self, refresh=False):
            return {"system": {}}

        def get_version(self):
            return "1.4"

    class _Mapper:
        def parse_config_management(self, system_cfg):
            return {"archive_locations": ["sftp://backup.example/cfg/"]}

    async def fail(*args, **kwargs):
        raise error

    monkeypatch.setattr(system_router, "require_read_permission", allow)
    monkeypatch.setattr(system_router, "get_session_vyos_service", lambda request: _Service())
    monkeypatch.setattr(system_router.CommandMapperRegistry, "get_mapper", lambda *args: _Mapper())
    monkeypatch.setattr(system_router, "_list_archive_files", fail)
    monkeypatch.setattr(system_router, "fetch_archive_file_content", fail)


def test_archive_endpoints_map_a_changed_host_key(monkeypatch):
    _patch_archive_endpoint(monkeypatch, SshHostKeyRejected())
    request = _archive_request({"id": "inst"})
    with pytest.raises(HTTPException) as listed:
        _run(system_router.list_archive_files_endpoint(
            request, "sftp://backup.example/cfg/",
        ))
    assert listed.value.status_code == 502
    assert listed.value.detail == SshHostKeyRejected.message

    with pytest.raises(HTTPException) as diffed:
        _run(system_router.get_archive_diff(
            request, "sftp://backup.example/cfg/", "config.boot",
        ))
    assert diffed.value.status_code == 502
    assert diffed.value.detail == SshHostKeyRejected.message


def test_archive_endpoints_reject_a_missing_instance(monkeypatch):
    _patch_archive_endpoint(monkeypatch, AssertionError("should not list"))
    request = _archive_request({})
    with pytest.raises(HTTPException) as raised:
        _run(system_router.list_archive_files_endpoint(
            request, "sftp://backup.example/cfg/",
        ))
    assert raised.value.status_code == 400


def test_console_and_monitoring_pin_and_report_a_changed_key(monkeypatch):
    import routers.console.console as console_router
    import routers.monitoring.monitoring as monitoring_router

    class _Socket:
        def __init__(self):
            self.sent = []
            self.closed = False
            self.headers = {"origin": "https://app.example"}

        async def accept(self):
            return None

        async def send_json(self, payload):
            self.sent.append(payload)

        async def close(self, code=None):
            self.closed = True

        async def receive_json(self):
            return {"command": "monitor_interfaces", "params": {}}

    class _Row:
        async def fetchrow(self, *args):
            return {
                "host": "10.1.1.1",
                "sshPort": 2222,
                "sshUsername": "vyos",
                "sshEncryptedPrivKey": b"enc",
                "sshKeyNonce": "nonce",
                "sshKeyConfigured": True,
            }

    @asynccontextmanager
    async def org_conn(*args):
        yield _Row()

    async def allow(*args, **kwargs):
        return True

    async def reject(**kwargs):
        calls.append(kwargs)
        raise SshHostKeyRejected()

    calls = []
    console_socket = _Socket()
    monkeypatch.setattr(console_router, "websocket_origin_allowed", lambda origin: True)
    monkeypatch.setattr(
        console_router,
        "_authenticate_websocket",
        lambda websocket: _done({"user_id": "user", "instance_id": "inst-9"}),
    )
    monkeypatch.setattr(console_router, "ws_org_conn", org_conn)
    monkeypatch.setattr(console_router, "check_permission", allow)
    monkeypatch.setattr(console_router, "decrypt_private_key", lambda *args: b"pem")
    monkeypatch.setattr(console_router.asyncssh, "import_private_key", lambda pem: "client-key")
    monkeypatch.setattr(console_router, "connect_ssh", reject)
    _run(console_router.websocket_console(console_socket))
    assert calls[0]["instance_id"] == "inst-9"
    assert calls[0]["host"] == "10.1.1.1"
    assert calls[0]["port"] == 2222
    assert calls[0]["username"] == "vyos"
    assert calls[0]["client_keys"] == ["client-key"]
    assert "known_hosts" not in calls[0]
    assert {
        "type": "error",
        "message": SshHostKeyRejected.message,
    } in console_socket.sent
    assert console_socket.closed is True

    calls.clear()
    monitor_socket = _Socket()
    monkeypatch.setattr(monitoring_router, "websocket_origin_allowed", lambda origin: True)
    monkeypatch.setattr(
        monitoring_router,
        "_authenticate_websocket",
        lambda websocket: _done({"user_id": "user", "instance_id": "inst-9"}),
    )
    monkeypatch.setattr(monitoring_router, "ws_org_conn", org_conn)
    monkeypatch.setattr(monitoring_router, "check_permission", allow)
    monkeypatch.setattr(monitoring_router, "decrypt_private_key", lambda *args: b"pem")
    monkeypatch.setattr(
        monitoring_router.asyncssh, "import_private_key", lambda pem: "client-key",
    )
    monkeypatch.setattr(monitoring_router, "build_command", lambda name, params: "show interfaces")
    monkeypatch.setattr(monitoring_router, "connect_ssh", reject)
    _run(monitoring_router.websocket_monitor(monitor_socket))
    assert calls[0]["instance_id"] == "inst-9"
    assert calls[0]["host"] == "10.1.1.1"
    assert calls[0]["port"] == 2222
    assert "known_hosts" not in calls[0]
    assert {
        "type": "error",
        "data": SshHostKeyRejected.message,
    } in monitor_socket.sent
    assert monitor_socket.closed is True


def _done(value):
    async def inner(*args, **kwargs):
        return value
    return inner()


def test_message_says_how_to_reset():
    assert "reset the host key" in SshHostKeyRejected.message
    assert "instance SSH settings" in SshHostKeyRejected.message
    assert "ssh-ed25519" not in SshHostKeyRejected.message


def test_cancelled_insert_closes_the_connection(monkeypatch):
    private = asyncssh.generate_private_key("ssh-ed25519")

    class _SSH:
        def __init__(self):
            self.closed = False

        def get_server_host_key(self):
            return private

        def close(self):
            self.closed = True

    opened = _SSH()

    async def fake_connect(*args, **kwargs):
        assert conn.held == 0
        return opened

    class _CancelInsert(_Conn):
        async def execute(self, query, *args):
            self.queries.append((query, args))
            if "INSERT INTO ssh_host_keys" in query:
                raise asyncio.CancelledError()

    monkeypatch.setattr(ssh.asyncssh, "connect", fake_connect)
    conn = _CancelInsert(row=None)
    with pytest.raises(asyncio.CancelledError):
        _run(ssh.connect(open_conn=_opener(conn), instance_id="inst", host="router.example"))
    assert opened.closed is True
    assert conn.held == 0
    assert conn.keys == {}


def test_pin_survives_a_later_sftp_failure(monkeypatch):
    private = asyncssh.generate_private_key("ssh-ed25519")

    class _SSH:
        def get_server_host_key(self):
            return private

        def close(self):
            return None

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        def start_sftp_client(self):
            raise ValueError("archive read failed")

    async def fake_connect(*args, **kwargs):
        assert conn.held == 0
        return _SSH()

    monkeypatch.setattr(ssh.asyncssh, "connect", fake_connect)
    conn = _Conn(row=None)
    with pytest.raises(ValueError, match="archive read failed"):
        _run(archive_url.list_archive_files(
            "sftp://vyos:secret@backup.example/cfg/",
            open_conn=_opener(conn),
            instance_id="inst",
        ))
    assert conn.held == 0
    stored = private.export_public_key().decode().strip()
    assert conn.committed[("inst", "backup.example", 22)] == stored


def test_archive_and_container_pins_do_not_join_the_handler_transaction(monkeypatch):
    import routers.container.container as container_router
    import routers.system as system_router

    handler = object()
    fresh = object()

    @asynccontextmanager
    async def independent(request):
        yield fresh

    class _Row:
        async def fetchrow(self, *args):
            return {
                "host": "10.0.0.5",
                "sshPort": 22,
                "sshUsername": "vyos",
                "sshEncryptedPrivKey": b"enc",
                "sshKeyNonce": "nonce",
                "sshKeyConfigured": True,
            }

    @asynccontextmanager
    async def row_conn(request):
        yield _Row()

    seen = []

    async def capture_ssh(**kwargs):
        async with kwargs["open_conn"]() as conn:
            seen.append(conn)
        raise SshHostKeyRejected()

    monkeypatch.setattr(container_router, "request_scoped_conn", row_conn)
    monkeypatch.setattr(container_router, "independent_org_conn", independent)
    monkeypatch.setattr(container_router, "decrypt_private_key", lambda *args: b"pem")
    monkeypatch.setattr(container_router.asyncssh, "import_private_key", lambda pem: "key")
    monkeypatch.setattr(container_router, "connect_ssh", capture_ssh)
    request = SimpleNamespace(
        state=SimpleNamespace(user={"id": "u"}, instance={"id": "inst"}, org_conn=handler),
    )
    with pytest.raises(HTTPException):
        _run(container_router._get_ssh_connection(request))
    assert seen == [fresh]
    assert handler not in seen

    seen.clear()

    async def capture_list(url, *, open_conn, instance_id):
        async with open_conn() as conn:
            seen.append(conn)
        return []

    async def allow(*args, **kwargs):
        return None

    class _Service:
        def get_full_config(self, refresh=False):
            return {"system": {}}

        def get_version(self):
            return "1.4"

    class _Mapper:
        def parse_config_management(self, system_cfg):
            return {"archive_locations": ["sftp://backup.example/cfg/"]}

    monkeypatch.setattr(system_router, "require_read_permission", allow)
    monkeypatch.setattr(system_router, "get_session_vyos_service", lambda request: _Service())
    monkeypatch.setattr(system_router.CommandMapperRegistry, "get_mapper", lambda *args: _Mapper())
    monkeypatch.setattr(system_router, "independent_org_conn", independent)
    monkeypatch.setattr(system_router, "_list_archive_files", capture_list)
    archive_request = SimpleNamespace(state=SimpleNamespace(
        instance={"id": "inst"},
        org_conn=handler,
    ))
    _run(system_router.list_archive_files_endpoint(
        archive_request, "sftp://backup.example/cfg/",
    ))
    assert seen == [fresh]


def test_different_key_type_is_refused_on_a_real_server():
    class _Allow(_AllowAll):
        pass

    async def scenario():
        pinned = asyncssh.generate_private_key("ssh-ed25519")
        other = asyncssh.generate_private_key("ecdsa-sha2-nistp256")
        server = await asyncssh.create_server(
            _Allow, "127.0.0.1", 0, server_host_keys=[other],
        )
        port = server.sockets[0].getsockname()[1]
        db = _Conn(row={"hostKey": pinned.export_public_key().decode().strip()})
        try:
            with pytest.raises(SshHostKeyRejected) as raised:
                await ssh.connect(
                    open_conn=_opener(db),
                    instance_id="inst",
                    host="127.0.0.1",
                    port=port,
                    username="vyos",
                )
            assert str(raised.value) == SshHostKeyRejected.message
            assert "ecdsa" not in str(raised.value)
            assert db.keys == {}
        finally:
            server.close()
            await server.wait_closed()

    _run(scenario())


def test_unrelated_key_exchange_failure_is_not_a_host_key_change(monkeypatch):
    private = asyncssh.generate_private_key("ssh-ed25519")
    stored = private.export_public_key().decode().strip()

    async def fake_connect(*args, **kwargs):
        raise asyncssh.KeyExchangeFailed(
            "No matching encryption algorithm found, sent aes128-ctr and received <None>"
        )

    monkeypatch.setattr(ssh.asyncssh, "connect", fake_connect)
    with pytest.raises(asyncssh.KeyExchangeFailed):
        _run(ssh.connect(
            open_conn=_opener(_Conn(row={"hostKey": stored})),
            instance_id="inst",
            host="router.example",
        ))


def test_independent_org_conn_commits_its_own_connection():
    import org_scope

    class _DB:
        def __init__(self):
            self.queries = []
            self.in_tx = False

        def transaction(self):
            db = self

            class _Tx:
                async def __aenter__(self):
                    db.in_tx = True
                    return db

                async def __aexit__(self, *args):
                    db.in_tx = False
                    return False

            return _Tx()

        async def execute(self, query, *args):
            self.queries.append((query, args))

    class _Pool:
        def __init__(self):
            self.conn = _DB()
            self.held = 0

        def acquire(self):
            pool = self

            class _Acq:
                async def __aenter__(self):
                    pool.held += 1
                    return pool.conn

                async def __aexit__(self, *args):
                    pool.held -= 1
                    return False

            return _Acq()

    handler = object()
    pool = _Pool()
    request = SimpleNamespace(
        app=SimpleNamespace(state=SimpleNamespace(db_pool=pool)),
        state=SimpleNamespace(
            org={"id": "org-1"},
            user_role="VIEWER",
            org_conn=handler,
            acting_org_id="org-stale",
        ),
    )

    async def run():
        async with org_scope.independent_org_conn(request) as conn:
            assert conn is pool.conn
            assert conn is not handler
            assert pool.conn.in_tx is True
            assert pool.held == 1
            assert ("org-1", "false") in [args for _query, args in pool.conn.queries]
            assert not any(args and args[0] == "org-stale" for _query, args in pool.conn.queries)
        assert pool.conn.in_tx is False
        assert pool.held == 0
        assert request.state.org_conn is handler

    _run(run())


def test_independent_org_conn_resolves_an_unknown_role():
    import org_scope

    class _DB:
        def __init__(self):
            self.queries = []

        def transaction(self):
            db = self

            class _Tx:
                async def __aenter__(self):
                    return db

                async def __aexit__(self, *args):
                    return False

            return _Tx()

        async def execute(self, query, *args):
            self.queries.append((query, args))

        async def fetchval(self, query, *args):
            return "ADMIN"

    class _Pool:
        def __init__(self):
            self.conn = _DB()

        def acquire(self):
            pool = self

            class _Acq:
                async def __aenter__(self):
                    return pool.conn

                async def __aexit__(self, *args):
                    return False

            return _Acq()

    pool = _Pool()
    request = SimpleNamespace(
        app=SimpleNamespace(state=SimpleNamespace(db_pool=pool)),
        state=SimpleNamespace(org={"id": "org-9"}, user={"id": "user-1"}),
    )

    async def run():
        async with org_scope.independent_org_conn(request) as conn:
            assert conn is pool.conn
            assert ("org-9", "true") in [args for _query, args in pool.conn.queries]

    _run(run())


def test_replaced_router_pin_is_dropped_only_when_the_endpoint_changes():
    class _Delete:
        def __init__(self):
            self.queries = []

        async def execute(self, query, *args):
            self.queries.append((query, args))

    same = _Delete()
    _run(ssh.forget_replaced_router_pin(same, "inst", "10.0.0.1", 22, "10.0.0.1", 22))
    assert same.queries == []

    changed = _Delete()
    _run(ssh.forget_replaced_router_pin(changed, "inst", "10.0.0.1", 22, "10.0.0.2", 22))
    assert changed.queries[0][1] == ("inst", "10.0.0.1", 22)


def test_reset_refuses_a_caller_who_is_not_site_admin(monkeypatch):
    import fastapi_permissions
    import routers.monitoring.monitoring as monitoring_router

    class _Conn:
        async def fetchval(self, query, *args):
            return "org-other"

        async def execute(self, query, *args):
            raise AssertionError("must not delete pins")

    @asynccontextmanager
    async def scoped(request):
        yield _Conn()

    async def not_admin(conn, user_id):
        return False

    monkeypatch.setattr(fastapi_permissions, "request_scoped_conn", scoped)
    monkeypatch.setattr(fastapi_permissions, "is_super_admin", not_admin)
    request = SimpleNamespace(state=SimpleNamespace(user={"id": "viewer"}))
    with pytest.raises(HTTPException) as raised:
        _run(monitoring_router.reset_ssh_host_key("inst-1", request))
    assert raised.value.status_code == 403


def test_reset_refuses_a_cross_org_instance(monkeypatch):
    import fastapi_permissions
    import org_scope
    import routers.monitoring.monitoring as monitoring_router

    deleted = []

    class _Conn:
        async def fetchval(self, query, *args):
            return "org-other"

        async def execute(self, query, *args):
            deleted.append(query)

    @asynccontextmanager
    async def scoped(request):
        yield _Conn()

    async def is_admin(conn, user_id):
        return True

    monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", True)
    monkeypatch.setattr(fastapi_permissions, "request_scoped_conn", scoped)
    monkeypatch.setattr(fastapi_permissions, "is_super_admin", is_admin)
    monkeypatch.setattr(monitoring_router, "request_scoped_conn", scoped)
    request = SimpleNamespace(state=SimpleNamespace(
        user={"id": "admin"},
        user_role="VIEWER",
        acting_org_id="org-mine",
    ))
    with pytest.raises(HTTPException) as raised:
        _run(monitoring_router.reset_ssh_host_key("inst-foreign", request))
    assert raised.value.status_code == 404
    assert deleted == []


def test_reset_endpoint_forgets_pins_for_an_admin_in_the_org(monkeypatch):
    import fastapi_permissions
    import routers.monitoring.monitoring as monitoring_router

    deleted = {}

    class _Conn:
        async def fetchval(self, query, *args):
            return "org-mine"

        async def execute(self, query, *args):
            deleted["query"] = query
            deleted["args"] = args

    @asynccontextmanager
    async def scoped(request):
        yield _Conn()

    async def is_admin(conn, user_id):
        return True

    monkeypatch.setattr(fastapi_permissions, "request_scoped_conn", scoped)
    monkeypatch.setattr(fastapi_permissions, "is_super_admin", is_admin)
    monkeypatch.setattr(monitoring_router, "request_scoped_conn", scoped)
    request = SimpleNamespace(state=SimpleNamespace(user={"id": "admin"}))
    result = _run(monitoring_router.reset_ssh_host_key("inst-1", request))
    assert result.success is True
    assert deleted["args"] == ("inst-1",)
    assert "ssh_host_keys" in deleted["query"]


def test_update_instance_drops_the_old_router_pin(monkeypatch):
    from datetime import datetime, timezone

    import routers.session.session as session_router

    class _Conn:
        def __init__(self):
            self.deleted = []

        async def fetchval(self, query, *args):
            if "role FROM users" in query:
                return "ADMIN"
            return "org-1"

        async def fetchrow(self, query, *args):
            if "org_id" in query:
                return {"host": "10.0.0.1", "sshPort": 22, "org_id": "org-1"}
            now = datetime.now(timezone.utc)
            return {
                "id": "inst",
                "siteId": "site",
                "name": "lab",
                "description": None,
                "host": "10.0.0.9",
                "port": 443,
                "protocol": "https",
                "verifySsl": False,
                "vyosVersion": "1.4",
                "isActive": True,
                "sshPort": 2222,
                "sshUsername": "vyos",
                "sshKeyConfigured": True,
                "commitConfirmEnabled": False,
                "commitConfirmMinutes": 5,
                "timeout": 10,
                "createdAt": now,
                "updatedAt": now,
            }

        async def execute(self, query, *args):
            self.deleted.append((query, args))

    async def allow(*args, **kwargs):
        return None

    monkeypatch.setattr(session_router, "assert_row_in_acting_org", allow)
    monkeypatch.setattr(session_router, "clear_session_cache", lambda instance_id: None)
    conn = _Conn()
    request = SimpleNamespace(state=SimpleNamespace(user={"id": "admin"}))
    body = session_router.InstanceUpdateRequest(host="10.0.0.9", ssh_port=2222)
    result = _run(session_router.update_instance(request, "inst", body, conn))
    assert result.host == "10.0.0.9"
    assert result.ssh_port == 2222
    assert conn.deleted[0][1] == ("inst", "10.0.0.1", 22)

    unchanged = _Conn()

    async def same_row(query, *args):
        if "org_id" in query:
            return {"host": "10.0.0.1", "sshPort": 22, "org_id": "org-1"}
        now = datetime.now(timezone.utc)
        row = {
            "id": "inst",
            "siteId": "site",
            "name": "lab",
            "description": None,
            "host": "10.0.0.1",
            "port": 443,
            "protocol": "https",
            "verifySsl": False,
            "vyosVersion": "1.4",
            "isActive": True,
            "sshPort": 22,
            "sshUsername": "vyos",
            "sshKeyConfigured": False,
            "commitConfirmEnabled": False,
            "commitConfirmMinutes": 5,
            "timeout": 10,
            "createdAt": now,
            "updatedAt": now,
        }
        return row

    unchanged.fetchrow = same_row
    _run(session_router.update_instance(
        request, "inst", session_router.InstanceUpdateRequest(name="lab"), unchanged,
    ))
    assert unchanged.deleted == []


def test_openssh_key_type_change_is_a_host_key_refusal(monkeypatch):
    """OpenSSH drops the socket when the client offers only the pinned type.

    Offering every algorithm makes the server present its key. That is a
    host-key refusal, including for an archive listing, not an empty success.
    A caller cannot put the narrowed list back.
    """
    private = asyncssh.generate_private_key("ssh-ed25519")
    stored = private.export_public_key().decode().strip()
    seen = []

    async def openssh_connect(*args, **kwargs):
        seen.append(dict(kwargs))
        if kwargs.get("server_host_key_algs") != "default":
            raise asyncssh.ConnectionLost("Connection lost")
        raise asyncssh.HostKeyNotVerifiable("Host key is not trusted")

    monkeypatch.setattr(ssh.asyncssh, "connect", openssh_connect)
    db = _Conn(row={"hostKey": stored})
    with pytest.raises(SshHostKeyRejected) as raised:
        _run(ssh.connect(
            open_conn=_opener(db),
            instance_id="inst",
            host="router.example",
            server_host_key_algs=["ssh-ed25519"],
        ))
    assert str(raised.value) == SshHostKeyRejected.message
    assert seen[-1]["server_host_key_algs"] == "default"

    with pytest.raises(SshHostKeyRejected):
        _run(archive_url.list_archive_files(
            "sftp://vyos@router.example/config/",
            open_conn=_opener(db),
            instance_id="inst",
        ))
    assert seen[-1]["server_host_key_algs"] == "default"
    assert db.keys == {}

