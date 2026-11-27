"""A rejected commit can leave part of the batch live (#1700).

Lab (1.4.3 and rolling): one /configure with a dummy interface edit and a
DHCP server that fails verify returns success:false, but the dummy edit is
in the running config. execute_batch recorded the managed snapshot only on
success, so reconciliation folded the landed edit into the baseline as an
external change and the unsaved-changes banner never showed it.
"""

from typing import Any, cast

import pytest
from pyvyos.core.rest_client import ApiResponse

import config_state
from routers.config.config import deep_diff
import commit_confirm_state
from vyos_service import (
    PARTIAL_COMMIT_NOTICE,
    UNANSWERED_COMMIT_CONFIRM_NOTICE,
    UNANSWERED_COMMIT_NOTICE,
    UNREAD_COMMIT_NOTICE,
    VyOSDeviceConfig,
    VyOSService,
)

IID = "inst-1700"
BEFORE = {
    "interfaces": {"dummy": {"dum0": {"address": ["10.0.0.1/32"]}}},
    "system": {"host-name": "lab"},
}


class _Batch:
    def __init__(self, ops):
        self.ops = ops

    def is_empty(self):
        return not self.ops

    def get_operations(self):
        return self.ops


BATCH: Any = _Batch([
    {"op": "set", "path": ["interfaces", "dummy", "dum1", "description", "partial"]},
    {"op": "set", "path": ["service", "dhcp-server", "shared-network-name", "T", "subnet", "10.9.9.0/24", "subnet-id", "1"]},
])


@pytest.fixture(autouse=True)
def _baseline():
    config_state.set_saved_config(IID, BEFORE)
    commit_confirm_state.clear(IID)
    yield
    config_state.clear_saved_config(IID)
    commit_confirm_state.clear(IID)


def _service(live, *, commit_status=400, commit_error="[[service dhcp-server]] failed\nCommit failed\n", read_fails=False):
    service = VyOSService(VyOSDeviceConfig(hostname="lab", apikey="k", version="1.5", instance_id=IID))
    service.commit_operations = lambda operations: ApiResponse(
        status=commit_status, request={}, result={}, error=commit_error,
    )

    def read(refresh=False):
        if read_fails:
            raise ConnectionError("Network error")
        return live

    service.get_full_config = read
    return service


def _banner(live):
    baseline = config_state.reconcile_baseline(IID, live)
    assert baseline is not None
    added, removed, modified = deep_diff(live, baseline)
    return added, removed, modified


def _partly_live():
    live = {
        "interfaces": {"dummy": {"dum0": {"address": ["10.0.0.1/32"]}, "dum1": {"description": "partial"}}},
        "system": {"host-name": "lab"},
    }
    return live


def test_landed_part_stays_in_the_banner_and_the_error_says_so(monkeypatch):
    emitted = []
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: emitted.append(args[:2]))
    live = _partly_live()

    response = _service(live).execute_batch(BATCH)

    assert response.status == 400
    assert response.error.startswith(PARTIAL_COMMIT_NOTICE)
    assert "dhcp-server" in response.error
    added, _, _ = _banner(live)
    assert "interfaces.dummy.dum1" in added
    assert emitted == [(IID, "config_diff")]


def test_a_set_time_rejection_changes_nothing_and_adds_no_notice(monkeypatch):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: pytest.fail("nothing changed"))
    error = "Error: 300.1.1.1/32 is not a valid IP host\nSet failed\n"

    response = _service(BEFORE, commit_error=error).execute_batch(BATCH)

    assert response.error == error


def test_an_external_edit_elsewhere_is_still_external(monkeypatch):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)
    live = _partly_live()
    live["system"]["host-name"] = "renamed-from-cli"

    _service(live).execute_batch(BATCH)

    added, removed, modified = _banner(live)
    assert "interfaces.dummy.dum1" in added
    assert "system.host-name" not in modified


