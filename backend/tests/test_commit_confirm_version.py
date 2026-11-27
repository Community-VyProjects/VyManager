"""Commit-confirm is only armed where the VyOS API supports it (#1451).

The 1.4 API ignores ``confirm_time`` (lab 1.4.3: the commit lands with no
timer) and has no ``confirm`` op. execute_batch used to hand a 1.4 batch to
execute_batch_with_confirm, which handed it back, until RecursionError.
"""

import asyncio
from types import SimpleNamespace
from typing import cast

import pytest
from fastapi import HTTPException, Request
from pyvyos.core.rest_client import ApiResponse

import commit_confirm_state
import config_state
from routers.session import session as session_router
from vyos_builders.nat import NATBatchBuilder
from vyos_service import VyOSDeviceConfig, VyOSService


@pytest.mark.parametrize(
    ("version", "supported"),
    [
        ("1.4", False),
        ("1.4.3", False),
        ("1.5", True),
        ("2026.09.23-0027-rolling", True),
        ("", True),
        (None, True),
    ],
)
def test_supports_commit_confirm_reads_only_1_4_as_1_4(version, supported):
    assert commit_confirm_state.supports_commit_confirm(version) is supported


def _service(version: str) -> VyOSService:
    service = VyOSService(VyOSDeviceConfig(
        hostname="lab",
        apikey="key",
        version=version,
        instance_id="inst-1451",
        commit_confirm_enabled=True,
        commit_confirm_minutes=3,
    ))
    service._record_managed_config = lambda instance_id: None
    # A failed commit re-reads the config; nothing changed on this stub router.
    service.get_full_config = lambda refresh=False: {}
    return service


def _batch(version: str) -> NATBatchBuilder:
    batch = NATBatchBuilder(version)
    batch.set_destination_rule(10)
    return batch


class _JsonResp:
    def __init__(self, status_code, body):
        self.status_code = status_code
        self._body = body

    def json(self):
        if self._body is None:
            raise ValueError("no JSON")
        return self._body


@pytest.fixture(autouse=True)
def _clear_confirm_state():
    commit_confirm_state.clear("inst-1451")
    yield
    commit_confirm_state.clear("inst-1451")


def _no_confirm_post(*args, **kwargs):
    raise AssertionError("a 1.4 batch must not be sent with confirm_time")


def test_1_4_batch_with_flag_on_commits_once_without_a_timer(monkeypatch):
    service = _service("1.4")
    sent = []
    service.device.configure_multiple_op = lambda op_path: sent.append(op_path) or ApiResponse(
        status=200, request={}, result={}, error=False,
    )
    monkeypatch.setattr("vyos_service._requests.post", _no_confirm_post)

    response = service.execute_batch(_batch("1.4"))

    assert response.status == 200
    assert len(sent) == 1
    assert commit_confirm_state.is_active("inst-1451") is False


def test_1_4_empty_batch_stays_a_value_error():
    with pytest.raises(ValueError, match="empty batch"):
        _service("1.4").execute_batch(NATBatchBuilder("1.4"))


def test_1_4_batch_with_flag_on_never_reaches_the_confirm_path(monkeypatch):
    service = _service("1.4")
    service.execute_batch_with_confirm = lambda batch, instance_id: pytest.fail("1.4 has no commit-confirm")
    service.device.configure_multiple_op = lambda op_path: ApiResponse(
        status=200, request={}, result={}, error=False,
    )

    assert service.execute_batch(_batch("1.4")).status == 200


@pytest.mark.parametrize("version", ["1.5", "2026.09.23-0027-rolling"])
def test_1_5_and_rolling_batch_arms_the_timer(monkeypatch, version):
    service = _service(version)
    service.device.configure_multiple_op = lambda op_path: pytest.fail("commit-confirm goes through /configure")
    posted = []

    def _post(url, data, verify, timeout):
        posted.append((url, data["data"]))
        return _JsonResp(200, {"success": True, "data": "Initialized commit-confirm", "error": None})

    monkeypatch.setattr("vyos_service._requests.post", _post)

    response = service.execute_batch(_batch(version))

    assert response.status == 200
    assert len(posted) == 1
    assert posted[0][0].endswith("/configure")
    assert '"confirm_time": 3' in posted[0][1]
    assert commit_confirm_state.is_active("inst-1451") is True


