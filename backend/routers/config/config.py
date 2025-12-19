"""
Configuration Management Router

Handles configuration snapshots, diffs, and save operations.
Tracks changes between running config and last saved state.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
import json

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
    try:
        global _saved_config_snapshots

        service = get_session_vyos_service(request)
        instance_id = request.state.instance['id']

        # If no snapshot exists for this instance, get current config and mark it as saved
        if instance_id not in _saved_config_snapshots:
            current_config = service.get_full_config(refresh=True)
            _saved_config_snapshots[instance_id] = current_config

            return ConfigSnapshotResponse(
                config=_saved_config_snapshots[instance_id],
                saved=True
            )

        return ConfigSnapshotResponse(
            config=_saved_config_snapshots[instance_id],
            saved=True
        )
    except Exception as e:
        print(f"[ConfigRouter] Error in /config/snapshot: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/diff", response_model=ConfigDiffResponse)
async def get_config_diff(request: Request):
    """
    Compare current running config with last saved snapshot for the active instance.

    Returns structured diff showing what has been added, removed, or modified
    since the last save operation.
    """
    try:
        global _saved_config_snapshots

        service = get_session_vyos_service(request)
        instance_id = request.state.instance['id']
        current_config = service.get_full_config(refresh=True)

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
    except Exception as e:
        print(f"[ConfigRouter] Error in /config/diff: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
        current_config = service.get_full_config(refresh=True)
        _saved_config_snapshots[instance_id] = current_config

        return SaveConfigResponse(
            success=True,
            message="Configuration saved successfully to disk"
        )
    except Exception as e:
        print(f"[ConfigRouter] Error in /config/save: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh")
async def refresh_config(request: Request):
    """
    Force refresh the configuration cache.

    This is called after any configuration change to ensure the cache is current.
    """
    try:
        service = get_session_vyos_service(request)
        service.get_full_config(refresh=True)
        return {"success": True, "message": "Configuration cache refreshed"}
    except Exception as e:
        print(f"[ConfigRouter] Error in /config/refresh: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/initialize-snapshot")
async def initialize_snapshot(request: Request):
    """
    Initialize the snapshot with the current running config for the active instance.

    This should be called on application startup or when you want to
    mark the current state as "saved".
    """
    try:
        global _saved_config_snapshots

        service = get_session_vyos_service(request)
        instance_id = request.state.instance['id']
        current_config = service.get_full_config(refresh=True)
        _saved_config_snapshots[instance_id] = current_config

        return {
            "success": True,
            "message": "Snapshot initialized with current configuration"
        }
    except Exception as e:
        print(f"[ConfigRouter] Error in /config/initialize-snapshot: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
