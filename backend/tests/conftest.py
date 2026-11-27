"""Shared fixtures for the backend tests."""

import pytest

import commit_confirm_state
import device_keys


@pytest.fixture(autouse=True)
def _fresh_router_state():
    """Router state is process-global (device_keys, commit_confirm_state).

    Many tests build services on the same fake host, which would make them
    one router; start and end every test with no registrations and no
    pending commit-confirm.
    """
    yield
    with device_keys._lock:
        device_keys._key_by_instance.clear()
        device_keys._org_by_instance.clear()
        device_keys._write_locks.clear()
    with commit_confirm_state._lock:
        commit_confirm_state._sessions.clear()