def test_unreadable_router_after_a_rejection_warns_and_keeps_the_baseline(monkeypatch):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)

    response = _service(None, read_fails=True).execute_batch(BATCH)

    assert response.error.startswith(UNREAD_COMMIT_NOTICE)
    assert config_state.get_managed_config(IID) is None
    # With no managed snapshot, reconciliation leaves the baseline alone.
    assert config_state.reconcile_baseline(IID, _partly_live()) == BEFORE


def _raising_device(service, exc):
    def configure(op_path=None):
        raise exc
    service.device.configure_multiple_op = configure  # type: ignore[method-assign]


@pytest.mark.parametrize(
    ("exc", "status"),
    [
        ("timeout", 504),
        ("dropped", 502),
    ],
)
def test_a_lost_reply_is_an_unknown_outcome_not_a_compare(monkeypatch, exc, status):
    """pyvyos raises on a timeout; the commit may still be running, so the re-read proves nothing."""
    import requests

    errors = {
        "timeout": requests.exceptions.Timeout("Request timed out after 10 seconds"),
        "dropped": requests.exceptions.ConnectionError("Network error: ('Connection aborted.', RemoteDisconnected())"),
    }
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)
    service = VyOSService(VyOSDeviceConfig(hostname="lab", apikey="k", version="1.5", instance_id=IID))
    service.get_full_config = lambda refresh=False: pytest.fail("a re-read during a running commit proves nothing")
    _raising_device(service, errors[exc])

    response = service.execute_batch(BATCH)

    assert response.status == status
    assert response.error.startswith(UNANSWERED_COMMIT_NOTICE)
    assert "lab" not in response.error.split("\n", 1)[1]
    # No managed snapshot: whatever lands later stays in the banner.
    assert config_state.get_managed_config(IID) is None
    assert config_state.reconcile_baseline(IID, _partly_live()) == BEFORE


def _not_sent_errors():
    """What pyvyos and _requests.post raise when nothing reached the router."""
    import socket
    import ssl

    import requests
    import urllib3
    from urllib3.connection import HTTPSConnection

    pool = urllib3.HTTPSConnectionPool("lab", 443)
    conn = HTTPSConnection("lab", 443)
    refused = urllib3.exceptions.NewConnectionError(conn, "Failed to establish a new connection: [Errno 111] Connection refused")
    unresolved = urllib3.exceptions.NameResolutionError("lab", conn, socket.gaierror(-5, "No address associated with hostname"))
    cert = urllib3.exceptions.SSLError(ssl.SSLCertVerificationError(1, "certificate verify failed: self-signed certificate"))
    return {
        "refused": requests.exceptions.ConnectionError(urllib3.exceptions.MaxRetryError(pool, "/configure", refused)),
        "unresolved": requests.exceptions.ConnectionError(urllib3.exceptions.MaxRetryError(pool, "/configure", unresolved)),
        "connect_timeout": requests.exceptions.ConnectTimeout("Connection to lab timed out. (connect timeout=10)"),
        "tls_cert": requests.exceptions.SSLError(urllib3.exceptions.MaxRetryError(pool, "/configure", cert)),
        "bad_url": requests.exceptions.InvalidURL("Failed to parse: https://lab:1:443/configure"),
    }


def _real_handshake_failure():
    """A real requests error from an https request to a plain-TCP port.

    The TLS handshake fails (WRONG_VERSION_NUMBER) before the request is
    sent; only the traceback says so, since the read-phase error has the
    same types.
    """
    import socket
    import threading

    import requests

    server = socket.socket()
    server.bind(("127.0.0.1", 0))
    server.listen()

    def answer():
        conn, _ = server.accept()
        conn.recv(4096)
        conn.sendall(b"HTTP/1.1 400 Bad Request\r\n\r\n")
        conn.close()

    threading.Thread(target=answer, daemon=True).start()
    try:
        requests.post(f"https://127.0.0.1:{server.getsockname()[1]}/configure", data={}, verify=False, timeout=5)
    except requests.exceptions.SSLError as exc:
        return exc
    finally:
        server.close()
    pytest.fail("the handshake should have failed")


