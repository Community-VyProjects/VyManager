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
from vyos_service import (
    PARTIAL_COMMIT_NOTICE,
    UNKNOWN_COMMIT_NOTICE,
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
    yield
    config_state.clear_saved_config(IID)


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


def test_without_the_fix_the_landed_part_is_absorbed():
    """The base behavior this locks out: no managed update, the edit looks external."""
    live = _partly_live()
    added, removed, modified = _banner(live)
    assert not (added or removed or modified)


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


def test_unreadable_router_after_a_failure_warns_and_keeps_the_baseline(monkeypatch):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)

    response = _service(None, commit_status=504, commit_error="Request timed out", read_fails=True).execute_batch(BATCH)

    assert response.error.startswith(UNKNOWN_COMMIT_NOTICE)
    assert config_state.get_managed_config(IID) is None
    # With no managed snapshot, reconciliation leaves the baseline alone.
    assert config_state.reconcile_baseline(IID, _partly_live()) == BEFORE


def test_a_timed_out_commit_that_fully_landed_is_reported(monkeypatch):
    monkeypatch.setattr("vyos_service.event_manager.emit", lambda *args: None)
    live = _partly_live()
    live["service"] = {"dhcp-server": {"shared-network-name": {"T": {"subnet": {"10.9.9.0/24": {"subnet-id": "1"}}}}}}

    response = _service(live, commit_status=504, commit_error="Request timed out").execute_batch(BATCH)

    assert response.error.startswith(PARTIAL_COMMIT_NOTICE)
    added, _, _ = _banner(live)
    assert "interfaces.dummy.dum1" in added and "service" in added


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


def test_record_failed_commit_without_a_managed_snapshot_is_unknown():
    config_state.clear_managed_config(IID)
    assert config_state.record_failed_commit(IID, _partly_live(), [["interfaces", "dummy", "dum1"]]) is None


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

    assert service.execute_batch(BATCH).error == "Could not reach the VyOS API"
