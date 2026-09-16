"""Per-instance configuration snapshots used to classify external changes."""

from copy import deepcopy
from typing import Any, Dict


_saved_config_snapshots: Dict[str, Dict[str, Any]] = {}
_managed_config_snapshots: Dict[str, Dict[str, Any]] = {}
_MISSING = object()


def set_saved_config(instance_id: str, config: Dict[str, Any]) -> None:
    """Set the baseline and the expected live state for an instance."""
    snapshot = deepcopy(config)
    _saved_config_snapshots[instance_id] = snapshot
    _managed_config_snapshots[instance_id] = deepcopy(snapshot)


def set_managed_config(instance_id: str, config: Dict[str, Any]) -> None:
    """Record the live state produced by a successful VyManager operation."""
    _managed_config_snapshots[instance_id] = deepcopy(config)


def clear_managed_config(instance_id: str) -> None:
    """Remove the managed marker when a post-mutation read cannot be trusted."""
    _managed_config_snapshots.pop(instance_id, None)


def get_saved_config(instance_id: str) -> Dict[str, Any] | None:
    return _saved_config_snapshots.get(instance_id)


def get_managed_config(instance_id: str) -> Dict[str, Any] | None:
    return _managed_config_snapshots.get(instance_id)


def has_external_changes(instance_id: str, current: Dict[str, Any]) -> bool:
    """Return whether live state differs from the last state VyManager produced."""
    managed = get_managed_config(instance_id)
    return managed is not None and managed != current


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


def accept_external_changes(instance_id: str, current: Dict[str, Any]) -> None:
    """Advance the baseline for external changes without discarding VyOS edits."""
    saved = get_saved_config(instance_id)
    managed = get_managed_config(instance_id)
    if saved is None or managed is None:
        set_saved_config(instance_id, current)
        return

    _saved_config_snapshots[instance_id] = _merge_external_changes(saved, managed, current)
    _managed_config_snapshots[instance_id] = deepcopy(current)
