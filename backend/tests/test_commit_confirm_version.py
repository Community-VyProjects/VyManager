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
    return service


def _batch(version: str) -> NATBatchBuilder:
    batch = NATBatchBuilder(version)
    batch.set_destination_rule(10)
    return batch


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


def test_execute_batch_with_confirm_refuses_1_4_instead_of_recursing(monkeypatch):
    service = _service("1.4")
    service.execute_batch = lambda batch: pytest.fail("must not call back into execute_batch")
    monkeypatch.setattr("vyos_service._requests.post", _no_confirm_post)

    with pytest.raises(ValueError, match="not supported"):
        service.execute_batch_with_confirm(_batch("1.4"), "inst-1451")
    assert commit_confirm_state.is_active("inst-1451") is False


@pytest.mark.parametrize("version", ["1.5", "2026.09.23-0027-rolling"])
def test_1_5_and_rolling_batch_arms_the_timer(monkeypatch, version):
    service = _service(version)
    service.device.configure_multiple_op = lambda op_path: pytest.fail("commit-confirm goes through /configure")
    posted = []

    class _Resp:
        def raise_for_status(self):
            return None

        def json(self):
            return {"success": True, "data": "Initialized commit-confirm", "error": None}

    def _post(url, data, verify, timeout):
        posted.append((url, data["data"]))
        return _Resp()

    monkeypatch.setattr("vyos_service._requests.post", _post)

    response = service.execute_batch(_batch(version))

    assert response.status == 200
    assert len(posted) == 1
    assert posted[0][0].endswith("/configure")
    assert '"confirm_time": 3' in posted[0][1]
    assert commit_confirm_state.is_active("inst-1451") is True


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

    async def fetchval(self, query, *args):
        return "ADMIN"

    async def fetchrow(self, query, *args):
        if "org_id" in query:
            return self.stored
        if query.lstrip().startswith("UPDATE"):
            self.updates.append((query, args))
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


def test_create_allows_commit_confirm_on_1_5(_session_stubs):
    conn = _Conn("1.5", False)
    response = _create(conn, vyos_version="1.5", commit_confirm_enabled=True)
    assert response.id == "inst-1"