def _tls_error_after_sending():
    """urllib3 raises SSLError for a TLS fault while reading the reply too."""
    import ssl

    import requests
    import urllib3

    pool = urllib3.HTTPSConnectionPool("lab", 443)
    record = urllib3.exceptions.SSLError(ssl.SSLError(1, "[SSL: DECRYPTION_FAILED_OR_BAD_RECORD_MAC] bad record mac"))
    return requests.exceptions.SSLError(urllib3.exceptions.MaxRetryError(pool, "/configure", record))


def _as_pyvyos_raises(exc):
    """pyvyos re-raises inside ``except``: Timeout stays Timeout, the rest become ConnectionError."""
    import requests

    try:
        raise exc
    except requests.exceptions.Timeout:
        try:
            raise requests.exceptions.Timeout("Request timed out after 10 seconds")
        except requests.exceptions.Timeout as wrapped:
            return wrapped
    except requests.exceptions.RequestException as original:
        try:
            raise requests.exceptions.ConnectionError(f"Network error: {original}")
        except requests.exceptions.ConnectionError as wrapped:
            return wrapped


def _never_sent(kind):
    return _real_handshake_failure() if kind == "tls_handshake" else _not_sent_errors()[kind]


@pytest.mark.parametrize("kind", ["refused", "unresolved", "connect_timeout", "tls_cert", "tls_handshake", "bad_url"])
def test_a_commit_that_was_never_sent_adds_no_notice(monkeypatch, kind):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: pytest.fail("nothing was sent"))
    service = VyOSService(VyOSDeviceConfig(hostname="lab", apikey="k", version="1.5", instance_id=IID))
    service.get_full_config = lambda refresh=False: pytest.fail("nothing was sent")
    _raising_device(service, _as_pyvyos_raises(_never_sent(kind)))
    config_state.set_managed_config(IID, BEFORE)

    response = service.execute_batch(BATCH)

    assert response.status == 503
    assert response.error == "Could not reach the VyOS API"
    assert config_state.get_managed_config(IID) == BEFORE


@pytest.mark.parametrize("kind", ["refused", "unresolved", "connect_timeout", "tls_cert", "tls_handshake", "bad_url"])
def test_a_commit_confirm_that_was_never_sent_arms_nothing(monkeypatch, kind):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: pytest.fail("nothing was sent"))
    error = _never_sent(kind)

    def post(url, data, verify, timeout):
        raise error

    monkeypatch.setattr("vyos_service._requests.post", post)
    service = VyOSService(VyOSDeviceConfig(hostname="lab", apikey="k", version="1.5", instance_id=IID,
                                           commit_confirm_enabled=True))
    service.get_full_config = lambda refresh=False: pytest.fail("nothing was sent")

    response = service.execute_batch(BATCH)

    assert response.status == 503
    assert commit_confirm_state.is_active(IID) is False


def test_a_tls_error_after_sending_is_an_unknown_outcome(monkeypatch):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)
    service = VyOSService(VyOSDeviceConfig(hostname="lab", apikey="k", version="1.5", instance_id=IID))
    service.get_full_config = lambda refresh=False: pytest.fail("a re-read during a running commit proves nothing")
    _raising_device(service, _as_pyvyos_raises(_tls_error_after_sending()))
    config_state.set_managed_config(IID, BEFORE)

    response = service.execute_batch(BATCH)

    assert response.status == 502
    assert response.error.startswith(UNANSWERED_COMMIT_NOTICE)
    assert config_state.get_managed_config(IID) is None


class _Reply:
    def __init__(self, status_code, body):
        self.status_code = status_code
        self._body = body

    def json(self):
        return self._body


