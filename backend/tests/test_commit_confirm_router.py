"""Commit-confirm state and config snapshots belong to the router (#1701, #1702).

Lab (rolling): a commit during a pending commit-confirm is archived and makes
the pending change permanent; the router's commit-confirm action defaults to
``reboot`` (boots the saved config), and a boot-config save during the window
makes the pending change survive that revert. Before this change the
commit-confirm lock, the snapshots and the banner channel were per instance
row, so a second row on the same router (another site or organization) could
commit during the window; the state lived only in memory, so a backend
restart lost the countdown; and the banner always said "reload".
"""

import asyncio
import contextvars
import os
import threading
import time
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any, cast

import pytest
import requests
from fastapi import HTTPException
from pyvyos.core.rest_client import ApiResponse

import commit_confirm_state
import config_state
import device_keys
from events.event_manager import EVENT_COMMIT_CONFIRM, EventManager, event_manager
from routers.config.config import CommitConfirmStatusResponse, _discard_unsaved, _save_boot_config
from session_vyos_service import clear_session_cache, require_session_instance
from vyos_service import VyOSDeviceConfig, VyOSService

requires_db = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="commit-confirm persistence tests need DATABASE_URL",
)

ROW_A, ROW_B, ROW_OTHER = "row-a", "row-b", "row-other"
OPS = [{"op": "set", "path": ["interfaces", "dummy", "dum1", "description", "x"]}]
RELOAD = {"system": {"config-management": {"commit-confirm": {"action": "reload"}}}}


class _Batch:
    def is_empty(self):
        return False

    def get_operations(self):
        return OPS


class _Reply:
    def __init__(self, status_code, body):
        self.status_code = status_code
        self._body = body

    def json(self):
        return self._body


def _ok() -> ApiResponse:
    return ApiResponse(status=200, request={}, result={}, error="")


def _service(instance_id, host="router.lab", *, confirm=False, config=None, verified=True):
    """A service whose router config reads return ``config`` ({} by default)."""
    service = VyOSService(VyOSDeviceConfig(
        hostname=host, apikey="k", version="1.5", instance_id=instance_id,
        commit_confirm_enabled=confirm, commit_confirm_minutes=3,
    ))
    router = {"config": config if config is not None else {}}

    def read(refresh=False):
        service._cached_config = router["config"]
        service._router_answered(200, True)
        commit_confirm_state.note_router_config(instance_id, router["config"])
        return router["config"]

    service.get_full_config = read
    cast(Any, service).router = router
    if verified:
        device_keys.verified(instance_id)
    return service


def _active(instance_id) -> commit_confirm_state.CommitConfirmSession:
    session = commit_confirm_state.get_active(instance_id)
    assert session is not None
    return session


@pytest.fixture
def router(monkeypatch):
    """Every POST/configure to the fake router; it accepts them."""
    calls = []

    def post(url, data, verify, timeout):
        calls.append(url)
        return _Reply(200, {"success": True, "data": "", "error": None})

    monkeypatch.setattr("vyos_service._requests.post", post)
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)
    return calls


def _request(instance_id, host, org_id, user=None) -> Any:
    return SimpleNamespace(state=SimpleNamespace(
        instance={"id": instance_id, "host": host, "port": 443, "api_key": "k"},
        org={"id": org_id, "name": org_id},
        user=user,
    ))


def _in_request(request, work):
    """What a route does: resolve the instance, then run ``work`` on a worker
    with the request's context (as run_in_threadpool copies it)."""
    result = {}

    def handler():
        require_session_instance(request)
        ctx = contextvars.copy_context()
        thread = threading.Thread(target=lambda: ctx.run(lambda: result.update(value=work())))
        thread.start()
        thread.join(5)

    contextvars.copy_context().run(handler)
    return result.get("value")


def _alice_arms(org="org-1", config=None):
    return _in_request(
        _request(ROW_A, "router.lab", org, {"id": "u1", "name": "Alice"}),
        lambda: _service(ROW_A, confirm=True, config=config).execute_batch(_Batch()).status,
    )


# ---------------------------------------------------------------------------
# The router key and who shares it
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(("host", "port", "key"), [
    ("Router.Lab", 443, "router.lab:443"),
    ("router.lab.", None, "router.lab:443"),
    ("10.0.0.1", "8443", "10.0.0.1:8443"),
    ("[FD00:0:0::1]", 443, "[fd00::1]:443"),
    ("fd00::1", 443, "[fd00::1]:443"),
])
def test_the_router_key_is_a_normalized_host_and_port(host, port, key):
    assert device_keys.device_key(host, port) == key


def test_a_row_shares_its_router_only_after_the_router_answered_its_credentials():
    device_keys.note(ROW_A, "router.lab", 443)
    assert device_keys.key_for(ROW_A) == ROW_A
    assert device_keys.candidate_key(ROW_A) == "router.lab:443"

    device_keys.verified(ROW_A)

    assert device_keys.key_for(ROW_A) == "router.lab:443"


def test_a_rejected_api_key_does_not_verify_the_row(monkeypatch):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)
    service = VyOSService(VyOSDeviceConfig(hostname="router.lab", apikey="wrong", version="1.5", instance_id=ROW_B))
    cast(Any, service.device).configure_multiple_op = lambda op_path=None: ApiResponse(
        status=401, request={}, result={}, error="HTTP Error 401: Valid API key is required",
    )
    service.get_full_config = lambda refresh=False: pytest.fail("a 401 needs no re-read")

    assert service.execute_batch(_Batch()).status == 401
    assert device_keys.key_for(ROW_B) == ROW_B


def test_a_changed_host_leaves_the_old_routers_state_until_verified_again():
    device_keys.note(ROW_A, "router.lab", 443)
    device_keys.verified(ROW_A)

    device_keys.note(ROW_A, "other.lab", 443)

    assert device_keys.key_for(ROW_A) == ROW_A
    assert device_keys.candidate_key(ROW_A) == "other.lab:443"


def test_updating_or_deleting_an_instance_forgets_its_row():
    device_keys.note(ROW_A, "router.lab", 443, "org-2")
    device_keys.verified(ROW_A)

    clear_session_cache(ROW_A)

    assert device_keys.key_for(ROW_A) == ROW_A
    assert device_keys.orgs_on("router.lab:443") == set()