def test_rejected_commit_confirm_returns_the_vyos_error_not_a_transport_error(monkeypatch):
    service = _service("1.5")
    monkeypatch.setattr(
        "vyos_service._requests.post",
        lambda url, data, verify, timeout: _JsonResp(
            400, {"success": False, "error": "[[service dhcp-server]] failed\nCommit failed\n", "data": None},
        ),
    )

    config_state.set_saved_config("inst-1451", {})
    config_state.set_managed_config("inst-1451", {})
    try:
        response = service.execute_batch(_batch("1.5"))
        managed = config_state.get_managed_config("inst-1451")
    finally:
        config_state.clear_saved_config("inst-1451")

    assert response.status == 400
    assert response.error == "[[service dhcp-server]] failed\nCommit failed\n"
    assert managed == {}
    assert commit_confirm_state.is_active("inst-1451") is False


def test_unreachable_api_returns_a_fixed_message_without_the_url(monkeypatch):
    import requests
    import urllib3
    from urllib3.connection import HTTPSConnection

    def _refused(url, data, verify, timeout):
        pool = urllib3.HTTPSConnectionPool("lab", 443)
        reason = urllib3.exceptions.NewConnectionError(HTTPSConnection("lab", 443), "Failed to establish a new connection: [Errno 111] Connection refused")
        raise requests.exceptions.ConnectionError(urllib3.exceptions.MaxRetryError(pool, url, reason))

    monkeypatch.setattr("vyos_service._requests.post", _refused)

    response = _service("1.5").execute_batch(_batch("1.5"))

    assert response.status == 503
    assert response.error == "Could not reach the VyOS API"
    assert commit_confirm_state.is_active("inst-1451") is False


def test_dropped_connection_returns_a_fixed_message_without_the_url(monkeypatch):
    import requests

    def _dropped(url, data, verify, timeout):
        raise requests.exceptions.ConnectionError(f"('Connection aborted.', RemoteDisconnected()) {url}")

    monkeypatch.setattr("vyos_service._requests.post", _dropped)

    response = _service("1.5").execute_batch(_batch("1.5"))

    assert response.status == 502
    assert "lab" not in response.error and "Connection aborted" not in response.error


def test_non_json_reply_is_a_502_with_an_unknown_outcome(monkeypatch):
    """An unparsable reply says nothing about the commit, so the timer may be armed."""
    from vyos_service import UNANSWERED_COMMIT_CONFIRM_NOTICE

    monkeypatch.setattr("vyos_service._requests.post", lambda url, data, verify, timeout: _JsonResp(502, None))

    response = _service("1.5").execute_batch(_batch("1.5"))

    assert response.status == 502
    assert response.error.startswith(UNANSWERED_COMMIT_CONFIRM_NOTICE)
    assert commit_confirm_state.is_active("inst-1451") is True


def test_rejected_confirm_returns_the_vyos_error_and_keeps_the_timer(monkeypatch):
    commit_confirm_state.set_active("inst-1451", 3)
    monkeypatch.setattr(
        "vyos_service._requests.post",
        lambda url, data, verify, timeout: _JsonResp(
            400, {"success": False, "error": "'confirm' is not a valid operation", "data": None},
        ),
    )

    response = _service("1.5").confirm_commit("inst-1451")

    assert response.status == 400
    assert response.error == "'confirm' is not a valid operation"
    assert commit_confirm_state.is_active("inst-1451") is True


def test_confirm_clears_the_timer(monkeypatch):
    commit_confirm_state.set_active("inst-1451", 3)
    monkeypatch.setattr(
        "vyos_service._requests.post",
        lambda url, data, verify, timeout: _JsonResp(200, {"success": True, "data": "Reload timer stopped\n"}),
    )

    response = _service("1.5").confirm_commit("inst-1451")

    assert response.status == 200
    assert commit_confirm_state.is_active("inst-1451") is False


