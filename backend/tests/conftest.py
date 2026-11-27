"""Shared fixtures for the backend tests."""

import pytest

import commit_confirm_state
import config_state
import device_keys


def _reset_router_state() -> None:
    with device_keys._lock:
        device_keys._candidate_by_instance.clear()
        device_keys._key_by_instance.clear()
        device_keys._org_by_instance.clear()
        device_keys._write_locks.clear()
    with commit_confirm_state._lock:
        commit_confirm_state._sessions.clear()
        commit_confirm_state._known_actions.clear()
    commit_confirm_state.detach_store()
    with config_state._lock:
        config_state._saved_config_snapshots.clear()
        config_state._managed_config_snapshots.clear()


@pytest.fixture(autouse=True)
def _fresh_router_state():
    """Router state is process-global (device_keys, commit_confirm_state, config_state).

    Many tests build services on the same fake host, which would make them
    one router; every test starts and ends with no rows noted, no pending
    commit-confirm, no snapshots and no database store attached.
    """
    _reset_router_state()
    yield
    _reset_router_state()