def test_a_revoked_key_takes_the_row_out_of_the_routers_state(monkeypatch):
    """The key worked once; the router now refuses it (revoked or changed there)."""
    service = VyOSService(VyOSDeviceConfig(hostname="router.lab", apikey="k", version="1.5", instance_id=ROW_A))
    answers = iter([
        ApiResponse(status=200, request={}, result=cast(Any, "{}"), error=""),
        ApiResponse(status=401, request={}, result={}, error="HTTP Error 401: Valid API key is required"),
    ])
    cast(Any, service.device).show = lambda path=None: next(answers)
    service.get_full_config(refresh=True)
    assert device_keys.key_for(ROW_A) == "router.lab:443"

    with pytest.raises(ValueError):
        service.get_full_config(refresh=True)

    assert device_keys.key_for(ROW_A) == ROW_A
    assert service._cached_config is None


@pytest.mark.parametrize("reply", [
    ApiResponse(status=502, request={}, result={}, error="HTTP Error 502: <html>Bad Gateway</html>"),
    ApiResponse(status=504, request={}, result={}, error="HTTP Error 504: Gateway Time-out"),
    ApiResponse(status=200, request={}, result={}, error="Invalid response format: Expecting value"),
    ApiResponse(status=500, request={}, result={}, error="Unexpected error: boom"),
], ids=["proxy-502", "proxy-504", "html-200", "pyvyos-500"])
@pytest.mark.parametrize("already_verified", [False, True])
def test_a_reply_that_is_not_vyos_neither_verifies_nor_unverifies(reply, already_verified):
    """A proxy in front of the router answers without checking the key."""
    row = ROW_A if already_verified else ROW_OTHER
    service = VyOSService(VyOSDeviceConfig(hostname="router.lab", apikey="k", version="1.5", instance_id=row))
    if already_verified:
        device_keys.verified(row)
    cast(Any, service.device).show = lambda path=None: reply
    cast(Any, service.device).configure_multiple_op = lambda op_path=None: reply
    cast(Any, service.device).config_file_save = lambda file=None: reply

    with pytest.raises(ValueError):
        service.get_full_config(refresh=True)
    service.commit_operations([{"op": "set", "path": ["system", "host-name", "x"]}])
    service.config_file_save()

    assert device_keys.key_for(row) == ("router.lab:443" if already_verified else row)


@pytest.mark.parametrize("already_verified", [False, True])
def test_a_post_reply_without_the_vyos_body_neither_verifies_nor_unverifies(monkeypatch, already_verified):
    row = ROW_A if already_verified else ROW_OTHER
    service = _service(row, verified=already_verified)

    class _ProxyJson:
        status_code = 502

        def json(self):
            return {"message": "bad gateway"}  # JSON, but not VyOS's reply

    monkeypatch.setattr("vyos_service._requests.post", lambda *args, **kwargs: _ProxyJson())
    assert service._post_api("configure", {"commands": []}).status == 502

    assert device_keys.key_for(row) == ("router.lab:443" if already_verified else row)


@pytest.mark.parametrize("status", [401, 403])
@pytest.mark.parametrize("body", [{"message": "Forbidden"}, None], ids=["proxy-json", "html"])
def test_a_refused_arm_records_no_session_whatever_the_body(monkeypatch, status, body):
    """Refused before anything ran: never an armed timer."""
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)

    class _Refused:
        status_code = status

        def json(self):
            if body is None:
                raise ValueError("not JSON")
            return body

    monkeypatch.setattr("vyos_service._requests.post", lambda *args, **kwargs: _Refused())
    service = _service(ROW_A, confirm=True)
    _service(ROW_B)
    monkeypatch.setattr(service, "_before_arming", lambda *_args: (commit_confirm_state.DEFAULT_ACTION, True, None))

    assert service.execute_batch(_Batch()).status == status
    assert commit_confirm_state.blocking(ROW_B) is None


def _pyvyos_reply(status_code, body: bytes) -> ApiResponse:
    """What pyvyos itself makes of this HTTP reply (its real parser)."""
    from pyvyos.core.rest_client import RestClient

    resp = requests.Response()
    resp.status_code = status_code
    resp._content = body
    resp.url = "https://router.lab/configure"
    status, result, error = RestClient._validate_response(resp)
    return ApiResponse(status=cast(int, status), request={}, result=result, error=cast(Any, error))


@pytest.mark.parametrize("status_code, body, expected, verifies", [
    (200, b'{"success": false, "data": null, "error": "Configuration path is not valid"}', 400, True),
    (400, b'{"success": false, "data": null, "error": "Configuration path is not valid"}', 400, False),
    (200, b"<html>proxy</html>", 502, False),
    (200, b'{"message": "ok"}', 502, False),
    (200, b"[]", 502, False),
    (200, b"null", 502, False),
    (502, b"<html>Bad Gateway</html>", 502, False),
], ids=["vyos-200-error", "vyos-400", "html-200", "proxy-json-200", "json-list-200", "json-null-200", "proxy-502"])
def test_pyvyos_replies_are_classified_by_who_sent_them(status_code, body, expected, verifies):
    """Run through pyvyos's own parser, so a marker cannot drift from it."""
    reply = _pyvyos_reply(status_code, body)
    service = VyOSService(VyOSDeviceConfig(hostname="router.lab", apikey="k", version="1.5", instance_id=ROW_OTHER))
    cast(Any, service.device).configure_multiple_op = lambda **kwargs: _pyvyos_reply(status_code, body)
    cast(Any, service.device).config_file_save = lambda **kwargs: _pyvyos_reply(status_code, body)

    assert service.commit_operations([{"op": "set", "path": ["x"]}]).status == expected
    assert service.config_file_save().status == expected
    assert (device_keys.key_for(ROW_OTHER) == "router.lab:443") is verifies
    if body in (b"[]", b"null"):
        # pyvyos's "Unexpected error" path, at status 500 rather than 200.
        assert reply.status == 500 and str(reply.error).startswith("Unexpected error")


def test_a_vyos_rejection_still_verifies_the_row():
    service = VyOSService(VyOSDeviceConfig(hostname="router.lab", apikey="k", version="1.5", instance_id=ROW_OTHER))
    cast(Any, service.device).configure_multiple_op = lambda op_path=None: ApiResponse(
        status=200, request={}, result={}, error="API Error 200: Configuration path is not valid")

    assert service.commit_operations([{"op": "set", "path": ["bad"]}]).status == 400
    assert device_keys.key_for(ROW_OTHER) == "router.lab:443"


