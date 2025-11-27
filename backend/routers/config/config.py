"""
Configuration Management Router

Handles configuration snapshots, diffs, and save operations.
Tracks changes between running config and last saved state.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from vyos_service import VyOSDeviceRegistry
import json

router = APIRouter(prefix="/vyos/config", tags=["config"])

# Module-level variables for device registry
device_registry: VyOSDeviceRegistry = None
CONFIGURED_DEVICE_NAME: Optional[str] = None

# In-memory storage for the last saved configuration snapshot
# In production, this could be stored in Redis or a database
_saved_config_snapshot: Optional[Dict[str, Any]] = None


def set_device_registry(registry: VyOSDeviceRegistry):
    """Set the device registry for this router."""
    global device_registry
    device_registry = registry


def set_configured_device_name(name: str):
    """Set the configured device name for this router."""
    global CONFIGURED_DEVICE_NAME
    CONFIGURED_DEVICE_NAME = name


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
async def get_config_snapshot():
    """
    Get the last saved configuration snapshot.

    This represents the state of the configuration when it was last saved to disk.
    Used to compare against the current running config to detect unsaved changes.
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        global _saved_config_snapshot

        # If no snapshot exists, get current config and mark it as saved
        if _saved_config_snapshot is None:
            service = device_registry.get(CONFIGURED_DEVICE_NAME)
            current_config = service.get_full_config(refresh=True)
            _saved_config_snapshot = current_config

            return ConfigSnapshotResponse(
                config=_saved_config_snapshot,
                saved=True
            )

        return ConfigSnapshotResponse(
            config=_saved_config_snapshot,
            saved=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/diff", response_model=ConfigDiffResponse)
async def get_config_diff():
    """
    Compare current running config with last saved snapshot.

    Returns structured diff showing what has been added, removed, or modified
    since the last save operation.
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        global _saved_config_snapshot

        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        current_config = service.get_full_config(refresh=True)

        # If no snapshot exists, everything is "added" (first time)
        if _saved_config_snapshot is None:
            return ConfigDiffResponse(
                has_changes=False,
                summary={"added": 0, "removed": 0, "modified": 0}
            )

        # Compare configurations
        added, removed, modified = deep_diff(current_config, _saved_config_snapshot)

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
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save", response_model=SaveConfigResponse)
async def save_config(file: Optional[str] = None):
    """
    Save the current running configuration to disk.

    This calls VyOS's config-file save operation to write the running config
    to /config/config.boot. After successful save, updates the snapshot to
    match the current config.

    Args:
        file: Optional path to save config to (default is /config/config.boot)
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        global _saved_config_snapshot

        service = device_registry.get(CONFIGURED_DEVICE_NAME)

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
        _saved_config_snapshot = current_config

        return SaveConfigResponse(
            success=True,
            message="Configuration saved successfully to disk"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh")
async def refresh_config():
    """
    Force refresh the configuration cache.

    This is called after any configuration change to ensure the cache is current.
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        service.get_full_config(refresh=True)
        return {"success": True, "message": "Configuration cache refreshed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/initialize-snapshot")
async def initialize_snapshot():
    """
    Initialize the snapshot with the current running config.

    This should be called on application startup or when you want to
    mark the current state as "saved".
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        global _saved_config_snapshot

        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        current_config = service.get_full_config(refresh=True)
        _saved_config_snapshot = current_config

        return {
            "success": True,
            "message": "Snapshot initialized with current configuration"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
