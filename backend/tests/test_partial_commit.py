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


def test_a_refused_connection_never_sent_the_commit(monkeypatch):
    import requests

    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: pytest.fail("nothing was sent"))
    service = VyOSService(VyOSDeviceConfig(hostname="lab", apikey="k", version="1.5", instance_id=IID))
    _raising_device(service, requests.exceptions.ConnectionError(
        "Network error: HTTPSConnectionPool(host='lab', port=443): Max retries exceeded "
        "(Caused by NewConnectionError('Failed to establish a new connection: [Errno 111] Connection refused'))",
    ))

    response = service.execute_batch(BATCH)

    assert response.status == 503
    assert response.error == "Could not reach the VyOS API"
    assert config_state.get_managed_config(IID) == BEFORE


def test_without_a_managed_snapshot_the_saved_baseline_decides(monkeypatch):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)
    config_state.clear_managed_config(IID)

    landed = _service(_partly_live()).execute_batch(BATCH)
    nothing = _service(BEFORE, commit_error="Set failed\n").execute_batch(BATCH)

    assert landed.error.startswith(PARTIAL_COMMIT_NOTICE)
    assert nothing.error == "Set failed\n"


@pytest.mark.parametrize("status", [502, 504])
def test_commit_confirm_with_a_lost_reply_shows_the_timer(monkeypatch, status):
    emitted = []
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: emitted.append(args[1]))
    service = _service(None, read_fails=True)
    service.config.commit_confirm_enabled = True
    service._post_api = lambda endpoint, data: ApiResponse(status=status, request={}, result={}, error="Request timed out")

    response = service.execute_batch(BATCH)

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