def test_an_empty_file_name_saves_the_boot_config_and_is_blocked(router):
    """pyvyos drops a falsy file and saves /config/config.boot."""
    _alice_arms()
    saver = _service(ROW_B)
    cast(Any, saver.device).config_file_save = lambda **kwargs: pytest.fail("reached the router")

    with pytest.raises(HTTPException) as exc:
        saver.config_file_save(file="")
    assert exc.value.status_code == 409


def test_with_no_saved_baseline_the_arm_counts_unsaved_changes():
    service = _service(ROW_A, confirm=True, config={"system": {"host-name": "lab"}})

    assert service._before_arming(ROW_A)[1] is True


def test_the_shared_diff_treats_a_single_value_list_as_that_value():
    from routers.config.config import deep_diff

    assert deep_diff({"ntp": {"server": ["a"]}}, {"ntp": {"server": "a"}}) == ({}, {}, {})
    assert deep_diff({"ntp": {"server": ["a", "b"]}}, {"ntp": {"server": "a"}})[2] == {
        "ntp.server": {"old": "a", "new": ["a", "b"]},
    }


def test_deleting_a_site_forgets_its_instances(monkeypatch):
    import routers.session.session as session_router

    class _Tx:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

    class _Conn:
        async def fetchval(self, query, *args):
            return "ADMIN" if "FROM users" in query else "org-2"

        async def fetch(self, query, *args):
            return [{"id": ROW_A}]

        async def execute(self, query, *args):
            return "DELETE 1"

        def transaction(self):
            return _Tx()

    async def same_org(request, conn, org_id):
        return None

    monkeypatch.setattr(session_router, "assert_row_in_acting_org", same_org)
    device_keys.note(ROW_A, "router.lab", 443, "org-2")
    device_keys.verified(ROW_A)
    request = cast(Any, SimpleNamespace(state=SimpleNamespace(user={"id": "admin"})))

    asyncio.run(session_router.delete_site(request, "site-1", cast(Any, _Conn())))

    assert device_keys.key_for(ROW_A) == ROW_A
    assert device_keys.orgs_on("router.lab:443") == set()


def test_a_replace_restore_forgets_every_instance_it_wiped(monkeypatch):
    """Rows the backup does not bring back are gone too."""
    import routers.session.session as session_router

    class _Tx:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

    class _Conn:
        async def fetch(self, query, *args):
            return [{"id": ROW_A}, {"id": ROW_B}] if 'FROM "instances"' in query else []

        async def execute(self, query, *args):
            return "DELETE 2"

        async def fetchval(self, query, *args):
            return True

        def transaction(self):
            return _Tx()

    async def allowed(conn, request):
        return None

    async def no_columns(conn, table):
        return {}

    async def contents():
        return b""

    payload = {"tables": {"users": [{"role": "ADMIN"}], "instances": []}}
    monkeypatch.setattr(session_router, "_require_backup_admin", allowed)
    monkeypatch.setattr(session_router, "decrypt_backup", lambda data, passphrase: payload)
    monkeypatch.setattr(session_router, "_decode_and_validate", lambda data: None)
    monkeypatch.setattr(session_router, "_table_columns", no_columns)
    for row in (ROW_A, ROW_B):
        device_keys.note(row, "router.lab", 443, "org-2")
        device_keys.verified(row)

    asyncio.run(session_router.restore_backup(
        cast(Any, SimpleNamespace(state=SimpleNamespace())),
        file=cast(Any, SimpleNamespace(read=contents)),
        passphrase="p", mode="replace", confirm="replace", conn=cast(Any, _Conn()),
    ))

    assert device_keys.key_for(ROW_A) == ROW_A and device_keys.key_for(ROW_B) == ROW_B
    assert device_keys.orgs_on("router.lab:443") == set()


def test_require_session_instance_notes_the_router_and_the_org():
    require_session_instance(_request(ROW_A, "Router.Lab", "org-1"))

    assert device_keys.candidate_key(ROW_A) == "router.lab:443"
    assert device_keys.key_for(ROW_A) == ROW_A  # not verified by a request alone


# ---------------------------------------------------------------------------
# One commit-confirm, one block, per router
# ---------------------------------------------------------------------------


def test_a_second_row_on_the_router_cannot_commit_during_the_window(router):
    assert _alice_arms() == 200
    assert len(router) == 1
    b = _service(ROW_B, host="ROUTER.lab")  # same router, plain commits
    cast(Any, b.device).configure_multiple_op = lambda op_path=None: pytest.fail("nothing may reach the router")
    cast(Any, b.device).config_file_save = lambda file=None: pytest.fail("nothing may reach the router")
    cast(Any, b.device).config_file_load = lambda file=None: pytest.fail("nothing may reach the router")

    for attempt in (
        lambda: b.execute_batch(_Batch()),
        lambda: b.commit_operations(OPS),  # discard
        lambda: b.config_file_save(),  # save to the boot config
        lambda: b.config_file_save(file="/config/config.boot"),
        lambda: b.load_config_file("/config/archive/x"),  # archive restore
    ):
        with pytest.raises(HTTPException) as caught:
            attempt()
        assert caught.value.status_code == 409
        assert caught.value.detail.startswith("A commit-confirm started by Alice is pending on this router.")
        assert "Confirm it or wait 1" in caught.value.detail


def test_an_unverified_row_is_blocked_but_learns_nothing_more(router):
    _alice_arms()
    stranger = _service(ROW_OTHER, verified=False)  # names the router, never answered by it
    cast(Any, stranger.device).configure_multiple_op = lambda op_path=None: pytest.fail("nothing may reach the router")

    with pytest.raises(HTTPException) as caught:
        stranger.execute_batch(_Batch())

    assert caught.value.status_code == 409
    assert "Alice" not in caught.value.detail
    assert commit_confirm_state.status(ROW_OTHER)["active"] is False


def test_a_save_to_another_file_is_not_blocked(router):
    _alice_arms()
    a = _service(ROW_A)
    saved = []
    cast(Any, a.device).config_file_save = lambda file=None: saved.append(file) or _ok()

    assert a.config_file_save(file="/config/backup.boot").status == 200
    assert saved == ["/config/backup.boot"]


def test_another_router_is_not_blocked(router):
    _alice_arms()
    other = _service(ROW_OTHER, host="other.lab")
    cast(Any, other.device).configure_multiple_op = lambda op_path=None: _ok()

    assert other.execute_batch(_Batch()).status == 200


