"""Which router an instance row points at, and one write lock per router.

Router state (the commit-confirm timer, the saved and managed config
snapshots, the banner events) belongs to the router, not to the instance row:
two rows, in two sites or two organizations, can point at the same
``host:port``. Everything that keeps such state looks the key up here.

The key is the normalized ``host:port``. Two different names for one router
(a DNS name and its address) are not detected.

An instance is registered whenever VyManager learns its host: on every
request that carries it (``require_session_instance``), when a service is
built, and when a pending commit-confirm is loaded at startup. An instance
that was never registered keys by its own id, which keeps the old behavior.
"""

import ipaddress
import threading
from typing import Dict, Optional, Set

_lock = threading.Lock()
_key_by_instance: Dict[str, str] = {}
_org_by_instance: Dict[str, Optional[str]] = {}
_write_locks: Dict[str, threading.RLock] = {}


def device_key(host: str, port: int | str | None) -> str:
    """Normalized ``host:port``: lowercase, no IPv6 brackets, compressed IP."""
    name = (host or "").strip().lower()
    if name.startswith("[") and name.endswith("]"):
        name = name[1:-1]
    try:
        name = ipaddress.ip_address(name).compressed
    except ValueError:
        name = name.rstrip(".")
    return f"[{name}]:{int(port or 443)}" if ":" in name else f"{name}:{int(port or 443)}"


def register(instance_id: str, host: str, port: int | str | None, org_id: Optional[str] = None) -> str:
    """Record which router an instance points at; returns its key."""
    key = device_key(host, port)
    with _lock:
        _key_by_instance[instance_id] = key
        if org_id is not None or instance_id not in _org_by_instance:
            _org_by_instance[instance_id] = org_id
    return key


def register_key(instance_id: str, key: str) -> None:
    """Record a key already normalized (a persisted commit-confirm row)."""
    with _lock:
        _key_by_instance.setdefault(instance_id, key)


def key_for(instance_id: str) -> str:
    with _lock:
        return _key_by_instance.get(instance_id, instance_id)


def instances_on(key: str) -> Set[str]:
    """Every instance id known to point at this router (an unregistered id is its own key)."""
    with _lock:
        found = {iid for iid, k in _key_by_instance.items() if k == key}
    return found or {key}


def orgs_on(key: str) -> Set[Optional[str]]:
    """The organizations of the instance rows known to point at this router."""
    with _lock:
        return {_org_by_instance.get(iid) for iid, k in _key_by_instance.items() if k == key}


def write_lock(instance_id: str) -> threading.RLock:
    """The lock every VyManager write to this instance's router holds.

    Reentrant, so a write that calls another write (a batch, then its commit)
    holds it once. The router serializes commits anyway, so this costs no
    throughput; it makes check, commit and record one step.
    """
    key = key_for(instance_id)
    with _lock:
        lock = _write_locks.get(key)
        if lock is None:
            lock = _write_locks[key] = threading.RLock()
        return lock


def forget(instance_id: str) -> None:
    """Drop an instance's registration (tests, deleted rows)."""
    with _lock:
        _key_by_instance.pop(instance_id, None)
        _org_by_instance.pop(instance_id, None)
