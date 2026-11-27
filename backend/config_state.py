"""Per-instance configuration snapshots used to classify external changes.

Two snapshots are kept per instance:

``saved``
    The baseline the unsaved-changes banner diffs live config against. It
    tracks the last state written to disk, advanced to absorb changes made
    outside VyManager.

``managed``
    Live config as VyManager itself last produced it. Anything in live config
    that differs from ``managed`` was made by some other session (SSH, the
    CLI, another tool).

Reconciliation is the read-modify-write of both snapshots. It runs from the
SSE poller task as well as from request handlers, so it must not be split
into a check-then-act pair across a module boundary: callers go through
:func:`reconcile_baseline`, which holds the lock for the whole operation and
hands back the baseline to diff against.
"""

import threading
from copy import deepcopy
from typing import Any, Dict, List

# Guards both snapshot dicts. The banner poller and request handlers reconcile
# concurrently, and reconciliation is a read-modify-write of both.
_lock = threading.RLock()
_saved_config_snapshots: Dict[str, Dict[str, Any]] = {}
_managed_config_snapshots: Dict[str, Dict[str, Any]] = {}
_MISSING = object()


def set_saved_config(instance_id: str, config: Dict[str, Any]) -> None:
    """Set the baseline and the expected live state for an instance.

    Called when live config and disk agree: initial load, save, and discard.
    """
    with _lock:
        snapshot = deepcopy(config)
        _saved_config_snapshots[instance_id] = snapshot
        _managed_config_snapshots[instance_id] = deepcopy(snapshot)


def clear_saved_config(instance_id: str) -> None:
    """Drop both snapshots when live config could not be read after a save or discard.

    The next diff then seeds a new baseline from live config instead of
    diffing against one that no longer matches the router.
    """
    with _lock:
        _saved_config_snapshots.pop(instance_id, None)
        _managed_config_snapshots.pop(instance_id, None)


def set_managed_config(instance_id: str, config: Dict[str, Any]) -> None:
    """Record the live state produced by a successful VyManager operation."""
    with _lock:
        _managed_config_snapshots[instance_id] = deepcopy(config)


def _node_at(tree: Any, path: List[str]) -> Any:
    node = tree
    for name in path:
        if not isinstance(node, dict) or name not in node:
            return _MISSING
        node = node[name]
    return node


def _replace_node(tree: Dict[str, Any], path: List[str], value: Any) -> None:
    """Set ``tree[path]`` to ``value``, or remove it when ``value`` is _MISSING."""
    node = tree
    for name in path[:-1]:
        child = node.get(name)
        if not isinstance(child, dict):
            if value is _MISSING:
                return
            child = {}
            node[name] = child
        node = child
    if value is _MISSING:
        node.pop(path[-1], None)
    else:
        node[path[-1]] = deepcopy(value)


def record_failed_commit(
    instance_id: str, current: Dict[str, Any], node_paths: List[List[str]],
) -> bool:
    """Record the part of a failed commit that still reached the router.

    VyOS commits feature by feature, so a rejected commit can leave some of
    its nodes changed in live config. Those nodes are VyManager's change: they
    are copied from ``current`` into the managed snapshot, so reconciliation
    keeps them in the unsaved-changes banner instead of folding them into the
    baseline as an external edit. Nodes the batch did not touch are left
    alone, so a real external edit made meanwhile is still treated as one.

    Without a managed snapshot the saved baseline is the reference (an
    earlier unsaved edit to the same node then also counts as landed); it is
    left alone, because reconciliation does not move a baseline it has no
    managed snapshot for, so the landed nodes still show in the banner.

    Returns True when a touched node differs from the reference, False when
    none does or there is no baseline yet (nothing to show a change against).
    """
    with _lock:
        managed = _managed_config_snapshots.get(instance_id)
        reference = managed if managed is not None else _saved_config_snapshots.get(instance_id)
        if reference is None:
            return False
        landed = [
            path for path in node_paths
            if path and _node_at(current, path) != _node_at(reference, path)
        ]
        if landed and managed is not None:
            updated = deepcopy(managed)
            for path in landed:
                _replace_node(updated, path, _node_at(current, path))
            _managed_config_snapshots[instance_id] = updated
        return bool(landed)


def clear_managed_config(instance_id: str) -> None:
    """Remove the managed marker when a post-mutation read cannot be trusted.

    A stale managed snapshot is worse than none: reconciliation would see live
    config differing from it, classify the VyManager edit as external, and
    fold it into the baseline, hiding the edit from the unsaved-changes
    banner. With no managed snapshot, :func:`reconcile_baseline` leaves the
    baseline alone and the edit stays visible.
    """
    with _lock:
        _managed_config_snapshots.pop(instance_id, None)


def get_saved_config(instance_id: str) -> Dict[str, Any] | None:
    with _lock:
        return _saved_config_snapshots.get(instance_id)


def get_managed_config(instance_id: str) -> Dict[str, Any] | None:
    with _lock:
        return _managed_config_snapshots.get(instance_id)


def _merge_external_changes(saved: Any, managed: Any, current: Any) -> Any:
    """Accept external changes while preserving VyManager-owned changes.

    The three states are compared in this order:
    - ``current == managed``: no external change; keep the old baseline.
    - ``managed == saved``: VyManager did not change this value; accept live state.
    - otherwise: both sides changed or the values conflict; keep the old baseline.

    ``_MISSING`` is used only as an internal return value and is never copied
    into a configuration snapshot.
    """
    if current == managed:
        return _MISSING if saved is _MISSING else deepcopy(saved)
    if managed == saved:
        return _MISSING if current is _MISSING else deepcopy(current)

    if isinstance(saved, dict) and isinstance(managed, dict) and isinstance(current, dict):
        merged: Dict[str, Any] = {}
        keys = set(saved) | set(managed) | set(current)
        for key in keys:
            value = _merge_external_changes(
                saved.get(key, _MISSING),
                managed.get(key, _MISSING),
                current.get(key, _MISSING),
            )
            if value is not _MISSING:
                merged[key] = value
        return merged

    return _MISSING if saved is _MISSING else deepcopy(saved)


def reconcile_baseline(instance_id: str, current: Dict[str, Any]) -> Dict[str, Any] | None:
    """Absorb external changes and return the baseline to diff ``current`` against.

    This is the only safe entry point for the banner and discard paths. It
    holds the lock across the whole read-modify-write, so a concurrent poller
    tick cannot reconcile between a caller's check and its read, and it hands
    back the exact baseline it produced rather than making the caller re-read
    the dict.

    Returns ``None`` when the instance has no baseline yet; the caller decides
    whether to seed one with :func:`set_saved_config`.
    """
    with _lock:
        saved = _saved_config_snapshots.get(instance_id)
        if saved is None:
            return None

        managed = _managed_config_snapshots.get(instance_id)
        if managed is None or managed == current:
            # Either nothing external happened, or there is no trustworthy
            # record of what VyManager produced (see clear_managed_config).
            # Both mean: leave the baseline alone rather than guess which side
            # owns the difference.
            return saved

        merged = _merge_external_changes(saved, managed, current)
        _saved_config_snapshots[instance_id] = merged
        _managed_config_snapshots[instance_id] = deepcopy(current)
        return merged