def test_a_second_commit_confirm_from_another_row_gets_a_409_and_sends_nothing(router):
    _alice_arms()

    with pytest.raises(HTTPException) as caught:
        _service(ROW_B, confirm=True).execute_batch(_Batch())

    assert caught.value.status_code == 409
    assert len(router) == 1


def test_any_sharing_row_can_confirm_and_confirming_twice_is_a_409(router):
    _alice_arms()
    b = _service(ROW_B)

    assert b.confirm_commit(ROW_B).status == 200
    assert commit_confirm_state.blocking(ROW_A) is None
    with pytest.raises(HTTPException) as caught:
        b.confirm_commit(ROW_B)
    assert caught.value.detail == "No commit-confirm is pending on this router."


def test_two_rows_committing_at_once_arm_exactly_one_timer(monkeypatch):
    """The check and the commit are one step under the router's write lock."""
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)
    posts = []
    inside = threading.Event()

    def slow_post(url, data, verify, timeout):
        posts.append(url)
        inside.set()
        time.sleep(0.3)  # the router takes a while to commit
        return _Reply(200, {"success": True, "data": "", "error": None})

    monkeypatch.setattr("vyos_service._requests.post", slow_post)
    services = [_service(ROW_A, confirm=True), _service(ROW_B, confirm=True)]
    results = []

    def save(service):
        try:
            results.append(service.execute_batch(_Batch()).status)
        except HTTPException as exc:
            results.append(exc.status_code)

    threads = [threading.Thread(target=save, args=(s,)) for s in services]
    threads[0].start()
    inside.wait(2)
    threads[1].start()
    for thread in threads:
        thread.join(5)

    assert sorted(results) == [200, 409]
    assert len(posts) == 1


def test_save_and_its_reseed_are_one_step_on_the_router(router):
    """Another row's commit cannot land between a save and its baseline re-read."""
    a, b = _service(ROW_A), _service(ROW_B)
    order = []
    cast(Any, a.device).config_file_save = lambda file=None: order.append("save") or _ok()
    reread = threading.Event()

    def slow_read(refresh=False):
        order.append("reread")
        reread.set()
        time.sleep(0.3)
        return {}

    a.get_full_config = slow_read
    cast(Any, b.device).configure_multiple_op = lambda op_path=None: order.append("commit") or _ok()

    saver = threading.Thread(target=_save_boot_config, args=(a, ROW_A))
    saver.start()
    reread.wait(2)
    b.commit_operations(OPS)
    saver.join(5)

    assert order == ["save", "reread", "commit"]


def test_discard_runs_under_the_routers_write_lock(router):
    a = _service(ROW_A, config={"system": {"host-name": "edited"}})
    config_state.set_saved_config(ROW_A, {"system": {"host-name": "lab"}})
    config_state.set_managed_config(ROW_A, {"system": {"host-name": "edited"}})
    held = []
    lock = device_keys.write_lock(ROW_A)

    def commit(op_path=None):
        held.append(cast(Any, lock)._is_owned())
        return _ok()

    cast(Any, a.device).configure_multiple_op = commit
    response = _discard_unsaved(a, ROW_A)

    assert response is not None and response.status == 200
    assert held == [True]


# ---------------------------------------------------------------------------
# The router's action, read fresh before arming, and the unsaved warning
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(("config", "action"), [
    ({}, "reboot"),
    (RELOAD, "reload"),
    ({"system": {"config-management": {}}}, "reboot"),
])
def test_the_session_carries_the_routers_action(router, config, action):
    _service(ROW_A, confirm=True, config=config).execute_batch(_Batch())

    assert _active(ROW_A).action == action


def test_the_action_is_read_fresh_not_from_a_stale_cache(router):
    service = _service(ROW_A, confirm=True, config={})  # the router: no action, so reboot
    service._cached_config = RELOAD  # an old read said reload

    service.execute_batch(_Batch())

    assert _active(ROW_A).action == "reboot"


def test_an_unreadable_router_assumes_reboot_and_unsaved_changes(router):
    service = _service(ROW_A, confirm=True)

    def unreadable(refresh=False):
        raise ConnectionError("down")

    service.get_full_config = unreadable
    service.execute_batch(_Batch())

    session = _active(ROW_A)
    assert (session.action, session.unsaved_before) == ("reboot", True)


def test_the_session_says_whether_unsaved_changes_were_already_live(router):
    clean = _service(ROW_A, confirm=True, config={"system": {"host-name": "lab"}})
    config_state.set_saved_config(ROW_A, {"system": {"host-name": "lab"}})
    clean.execute_batch(_Batch())
    assert _active(ROW_A).unsaved_before is False
    commit_confirm_state.clear(ROW_A)

    cast(Any, clean).router["config"] = {"system": {"host-name": "edited-not-saved"}}
    config_state.set_managed_config(ROW_A, {"system": {"host-name": "edited-not-saved"}})
    clean.execute_batch(_Batch())
    assert _active(ROW_A).unsaved_before is True


def test_with_nothing_pending_the_status_says_what_the_next_save_arms():
    service = _service(ROW_A, confirm=True, config=RELOAD)
    plain = _service(ROW_B)
    assert commit_confirm_state.status(ROW_A, service)["action"] is None  # no read yet

    service.get_full_config()

    assert commit_confirm_state.status(ROW_A, service) == {"active": False, "enabled": True, "action": "reload"}
    assert commit_confirm_state.status(ROW_B, plain) == {"active": False, "enabled": False, "action": None}
    # The action is the router's: a row whose cache was dropped still knows it.
    service._cached_config = None
    assert commit_confirm_state.status(ROW_A, service)["action"] == "reload"
    assert commit_confirm_state.status(ROW_B, plain, enabled=True)["action"] == "reload"
    assert commit_confirm_state.status(ROW_A, None) == {"active": False, "enabled": False, "action": None}


def test_a_read_returns_its_own_result_when_the_cache_is_dropped_meanwhile(monkeypatch):
    """The poller (or a refused key) drops the cache from another thread."""
    service = VyOSService(VyOSDeviceConfig(hostname="router.lab", apikey="k", version="1.5", instance_id=ROW_A))
    original = commit_confirm_state.note_router_config

    def dropped_meanwhile(instance_id, config):
        service._cached_config = None
        original(instance_id, config)

    cast(Any, service.device).show = lambda path=None: ApiResponse(
        status=200, request={}, result=cast(Any, '{"system": {"host-name": "lab"}}'), error="")
    monkeypatch.setattr(commit_confirm_state, "note_router_config", dropped_meanwhile)

    assert service.get_full_config(refresh=True) == {"system": {"host-name": "lab"}}