# ---------------------------------------------------------------------------
# Instance create / update refuse commit-confirm on 1.4
# ---------------------------------------------------------------------------


class _Conn:
    """Records the update query; returns the stored row for the lookups."""

    def __init__(self, stored_version: str, stored_enabled: bool):
        self.stored = {
            "host": "192.0.2.1",
            "sshPort": 22,
            "vyosVersion": stored_version,
            "commitConfirmEnabled": stored_enabled,
            "org_id": "org-1",
        }
        self.updates: list[tuple[str, tuple]] = []
        self.inserts: list[tuple[str, tuple]] = []

    async def fetchval(self, query, *args):
        return "ADMIN"

    async def fetchrow(self, query, *args):
        if "org_id" in query:
            return self.stored
        if query.lstrip().startswith("UPDATE"):
            self.updates.append((query, args))
        if query.lstrip().startswith("INSERT"):
            self.inserts.append((query, args))
        return {
            "id": "inst-1",
            "siteId": "site-1",
            "name": "edge",
            "description": None,
            "host": "192.0.2.1",
            "port": 443,
            "protocol": "https",
            "verifySsl": False,
            "vyosVersion": self.stored["vyosVersion"],
            "isActive": True,
            "sshPort": 22,
            "sshUsername": None,
            "sshKeyConfigured": False,
            "commitConfirmEnabled": False,
            "commitConfirmMinutes": 5,
            "timeout": 10,
            "createdAt": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-01T00:00:00Z",
        }


@pytest.fixture
def _session_stubs(monkeypatch):
    async def _same_org(request, conn, org_id):
        return None

    monkeypatch.setattr(session_router, "assert_row_in_acting_org", _same_org)
    monkeypatch.setattr(session_router, "clear_session_cache", lambda instance_id: None)

    async def _no_pin_change(*args, **kwargs):
        return None

    monkeypatch.setattr(session_router, "forget_replaced_router_pin", _no_pin_change)


def _request() -> Request:
    return cast(Request, SimpleNamespace(state=SimpleNamespace(user={"id": "user-1"})))


def _update(conn, **fields):
    body = session_router.InstanceUpdateRequest(**fields)
    return asyncio.run(session_router.update_instance(_request(), "inst-1", body, conn))


def _sets_commit_confirm(conn) -> object:
    for query, args in conn.updates:
        set_clause = query.split("SET", 1)[1].split("WHERE", 1)[0]
        for clause in set_clause.split(","):
            if '"commitConfirmEnabled"' in clause:
                index = int(clause.split("$", 1)[1].split()[0])
                return args[index - 1]
    return "not set"


def test_update_refuses_turning_commit_confirm_on_for_1_4(_session_stubs):
    conn = _Conn("1.4", False)
    with pytest.raises(HTTPException) as exc:
        _update(conn, commit_confirm_enabled=True)
    assert exc.value.status_code == 400
    assert conn.updates == []


def test_update_refuses_moving_to_1_4_with_commit_confirm_on(_session_stubs):
    conn = _Conn("1.5", False)
    with pytest.raises(HTTPException) as exc:
        _update(conn, vyos_version="1.4", commit_confirm_enabled=True)
    assert exc.value.status_code == 400
    assert conn.updates == []


def test_update_turns_commit_confirm_off_when_the_version_moves_to_1_4(_session_stubs):
    conn = _Conn("1.5", True)
    _update(conn, vyos_version="1.4")
    assert _sets_commit_confirm(conn) is False


def test_update_clears_a_stored_1_4_row_that_still_has_commit_confirm(_session_stubs):
    conn = _Conn("1.4", True)
    _update(conn, name="edge-renamed")
    assert _sets_commit_confirm(conn) is False