def test_a_rejected_api_key_adds_no_notice(monkeypatch):
    """Lab: a wrong key gets HTTP 401 'Valid API key is required' and VyOS runs nothing."""
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: pytest.fail("nothing ran"))
    plain = _service(None, commit_status=401, commit_error="HTTP Error 401: Valid API key is required", read_fails=True)

    assert plain.execute_batch(BATCH).error == "HTTP Error 401: Valid API key is required"

    monkeypatch.setattr("vyos_service._requests.post", lambda url, data, verify, timeout: _Reply(
        401, {"success": False, "data": None, "error": "Valid API key is required"},
    ))
    confirm = _service(None, read_fails=True)
    confirm.config.commit_confirm_enabled = True
    response = confirm.execute_batch(BATCH)

    assert (response.status, response.error) == (401, "Valid API key is required")
    assert commit_confirm_state.is_active(IID) is False


def test_without_a_managed_snapshot_the_saved_baseline_decides(monkeypatch):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)
    config_state.clear_managed_config(IID)

    landed = _service(_partly_live()).execute_batch(BATCH)
    nothing = _service(BEFORE, commit_error="Set failed\n").execute_batch(BATCH)

    assert landed.error.startswith(PARTIAL_COMMIT_NOTICE)
    assert nothing.error == "Set failed\n"


@pytest.mark.parametrize(
    ("kind", "status"),
    [("read_timeout", 504), ("dropped", 502), ("tls_after_sending", 502)],
)
def test_commit_confirm_with_a_lost_reply_shows_the_timer(monkeypatch, kind, status):
    import requests

    errors = {
        "read_timeout": requests.exceptions.ReadTimeout("Read timed out. (read timeout=10)"),
        "dropped": requests.exceptions.ConnectionError("('Connection aborted.', RemoteDisconnected())"),
        "tls_after_sending": _tls_error_after_sending(),
    }
    emitted = []
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: emitted.append(args[1]))

    def post(url, data, verify, timeout):
        raise errors[kind]

    monkeypatch.setattr("vyos_service._requests.post", post)
    service = _service(None, read_fails=True)
    service.config.commit_confirm_enabled = True

    response = service.execute_batch(BATCH)

    assert response.status == status
    assert response.error.startswith(UNANSWERED_COMMIT_CONFIRM_NOTICE)
    assert commit_confirm_state.is_active(IID) is True
    assert "commit_confirm" in emitted and "config_diff" in emitted


def test_commit_confirm_failure_records_the_landed_part(monkeypatch):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)
    live = _partly_live()
    service = _service(live)
    service.config.commit_confirm_enabled = True
    service._post_api = lambda endpoint, data: ApiResponse(
        status=400, request={}, result={}, error="[ service dhcp-server ]\nCommit failed",
    )

    response = service.execute_batch(BATCH)

    assert response.error.startswith(PARTIAL_COMMIT_NOTICE)
    added, _, _ = _banner(live)
    assert "interfaces.dummy.dum1" in added


def test_record_failed_commit_with_no_baseline_reports_nothing():
    config_state.clear_saved_config(IID)
    assert config_state.record_failed_commit(IID, _partly_live(), [["interfaces", "dummy", "dum1"]]) is False


def test_record_failed_commit_removes_a_node_the_batch_deleted():
    live = {"system": {"host-name": "lab"}, "interfaces": {"dummy": {}}}
    assert config_state.record_failed_commit(IID, live, [["interfaces", "dummy"]]) is True
    managed = cast(dict, config_state.get_managed_config(IID))
    assert managed["interfaces"]["dummy"] == {}
    gone = {"system": {"host-name": "lab"}}
    assert config_state.record_failed_commit(IID, gone, [["interfaces"]]) is True
    assert "interfaces" not in cast(dict, config_state.get_managed_config(IID))


def test_commit_confirm_request_that_never_reached_the_router_adds_no_notice(monkeypatch):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: pytest.fail("nothing reached the router"))
    service = _service(None, read_fails=True)
    service.config.commit_confirm_enabled = True
    service._post_api = lambda endpoint, data: ApiResponse(
        status=503, request={}, result={}, error="Could not reach the VyOS API",
    )
    service.get_full_config = lambda refresh=False: pytest.fail("nothing was sent")

    assert service.execute_batch(BATCH).error == "Could not reach the VyOS API"