def test_a_cached_read_never_returns_none_when_the_cache_is_dropped_meanwhile():
    class _Flaky:
        """A cache dropped between the check and the return."""
        def __init__(self):
            self.reads = 0

        def __get__(self, obj, objtype=None):
            self.reads += 1
            return {"system": {}} if self.reads == 1 else None

    class _Service(VyOSService):
        _cached_config = _Flaky()  # type: ignore[assignment]

        def __init__(self):
            pass

    service = _Service()

    assert service.get_full_config() == {"system": {}}


def test_a_real_config_read_records_the_routers_action_for_every_row():
    service = VyOSService(VyOSDeviceConfig(hostname="router.lab", apikey="k", version="1.5", instance_id=ROW_A))
    cast(Any, service.device).show = lambda path=None: ApiResponse(
        status=200, request={}, result=cast(Any, '{"system": {"config-management": {"commit-confirm": {"action": "reload"}}}}'),
        error="",
    )
    other = _service(ROW_B)

    service.get_full_config(refresh=True)

    assert commit_confirm_state.known_action(ROW_A) == "reload"
    assert commit_confirm_state.status(ROW_B, other, enabled=True)["action"] == "reload"


def test_an_unverified_row_learns_no_action():
    _service(ROW_A, config=RELOAD).get_full_config()
    stranger = _service(ROW_OTHER, verified=False)

    assert commit_confirm_state.status(ROW_OTHER, stranger, enabled=True)["action"] is None


def test_a_lost_reply_from_an_unverified_row_blocks_the_whole_router(monkeypatch):
    """No read has verified the row yet (it failed, or the backend restarted)."""
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)

    def lost(url, data, verify, timeout):
        raise requests.exceptions.ReadTimeout("Read timed out.")

    monkeypatch.setattr("vyos_service._requests.post", lost)
    unverified = _service(ROW_A, confirm=True, verified=False)
    monkeypatch.setattr(unverified, "_before_arming", lambda *_args: (commit_confirm_state.DEFAULT_ACTION, True, None))
    other = _service(ROW_B)

    assert unverified.execute_batch(_Batch()).status == 504

    assert commit_confirm_state.blocking(ROW_B) is not None
    with pytest.raises(HTTPException) as exc:
        other.execute_batch(_Batch())
    assert exc.value.status_code == 409
    # Once a read verifies the row, its own countdown is still there.
    device_keys.verified(ROW_A)
    assert _active(ROW_A) is not None


def test_a_lost_reply_from_an_unverified_row_names_no_starter_row():
    """After a restart the starter is registered on the router from this."""
    _service(ROW_OTHER, verified=False)
    session = commit_confirm_state.set_active(ROW_OTHER, 2)

    assert session.device_key == "router.lab:443"
    assert session.instance_id is None
    assert commit_confirm_state.set_active(ROW_A, 2).instance_id == ROW_A


def test_after_a_restart_an_unverified_starter_stays_unverified(monkeypatch):
    now = datetime.now(timezone.utc)
    row = {
        "deviceKey": "router.lab:443", "instanceId": None,
        "startedAt": (now - timedelta(seconds=10)).replace(tzinfo=None),
        "expiresAt": (now + timedelta(minutes=2)).replace(tzinfo=None),
        "confirmMinutes": 2, "action": "reboot", "startedById": "u-c", "startedByName": "Carol",
        "startedByOrgId": "org-2", "unsavedBefore": True,
    }

    class _Conn:
        async def execute(self, *args):
            return None

        async def fetch(self, *args):
            return [row]

    class _Acquire:
        async def __aenter__(self):
            return _Conn()

        async def __aexit__(self, *exc):
            return False

    pool = SimpleNamespace(acquire=lambda: _Acquire())
    with device_keys._lock:
        device_keys._key_by_instance.clear()
        device_keys._candidate_by_instance.clear()
    with commit_confirm_state._lock:
        commit_confirm_state._sessions.clear()

    async def load():
        try:
            return await commit_confirm_state.load_and_attach(pool)
        finally:
            commit_confirm_state._store.detach()

    assert asyncio.run(load()) == 1
    stranger = _service(ROW_OTHER, verified=False)

    assert device_keys.key_for(ROW_OTHER) == ROW_OTHER
    assert commit_confirm_state.status(ROW_OTHER, stranger, enabled=True)["active"] is False
    assert commit_confirm_state.blocking(ROW_OTHER) is not None


@pytest.mark.parametrize("status", [401, 403])
def test_a_refused_pre_arm_read_sends_no_commit(monkeypatch, status):
    service = VyOSService(VyOSDeviceConfig(
        hostname="router.lab", apikey="bad", version="1.5", instance_id=ROW_OTHER,
        commit_confirm_enabled=True, commit_confirm_minutes=2,
    ))
    cast(Any, service.device).show = lambda path=None: ApiResponse(
        status=status, request={}, result={}, error=f"HTTP Error {status}: Valid API key is required")
    posts = []
    monkeypatch.setattr(service, "_post_api", lambda endpoint, data: posts.append(data))

    response = service.execute_batch(_Batch())

    assert posts == []
    assert response.status == status and response.error == f"HTTP Error {status}: Valid API key is required"
    assert commit_confirm_state.blocking(ROW_OTHER) is None


def test_a_lost_reply_arm_signals_every_row_on_the_router(monkeypatch):
    delivered = []
    monkeypatch.setattr(event_manager, "_deliver", lambda rows, kind, data: delivered.append((set(rows), kind)))

    def lost(url, data, verify, timeout):
        raise requests.exceptions.ReadTimeout("Read timed out.")

    monkeypatch.setattr("vyos_service._requests.post", lost)
    unverified = _service(ROW_OTHER, confirm=True, verified=False)
    _service(ROW_A)
    monkeypatch.setattr(unverified, "_before_arming", lambda *_args: (commit_confirm_state.DEFAULT_ACTION, True, None))

    assert unverified.execute_batch(_Batch()).status == 504

    rows = next(rows for rows, kind in delivered if kind == EVENT_COMMIT_CONFIRM)
    assert {ROW_OTHER, ROW_A} <= rows