def test_update_leaves_commit_confirm_alone_on_1_5(_session_stubs):
    conn = _Conn("1.5", True)
    _update(conn, name="edge-renamed")
    assert _sets_commit_confirm(conn) == "not set"


def test_update_allows_commit_confirm_on_1_5(_session_stubs):
    conn = _Conn("1.5", False)
    _update(conn, commit_confirm_enabled=True)
    assert _sets_commit_confirm(conn) is True


def _create(conn, **fields):
    body = session_router.InstanceCreateRequest(
        site_id="site-1", name="edge", host="192.0.2.1", api_key="k", **fields,
    )
    return asyncio.run(session_router.create_instance(_request(), body, conn))


def test_create_refuses_commit_confirm_on_1_4(_session_stubs):
    conn = _Conn("1.4", False)
    with pytest.raises(HTTPException) as exc:
        _create(conn, vyos_version="1.4", commit_confirm_enabled=True)
    assert exc.value.status_code == 400
    assert conn.inserts == []


def test_create_allows_commit_confirm_on_1_5(_session_stubs):
    conn = _Conn("1.5", False)
    response = _create(conn, vyos_version="1.5", commit_confirm_enabled=True)
    assert response.id == "inst-1"
    assert len(conn.inserts) == 1


# ---------------------------------------------------------------------------
# Connect test keeps transport internals out of the reply (#1587)
# ---------------------------------------------------------------------------


def _connect_with(monkeypatch, failure: Exception):
    from contextlib import asynccontextmanager

    class _ConnectConn:
        async def fetchval(self, query, *args):
            return "ADMIN"

        async def fetchrow(self, query, *args):
            return {
                "id": "inst-1", "name": "edge", "host": "10.9.9.9", "port": 443, "siteId": "site-1",
                "isActive": True, "apiKey": "k", "protocol": "https", "verifySsl": False,
                "vyosVersion": "1.5", "timeout": 10, "site_name": "HQ", "role": "ADMIN",
            }

    @asynccontextmanager
    async def _unit_of_work(request):
        yield _ConnectConn()

    class _FailingService:
        def __init__(self, config):
            pass

        def get_full_config(self):
            raise failure

    monkeypatch.setattr(session_router, "org_unit_of_work", _unit_of_work)
    monkeypatch.setattr(session_router, "VyOSService", _FailingService)
    body = session_router.ConnectRequest(instance_id="inst-1")
    with pytest.raises(HTTPException) as exc:
        asyncio.run(session_router.connect_to_instance(_request(), body))
    return exc.value


def test_connect_transport_failure_hides_the_device_url(monkeypatch):
    err = _connect_with(monkeypatch, ConnectionError(
        "Network error: HTTPSConnectionPool(host='10.9.9.9', port=443): Max retries exceeded with url: /retrieve",
    ))
    assert err.status_code == 503
    assert "10.9.9.9" not in err.detail
    assert "HTTPSConnectionPool" not in err.detail
    assert err.detail.startswith("Failed to connect to VyOS instance")


def test_connect_keeps_the_vyos_reply_text(monkeypatch):
    err = _connect_with(monkeypatch, ValueError("Failed to retrieve full config: HTTP Error 403: Valid API key is required"))
    assert err.status_code == 503
    assert "Valid API key is required" in err.detail


def test_commit_confirm_url_brackets_an_ipv6_host(monkeypatch):
    """pyvyos brackets an IPv6 host on the plain path; _post_api must too."""
    urls = []

    def post(url, data, verify, timeout):
        urls.append(url)
        return _JsonResp(200, {"success": True, "data": "", "error": None})

    monkeypatch.setattr("vyos_service._requests.post", post)
    service = VyOSService(VyOSDeviceConfig(
        hostname="fd00::1", apikey="key", version="1.5", instance_id="inst-1451",
        commit_confirm_enabled=True, commit_confirm_minutes=3,
    ))
    service._record_managed_config = lambda instance_id: None

    assert service.execute_batch(_batch("1.5")).status == 200
    assert urls == ["https://[fd00::1]:443/configure"]
