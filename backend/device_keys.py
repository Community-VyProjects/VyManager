"""Which router an instance row points at, and one write lock per router.

Router state (the commit-confirm timer, the saved and managed config
snapshots, the banner events) belongs to the router, not to the instance row:
two rows, in two sites or two organizations, can point at the same
``host:port``. Everything that keeps such state looks the key up here.

The key is the normalized ``host:port``. Two different names for one router
(a DNS name and its address) are not detected.

A row names its host (``note``) whenever VyManager learns it: on every request
that carries it (``require_session_instance``) and when a service is built.
It joins the router's shared state only once its own credentials have worked
against that router (``verified``: the router answered a config read or a
commit with something other than an auth error), so a row cannot see another
organization's banner or snapshots by typing that router's address. Until
then it keys by its own id. The router answers before VyManager records any
state for a request, so a row is verified before it writes shared state.

A pending commit-confirm still blocks an unverified row's commits
(``candidate_key``, and the write lock is keyed the same way): the router
would archive the commit whoever sent it. At startup the row that started a
pending commit-confirm is registered on its router (``register_key``) only
if it was verified when it armed it; otherwise the session names no row.
"""

import ipaddress
import threading
from typing import Dict, Optional, Set

_lock = threading.Lock()
_candidate_by_instance: Dict[str, str] = {}
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


def note(instance_id: str, host: str, port: int | str | None, org_id: Optional[str] = None) -> str:
    """Record the router a row names and its organization; returns that router's key.

    A changed host takes the row out of its old router's shared state until
    its credentials are verified against the new one.
    """
    candidate = device_key(host, port)
    with _lock:
        if _candidate_by_instance.get(instance_id) != candidate:
            _candidate_by_instance[instance_id] = candidate
            if _key_by_instance.get(instance_id) != candidate:
                _key_by_instance.pop(instance_id, None)
        if org_id is not None or instance_id not in _org_by_instance:
            _org_by_instance[instance_id] = org_id
    return candidate


def verified(instance_id: str) -> None:
    """The row's credentials worked against the router it names: share its state."""
    with _lock:
        candidate = _candidate_by_instance.get(instance_id)
        if candidate is not None:
            _key_by_instance[instance_id] = candidate


def rejected(instance_id: str) -> None:
    """The router refused the row's credentials (401/403): it stops sharing the router's state."""
    with _lock:
        _key_by_instance.pop(instance_id, None)


def register_key(instance_id: str, key: str) -> None:
    """A row known to share ``key`` (it started a commit-confirm persisted under it)."""
    with _lock:
        candidate = _candidate_by_instance.setdefault(instance_id, key)
        if candidate == key:
            _key_by_instance[instance_id] = key


def key_for(instance_id: str) -> str:
    """The key of the router state this row shares (its own id until verified)."""
    with _lock:
        return _key_by_instance.get(instance_id, instance_id)


def candidate_key(instance_id: str) -> str:
    """The router the row names, verified or not (its own id if unknown)."""
    with _lock:
        return _candidate_by_instance.get(instance_id, instance_id)


def instances_on(key: str) -> Set[str]:
    """Every verified instance id on this router (an unverified id is its own key)."""
    with _lock:
        found = {iid for iid, k in _key_by_instance.items() if k == key}
    return found or {key}


def orgs_on(key: str) -> Set[Optional[str]]:
    """The organizations of the verified instance rows on this router."""
    with _lock:
        return {_org_by_instance.get(iid) for iid, k in _key_by_instance.items() if k == key}


def write_lock(instance_id: str) -> threading.RLock:
    """The lock every VyManager write to this instance's router holds.

    Keyed by the router the row names, verified or not, so commits and
    commit-confirms from any rows on one router are serialized. Reentrant, so
    a write that calls another write (a batch, then its commit) holds it once.
    The router serializes commits anyway, so this costs no throughput; it
    makes check, commit and record one step.
    """
    key = candidate_key(instance_id)
    with _lock:
        lock = _write_locks.get(key)
        if lock is None:
            lock = _write_locks[key] = threading.RLock()
        return lock


def forget(instance_id: str) -> None:
    """Drop a row: it was deleted, or its connection settings changed."""
    with _lock:
        _candidate_by_instance.pop(instance_id, None)
        _key_by_instance.pop(instance_id, None)
        _org_by_instance.pop(instance_id, None)