def test_an_unverified_row_can_confirm_the_timer_its_lost_reply_armed(monkeypatch):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)
    service = _service(ROW_A, confirm=True, verified=False)
    commit_confirm_state.set_active(ROW_A, 2)
    posts = []

    def confirmed(endpoint, data):
        posts.append(data)
        service._router_answered(200, True)
        return ApiResponse(status=200, request={}, result=cast(Any, "Reboot timer stopped\n"), error="")

    monkeypatch.setattr(service, "_post_api", confirmed)

    assert service.confirm_commit(ROW_A).status == 200
    assert posts == [{"op": "confirm"}]
    assert commit_confirm_state.blocking(ROW_B) is None


def test_while_pending_enabled_is_still_the_rows_own_setting(router):
    _alice_arms()

    assert commit_confirm_state.status(ROW_A, enabled=True)["enabled"] is True
    assert commit_confirm_state.status(ROW_B, _service(ROW_B))["enabled"] is False


def test_the_status_route_keeps_every_field_the_stream_sends(router):
    _alice_arms()
    data = commit_confirm_state.status(ROW_A)

    assert CommitConfirmStatusResponse(**data).model_dump() == data


# ---------------------------------------------------------------------------
# Who started it, and what another organization may see
# ---------------------------------------------------------------------------


def test_the_starter_is_named_to_rows_of_the_same_organization(router):
    _alice_arms()
    require_session_instance(_request(ROW_B, "router.lab", "org-1"))
    _service(ROW_B)

    data = commit_confirm_state.status(ROW_B)
    assert (data["started_by_name"], data["started_by_known"]) == ("Alice", True)


def test_no_user_or_instance_id_reaches_any_row(router):
    _alice_arms()

    data = commit_confirm_state.status(ROW_A)

    assert "u1" not in str(data) and ROW_A not in str(data)
    assert not {"started_by_id", "instance_id"} & set(data)


def test_the_starter_is_anonymous_when_another_organization_shares_the_router(router):
    _alice_arms()
    require_session_instance(_request(ROW_B, "router.lab", "org-2"))
    b = _service(ROW_B)

    data = commit_confirm_state.status(ROW_B)
    assert (data["started_by_name"], data["started_by_known"]) == (None, True)
    with pytest.raises(HTTPException) as caught:
        b.execute_batch(_Batch())
    assert "Alice" not in caught.value.detail


def test_a_row_with_no_known_organization_does_not_hide_the_starter(router):
    """A service or a startup load notes a row before its org is known."""
    _alice_arms()
    _service(ROW_B)

    assert commit_confirm_state.status(ROW_B)["started_by_name"] == "Alice"


# ---------------------------------------------------------------------------
# Snapshots and banner events are shared by the router's verified rows
# ---------------------------------------------------------------------------


def test_one_rows_edit_is_not_an_external_change_for_the_other_row():
    _service(ROW_A)
    _service(ROW_B)
    before = {"system": {"host-name": "lab"}}
    after = {"system": {"host-name": "edited-in-vymanager"}}
    config_state.set_saved_config(ROW_A, before)

    config_state.set_managed_config(ROW_A, after)  # row A's save
    baseline = config_state.reconcile_baseline(ROW_B, after)  # row B's banner

    assert baseline == before  # still unsaved, not folded in as external


def test_events_reach_every_verified_row_on_the_router_even_from_a_worker():
    async def main():
        manager = EventManager()
        _service(ROW_A)
        _service(ROW_B)
        _service(ROW_OTHER, host="other.lab")
        _service("row-unverified", verified=False)
        queues = {iid: manager.subscribe(iid) for iid in (ROW_A, ROW_B, ROW_OTHER, "row-unverified")}

        await asyncio.to_thread(manager.emit, ROW_A, "config_diff", None)  # as execute_batch does
        manager.emit_to_instance(ROW_A, "power_status", None)
        await asyncio.sleep(0.05)

        return {iid: [q.get_nowait() for _ in range(q.qsize())] for iid, q in queues.items()}

    got = asyncio.run(main())
    assert len(got[ROW_A]) == 2
    assert len(got[ROW_B]) == 1 and "config_diff" in got[ROW_B][0]
    assert got[ROW_OTHER] == [] and got["row-unverified"] == []


def _poll(monkeypatch, services, diff_for):
    import routers.events as events

    emitted = []

    class Registry:
        def get(self, instance_id):
            if instance_id not in services:
                raise KeyError(instance_id)
            return services[instance_id]

    monkeypatch.setattr(events, "_config_diff_for", diff_for)
    monkeypatch.setattr(events, "_session_device_registry", Registry())
    monkeypatch.setattr(events, "cached_session_service", services.get)
    monkeypatch.setattr(events.event_manager, "update_last_state", lambda iid, kind, value: True)
    monkeypatch.setattr(events.event_manager, "emit_to_instance", lambda iid, kind, data: emitted.append((iid, kind, data)))
    asyncio.run(events._poll_banner_state_for_device(sorted(services), SimpleNamespace(db_pool=None)))
    return emitted


def test_the_poller_reads_each_router_once_and_drops_the_other_rows_caches(monkeypatch):
    a, b = _service(ROW_A), _service(ROW_B)
    reads = []

    async def diff_for(instance_id, service):
        reads.append(instance_id)
        service._cached_config = {"fresh": True}
        return {"has_changes": False}

    emitted = _poll(monkeypatch, {ROW_A: a, ROW_B: b}, diff_for)

    assert reads == [ROW_A]
    # Row B's next read goes out with its own credentials, not row A's.
    assert b._cached_config is None
    assert sorted((iid, kind) for iid, kind, _ in emitted) == sorted([
        (ROW_A, "config_diff"), (ROW_B, "config_diff"),
        (ROW_A, "commit_confirm"), (ROW_B, "commit_confirm"),
    ])


def test_one_failing_row_does_not_stop_the_poll_for_the_others(monkeypatch):
    a, b = _service(ROW_A), _service(ROW_B)

    async def diff_for(instance_id, service):
        if instance_id == ROW_A:
            raise ConnectionError("this row's read fails")
        return {"has_changes": True}

    emitted = _poll(monkeypatch, {ROW_A: a, ROW_B: b}, diff_for)

    assert {iid for iid, kind, _ in emitted if kind == "config_diff"} == {ROW_A, ROW_B}


