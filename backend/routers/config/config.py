"""
Configuration Management Router

Handles configuration snapshots, diffs, and save operations.
Tracks changes between running config and last saved state.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import commit_confirm_state
import json
import logging
from events.event_manager import event_manager, EVENT_CONFIG_DIFF, EVENT_COMMIT_CONFIRM
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/config", tags=["config"])

# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# In-memory storage for saved configuration snapshots per instance
# Key: instance_id, Value: config snapshot
# In production, this could be stored in Redis or a database
_saved_config_snapshots: Dict[str, Dict[str, Any]] = {}


# ========================================================================
# Pydantic Models
# ========================================================================

class ConfigSnapshotResponse(BaseModel):
    """Response containing a configuration snapshot."""
    config: Dict[str, Any]
    timestamp: Optional[str] = None
    saved: bool = False


class ConfigDiffResponse(BaseModel):
    """Response containing configuration differences."""
    has_changes: bool
    added: Dict[str, Any] = {}
    removed: Dict[str, Any] = {}
    modified: Dict[str, Any] = {}
    summary: Dict[str, int] = {}


class SaveConfigResponse(BaseModel):
    """Response from save operation."""
    success: bool
    message: str
    error: Optional[str] = None


# ========================================================================
# Helper Functions
# ========================================================================

def deep_diff(current: Dict, saved: Dict, path: str = "") -> tuple:
    """
    Recursively compare two configuration dictionaries.

    Returns:
        tuple: (added, removed, modified)
    """
    added = {}
    removed = {}
    modified = {}

    # Find keys only in current (added)
    for key in current:
        if key not in saved:
            added[f"{path}.{key}" if path else key] = current[key]
        elif isinstance(current[key], dict) and isinstance(saved[key], dict):
            # Recursively compare nested dicts
            sub_added, sub_removed, sub_modified = deep_diff(
                current[key], saved[key], f"{path}.{key}" if path else key
            )
            added.update(sub_added)
            removed.update(sub_removed)
            modified.update(sub_modified)
        elif current[key] != saved[key]:
            # Value changed
            modified[f"{path}.{key}" if path else key] = {
                "old": saved[key],
                "new": current[key]
            }

    # Find keys only in saved (removed)
    for key in saved:
        if key not in current:
            removed[f"{path}.{key}" if path else key] = saved[key]

    return added, removed, modified


def _expand_set_ops(path_parts: list, value) -> list:
    """Recursively expand a diff value into VyOS set operations."""
    if isinstance(value, dict):
        ops = []
        for k, v in value.items():
            ops.extend(_expand_set_ops(path_parts + [k], v))
        return ops
    elif isinstance(value, list):
        return [{"op": "set", "path": path_parts + [str(item)]} for item in value]
    else:
        return [{"op": "set", "path": path_parts + [str(value)]}]


def _expand_delete_ops(path_parts: list, value) -> list:
    """Recursively expand a diff value into VyOS delete operations."""
    if isinstance(value, dict):
        # Entire subtree is new — delete at the root (VyOS removes the whole tree)
        return [{"op": "delete", "path": path_parts}]
    elif isinstance(value, list):
        return [{"op": "delete", "path": path_parts + [str(item)]} for item in value]
    else:
        return [{"op": "delete", "path": path_parts}]


def _build_discard_operations(added: dict, removed: dict, modified: dict) -> list:
    """Build the reverse operations needed to undo a config diff."""
    operations = []
    for dot_path, value in added.items():
        operations.extend(_expand_delete_ops(dot_path.split("."), value))
    for dot_path, value in removed.items():
        operations.extend(_expand_set_ops(dot_path.split("."), value))
    for dot_path, change in modified.items():
        path_parts = dot_path.split(".")
        old, new = change["old"], change["new"]
        if isinstance(old, list) or isinstance(new, list):
            # Multi-value node: use set-difference to only touch changed items
            old_set = {str(x) for x in (old if isinstance(old, list) else [old])}
            new_set = {str(x) for x in (new if isinstance(new, list) else [new])}
            for item in new_set - old_set:  # in new but not old → delete
                operations.append({"op": "delete", "path": path_parts + [item]})
            for item in old_set - new_set:  # in old but not new → restore
                operations.append({"op": "set", "path": path_parts + [item]})
        else:
            operations.extend(_expand_set_ops(path_parts, old))
    return operations


# ========================================================================
# Endpoints
# ========================================================================

@router.get("/snapshot", response_model=ConfigSnapshotResponse)
async def get_config_snapshot(request: Request):
    """
    Get the last saved configuration snapshot for the active instance.

    This represents the state of the configuration when it was last saved to disk.
    Used to compare against the current running config to detect unsaved changes.
    """
    await require_read_permission(request, FeatureGroup.CONFIGURATION)
    try:
        global _saved_config_snapshots

        service = get_session_vyos_service(request)
        instance_id = request.state.instance['id']

        # If no snapshot exists for this instance, get current config and mark it as saved
        if instance_id not in _saved_config_snapshots:
            current_config = await run_in_threadpool(service.get_full_config, refresh=True)
            _saved_config_snapshots[instance_id] = current_config

            return ConfigSnapshotResponse(
                config=_saved_config_snapshots[instance_id],
                saved=True
            )

        return ConfigSnapshotResponse(
            config=_saved_config_snapshots[instance_id],
            saved=True
        )
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        print(f"[ConfigRouter] Error in /config/snapshot: {type(e).__name__}: {str(e)}")
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/diff", response_model=ConfigDiffResponse)
async def get_config_diff(request: Request):
    """
    Compare current running config with last saved snapshot for the active instance.

    Returns structured diff showing what has been added, removed, or modified
    since the last save operation.
    """
    await require_read_permission(request, FeatureGroup.CONFIGURATION)
    try:
        global _saved_config_snapshots

        service = get_session_vyos_service(request)
        instance_id = request.state.instance['id']
        current_config = await run_in_threadpool(service.get_full_config, refresh=True)

        # If no snapshot exists for this instance, no changes yet
        if instance_id not in _saved_config_snapshots:
            # Initialize snapshot with current config
            _saved_config_snapshots[instance_id] = current_config
            return ConfigDiffResponse(
                has_changes=False,
                summary={"added": 0, "removed": 0, "modified": 0}
            )

        # Compare configurations
        added, removed, modified = deep_diff(current_config, _saved_config_snapshots[instance_id])

        has_changes = bool(added or removed or modified)

        return ConfigDiffResponse(
            has_changes=has_changes,
            added=added,
            removed=removed,
            modified=modified,
            summary={
                "added": len(added),
                "removed": len(removed),
                "modified": len(modified)
            }
        )
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        print(f"[ConfigRouter] Error in /config/diff: {type(e).__name__}: {str(e)}")
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/save", response_model=SaveConfigResponse)
async def save_config(request: Request, file: Optional[str] = None):
    """
    Save the current running configuration to disk for the active instance.

    This calls VyOS's config-file save operation to write the running config
    to /config/config.boot. After successful save, updates the snapshot to
    match the current config.

    Args:
        file: Optional path to save config to (default is /config/config.boot)
    """
    await require_write_permission(request, FeatureGroup.CONFIGURATION)
    try:
        global _saved_config_snapshots

        service = get_session_vyos_service(request)
        instance_id = request.state.instance['id']

        # Call config_file_save
        response = service.config_file_save(file=file)

        if response.status != 200:
            return SaveConfigResponse(
                success=False,
                message="Failed to save configuration",
                error=response.error or "Unknown error"
            )

        # Update snapshot to current config after successful save
        current_config = await run_in_threadpool(service.get_full_config, refresh=True)
        _saved_config_snapshots[instance_id] = current_config

        # Notify SSE subscribers that diff has changed (now empty after save)
        event_manager.emit(instance_id, EVENT_CONFIG_DIFF, None)

        return SaveConfigResponse(
            success=True,
            message="Configuration saved successfully to disk"
        )
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        print(f"[ConfigRouter] Error in /config/save: {type(e).__name__}: {str(e)}")
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/discard", response_model=SaveConfigResponse)
async def discard_config(request: Request):
    """
    Discard all unsaved configuration changes for the active instance.

    Computes the reverse of the current diff (delete added, restore removed,
    revert modified) and executes those operations directly — no config file
    path required. Works on any VyOS setup regardless of config file location.
    """
    await require_write_permission(request, FeatureGroup.CONFIGURATION)
    try:
        global _saved_config_snapshots

        service = get_session_vyos_service(request)
        instance_id = request.state.instance['id']
        current_config = await run_in_threadpool(service.get_full_config, refresh=True)

        if instance_id not in _saved_config_snapshots:
            return SaveConfigResponse(success=True, message="No changes to discard")

        added, removed, modified = deep_diff(current_config, _saved_config_snapshots[instance_id])

        if not added and not removed and not modified:
            return SaveConfigResponse(success=True, message="No changes to discard")

        operations = _build_discard_operations(added, removed, modified)
        response = await run_in_threadpool(
            service.device.configure_multiple_op, op_path=operations
        )

        if response.status != 200:
            return SaveConfigResponse(
                success=False,
                message="Failed to discard configuration changes",
                error=response.error or "Unknown error"
            )

        current_config = await run_in_threadpool(service.get_full_config, refresh=True)
        _saved_config_snapshots[instance_id] = current_config
        event_manager.emit(instance_id, EVENT_CONFIG_DIFF, None)

        return SaveConfigResponse(
            success=True,
            message="Configuration changes discarded successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ConfigRouter] Error in /config/discard: {type(e).__name__}: {str(e)}")
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/refresh", response_model=SaveConfigResponse)
async def refresh_config(request: Request):
    """
    Force refresh the configuration cache.

    This is called after any configuration change to ensure the cache is current.
    """
    try:
        service = get_session_vyos_service(request)
        await run_in_threadpool(service.get_full_config, refresh=True)
        return SaveConfigResponse(success=True, message="Configuration cache refreshed")
    except Exception as e:
        print(f"[ConfigRouter] Error in /config/refresh: {type(e).__name__}: {str(e)}")
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Commit-Confirm Endpoints
# ========================================================================

class CommitConfirmStatusResponse(BaseModel):
    active: bool
    instance_id: Optional[str] = None
    confirm_time_minutes: Optional[int] = None
    action: Optional[str] = None
    seconds_remaining: Optional[int] = None
    expires_at: Optional[str] = None


class CommitConfirmRequest(BaseModel):
    confirm_time_minutes: int = 5
    action: str = "reload"


@router.get("/commit-confirm/status", response_model=CommitConfirmStatusResponse)
async def get_commit_confirm_status(request: Request):
    """
    Get the current commit-confirm status for the active instance.

    Returns active=True with countdown info if a commit-confirm is in progress,
    or active=False if no commit-confirm is active (or it has expired).
    """
    await require_read_permission(request, FeatureGroup.CONFIGURATION)
    try:
        instance_id = request.state.instance["id"]
        session = commit_confirm_state.get_active(instance_id)
        if session is None:
            return CommitConfirmStatusResponse(active=False)
        return CommitConfirmStatusResponse(**session.to_dict())
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in /config/commit-confirm/status")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/commit-confirm/confirm", response_model=SaveConfigResponse)
async def confirm_commit(request: Request):
    """
    Confirm the active commit-confirm, stopping the rollback timer.

    This makes the previously applied changes permanent and saves the
    configuration to disk.
    """
    await require_write_permission(request, FeatureGroup.CONFIGURATION)
    try:
        service = get_session_vyos_service(request)
        instance_id = request.state.instance["id"]

        response = await run_in_threadpool(service.confirm_commit, instance_id)

        if response.status != 200:
            return SaveConfigResponse(
                success=False,
                message="Failed to confirm commit",
                error=response.error or "Unknown error",
            )

        # Refresh the config cache so the unsaved-changes banner reflects
        # the new running config, prompting the user to save when ready.
        await run_in_threadpool(service.get_full_config, refresh=True)

        # Notify SSE subscribers
        event_manager.emit(instance_id, EVENT_COMMIT_CONFIRM, None)
        event_manager.emit(instance_id, EVENT_CONFIG_DIFF, None)

        return SaveConfigResponse(
            success=True,
            message="Commit confirmed — changes are live. Save configuration when ready.",
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in /config/commit-confirm/confirm")
        raise HTTPException(status_code=500, detail="Internal server error")