def test_a_row_refused_during_the_tick_gets_nothing_read_with_another_key(monkeypatch):
    a, b = _service(ROW_A), _service(ROW_B)

    async def diff_for(instance_id, service):
        if instance_id == ROW_A:
            service._router_answered(401, False)  # row A's key was revoked on the router
            raise ValueError("Failed to retrieve full config: HTTP Error 401")
        return {"has_changes": True}

    emitted = _poll(monkeypatch, {ROW_A: a, ROW_B: b}, diff_for)

    assert {iid for iid, kind, _ in emitted if kind == "config_diff"} == {ROW_B}
    assert all(iid == ROW_B for iid, _kind, _ in emitted)


def test_after_a_poll_every_row_still_shows_the_routers_action(monkeypatch):
    a = _service(ROW_A, confirm=True, config=RELOAD)
    b = _service(ROW_B, confirm=True)

    async def diff_for(instance_id, service):
        service.get_full_config(refresh=True)
        return {"has_changes": False}

    emitted = _poll(monkeypatch, {ROW_A: a, ROW_B: b}, diff_for)

    states = {iid: data for iid, kind, data in emitted if kind == "commit_confirm"}
    assert b._cached_config is None
    assert states[ROW_B]["commit_confirm"]["action"] == "reload"


def test_only_the_reading_row_gets_the_diff_data(monkeypatch):
    """The others read it with their own key: a revoked key is refused there."""
    a, b = _service(ROW_A), _service(ROW_B)

    async def diff_for(instance_id, service):
        return {"has_changes": True}

    emitted = _poll(monkeypatch, {ROW_A: a, ROW_B: b}, diff_for)

    diffs = {iid: data for iid, kind, data in emitted if kind == "config_diff"}
    assert diffs == {ROW_A: {"config_diff": {"has_changes": True}}, ROW_B: None}


def test_a_lost_reply_from_an_unverified_row_clears_the_routers_managed_snapshot(monkeypatch):
    delivered = []
    monkeypatch.setattr(event_manager, "_deliver", lambda rows, kind, data: delivered.append((set(rows), kind)))

    def lost(url, data, verify, timeout):
        raise requests.exceptions.ReadTimeout("Read timed out.")

    monkeypatch.setattr("vyos_service._requests.post", lost)
    _service(ROW_A)
    config_state.set_managed_config(ROW_A, {"system": {"host-name": "before"}})
    unverified = _service(ROW_OTHER, confirm=True, verified=False)
    monkeypatch.setattr(unverified, "_before_arming", lambda *_args: (commit_confirm_state.DEFAULT_ACTION, True, None))

    assert unverified.execute_batch(_Batch()).status == 504

    assert config_state.get_managed_config(ROW_A) is None
    assert any(ROW_A in rows for rows, kind in delivered if kind == "config_diff")


def test_a_vyos_rejection_from_an_unverified_row_clears_the_routers_snapshot(monkeypatch):
    """VyOS refused the batch (HTTP 400, no verification) and the re-read failed."""
    delivered = []
    monkeypatch.setattr(event_manager, "_deliver", lambda rows, kind, data: delivered.append((set(rows), kind)))
    _service(ROW_A)
    config_state.set_managed_config(ROW_A, {"system": {"host-name": "before"}})
    service = VyOSService(VyOSDeviceConfig(hostname="router.lab", apikey="k", version="1.5", instance_id=ROW_OTHER))
    cast(Any, service.device).configure_multiple_op = lambda op_path=None: ApiResponse(
        status=400, request={}, result={}, error="HTTP Error 400: Configuration path is not valid")
    cast(Any, service.device).show = lambda path=None: ApiResponse(
        status=502, request={}, result={}, error="HTTP Error 502: Bad Gateway")

    assert service.execute_batch(_Batch()).status == 400

    assert device_keys.key_for(ROW_OTHER) == ROW_OTHER
    assert config_state.get_managed_config(ROW_A) is None
    assert any(ROW_A in rows for rows, kind in delivered if kind == "config_diff")


@pytest.mark.parametrize("status", [502, 504])
def test_a_proxys_json_reply_to_an_arm_is_a_lost_reply(monkeypatch, status):
    """Not VyOS's body: the timer may be armed, so the router is blocked."""
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)

    class _ProxyJson:
        status_code = status

        def json(self):
            return {"message": "Endpoint request timed out"}

    monkeypatch.setattr("vyos_service._requests.post", lambda *args, **kwargs: _ProxyJson())
    service = _service(ROW_A, confirm=True)
    _service(ROW_B)
    monkeypatch.setattr(service, "_before_arming", lambda *_args: (commit_confirm_state.DEFAULT_ACTION, True, None))

    assert service.execute_batch(_Batch()).status == status
    assert commit_confirm_state.blocking(ROW_B) is not None


def test_the_poller_sends_no_commit_confirm_state_for_a_row_without_a_service(monkeypatch):
    """Its settings are unknown there; a guessed enabled:false would hide the warning."""
    a = _service(ROW_A)

    async def diff_for(instance_id, service):
        return {"has_changes": False}

    import routers.events as events

    monkeypatch.setattr(events, "cached_session_service", {ROW_A: a}.get)
    emitted = []
    monkeypatch.setattr(events, "_config_diff_for", diff_for)
    monkeypatch.setattr(events, "_session_device_registry", SimpleNamespace(get={ROW_A: a}.__getitem__))
    monkeypatch.setattr(events.event_manager, "update_last_state", lambda iid, kind, value: True)
    monkeypatch.setattr(events.event_manager, "emit_to_instance", lambda iid, kind, data: emitted.append((iid, kind)))
    asyncio.run(events._poll_banner_state_for_device([ROW_A, ROW_B], SimpleNamespace(db_pool=None)))

    assert (ROW_A, "commit_confirm") in emitted and (ROW_B, "commit_confirm") not in emitted


def test_a_lost_commit_confirm_reply_keeps_the_unsaved_warning(monkeypatch):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)

    def lost(url, data, verify, timeout):
        raise requests.exceptions.ReadTimeout("Read timed out.")

    monkeypatch.setattr("vyos_service._requests.post", lost)
    service = _service(ROW_A, confirm=True, config={"system": {"host-name": "edited"}})
    config_state.set_saved_config(ROW_A, {"system": {"host-name": "lab"}})
    config_state.set_managed_config(ROW_A, {"system": {"host-name": "edited"}})

    assert service.execute_batch(_Batch()).status == 504
    assert _active(ROW_A).unsaved_before is True


# ---------------------------------------------------------------------------
# Archive restore is a commit VyManager made
# ---------------------------------------------------------------------------


def test_a_restore_is_recorded_as_vymanagers_change(monkeypatch):
    emitted = []
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: emitted.append(args[1]))
    a = _service(ROW_A, config={"system": {"host-name": "restored"}})
    cast(Any, a.device).config_file_load = lambda file=None: _ok()

    assert a.load_config_file("/config/archive/x").status == 200
    assert config_state.get_managed_config(ROW_A) == {"system": {"host-name": "restored"}}
    assert emitted == ["config_diff"]


@pytest.mark.parametrize(("raised", "status"), [
    (requests.exceptions.ReadTimeout("Read timed out."), 504),
    (requests.exceptions.ConnectionError("('Connection aborted.', RemoteDisconnected())"), 502),
])
def test_a_failed_restore_keeps_whatever_landed_visible(monkeypatch, raised, status):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)
    a = _service(ROW_A)
    config_state.set_saved_config(ROW_A, {"a": 1})

    def load(file=None):
        raise raised

    cast(Any, a.device).config_file_load = load
    response = a.load_config_file("/config/archive/x")

    assert response.status == status
    assert config_state.get_managed_config(ROW_A) is None


def test_a_reply_with_an_error_is_not_a_successful_save(router):
    a = _service(ROW_A)
    cast(Any, a.device).config_file_save = lambda file=None: ApiResponse(
        status=200, request={}, result={}, error="Saving failed",
    )

    assert a.config_file_save().status == 400


# ---------------------------------------------------------------------------
# Persistence across a backend restart
# ---------------------------------------------------------------------------


def _utc_naive(minutes):
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).replace(tzinfo=None)


def _restart():
    """Forget everything in memory, as a new process would."""
    commit_confirm_state.detach_store()
    with commit_confirm_state._lock:
        commit_confirm_state._sessions.clear()
    with device_keys._lock:
        device_keys._candidate_by_instance.clear()
        device_keys._key_by_instance.clear()


@requires_db
def test_a_pending_commit_confirm_survives_a_restart_and_its_starters_row():
    import asyncpg

    async def main():
        pool = await asyncpg.create_pool(os.environ["DATABASE_URL"], min_size=1, max_size=4)
        suffix = os.urandom(4).hex()
        org, site, row, row2 = f"org-{suffix}", f"site-{suffix}", f"inst-{suffix}", f"inst2-{suffix}"
        host = f"r-{suffix}.lab"
        key = device_keys.device_key(host, 443)

        async def rows(where_key):
            async with pool.acquire() as conn:
                return await conn.fetch('SELECT * FROM commit_confirm_sessions WHERE "deviceKey" = $1', where_key)

        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    'INSERT INTO organizations (id, name, "updatedAt") VALUES ($1, $1, now())', org)
                await conn.execute(
                    'INSERT INTO sites (id, name, "orgId", "updatedAt") VALUES ($1, $1, $2, now())', site, org)
                for instance in (row, row2):
                    await conn.execute(
                        'INSERT INTO instances (id, "siteId", name, host, username, password, "updatedAt") '
                        "VALUES ($1, $2, $1, $3, '', '', now())", instance, site, host)
                # An expired leftover from before the restart.
                await conn.execute(
                    'INSERT INTO commit_confirm_sessions ("deviceKey", "instanceId", "startedAt", "expiresAt", '
                    '"confirmMinutes", action) VALUES ($1, $2, $3, $4, 1, $5)',
                    f"gone-{suffix}:443", row, _utc_naive(-5), _utc_naive(-4), "reboot")

            await commit_confirm_state.load_and_attach(pool)
            assert await rows(f"gone-{suffix}:443") == []
            for instance in (row, row2):
                device_keys.note(instance, host, 443)
                device_keys.verified(instance)
            token = commit_confirm_state.current_actor.set(
                commit_confirm_state.Actor(user_id=None, name="Alice", org_id=org))
            try:
                # From worker threads, as execute_batch runs: arm, confirm,
                # arm again at once. Writes must land in that order.
                first = await asyncio.to_thread(commit_confirm_state.set_active, row, 3, "reload", True)
                await asyncio.to_thread(commit_confirm_state.clear, row)
                started = await asyncio.to_thread(commit_confirm_state.set_active, row, 3, "reload", True)
            finally:
                commit_confirm_state.current_actor.reset(token)
            assert started.started_at != first.started_at
            await commit_confirm_state.flush_and_detach_store()
            await commit_confirm_state.load_and_attach(pool)

            # Deleting the row it was started from keeps the router's session.
            async with pool.acquire() as conn:
                await conn.execute("DELETE FROM instances WHERE id = $1", row)
            [kept] = await rows(key)
            assert kept["instanceId"] is None

            _restart()
            assert commit_confirm_state.get_active(row2) is None
            await commit_confirm_state.load_and_attach(pool)
            device_keys.note(row2, host, 443)  # the other row's first request
            device_keys.verified(row2)
            loaded = commit_confirm_state.get_active(row2)
            assert loaded is not None
            assert (loaded.device_key, loaded.action, loaded.started_by_name, loaded.unsaved_before) == (
                key, "reload", "Alice", True)
            assert abs((loaded.expires_at - started.expires_at).total_seconds()) < 0.01
            assert 170 <= loaded.seconds_remaining() <= 180

            # Running out of time deletes the row.
            loaded.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            assert commit_confirm_state.get_active(row2) is None
            await commit_confirm_state.flush_and_detach_store()
            assert await rows(key) == []
        finally:
            commit_confirm_state.detach_store()
            async with pool.acquire() as conn:
                await conn.execute('DELETE FROM commit_confirm_sessions WHERE "deviceKey" = $1', key)
                await conn.execute('DELETE FROM instances WHERE "siteId" = $1', site)
                await conn.execute("DELETE FROM sites WHERE id = $1", site)
                await conn.execute("DELETE FROM organizations WHERE id = $1", org)
            await pool.close()

    asyncio.run(main())


def test_without_a_database_the_state_still_works_in_memory():
    _service(ROW_A)

    commit_confirm_state.set_active(ROW_A, 1, "reboot")

    assert _active(ROW_A).expires_at > datetime.now(timezone.utc)
