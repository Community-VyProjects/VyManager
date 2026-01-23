"""
Configuration Management Router

Handles configuration snapshots, diffs, save operations, and backup/restore.
Tracks changes between running config and last saved state.
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from session_vyos_service import get_session_vyos_service
from services.audit import audit_log, AuditAction
import asyncpg
import json
import secrets
import string

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


# Backup-related models
class BackupCreateRequest(BaseModel):
    """Request to create a configuration backup."""
    name: str = Field(..., min_length=1, max_length=255, description="Backup name")
    description: Optional[str] = Field(None, max_length=1000, description="Optional description")


class BackupResponse(BaseModel):
    """Response model for a backup."""
    id: str
    instance_id: str
    name: str
    description: Optional[str] = None
    config_size: int
    created_by: str
    created_by_name: str
    created_at: datetime


class BackupDetailResponse(BackupResponse):
    """Response model for backup with full config."""
    config: Dict[str, Any]


class BackupListResponse(BaseModel):
    """Response containing list of backups."""
    backups: List[BackupResponse]
    total: int


class RestoreResponse(BaseModel):
    """Response from restore operation."""
    success: bool
    message: str
    changes_applied: int = 0
    error: Optional[str] = None


# ========================================================================
# Helper Functions
# ========================================================================

def generate_id() -> str:
    """Generate a 32-character alphanumeric ID."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(32))

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
        current_config = await run_in_threadpool(service.get_full_config, refresh=True)
        _saved_config_snapshots[instance_id] = current_config

        return SaveConfigResponse(
            success=True,
            message="Configuration saved successfully to disk"
        )
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
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
        await run_in_threadpool(service.get_full_config, refresh=True)
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
        current_config = await run_in_threadpool(service.get_full_config, refresh=True)
        _saved_config_snapshots[instance_id] = current_config

        return {
            "success": True,
            "message": "Snapshot initialized with current configuration"
        }
    except Exception as e:
        print(f"[ConfigRouter] Error in /config/initialize-snapshot: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================================
# Backup Management Endpoints
# ========================================================================

@router.post("/backup", response_model=BackupResponse, status_code=201)
async def create_backup(request: Request, body: BackupCreateRequest):
    """
    Create a backup of the current running configuration.

    Saves the current VyOS configuration to the database with a user-defined name.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if not hasattr(request.state, "instance") or not request.state.instance:
        raise HTTPException(status_code=400, detail="No active VyOS instance")

    user = request.state.user
    instance = request.state.instance

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        # Get current running configuration
        service = get_session_vyos_service(request)
        current_config = await run_in_threadpool(service.get_full_config, refresh=True)

        # Calculate config size
        config_json = json.dumps(current_config)
        config_size = len(config_json.encode('utf-8'))

        # Generate backup ID
        backup_id = generate_id()

        async with db_pool.acquire() as conn:
            # Insert backup into database
            backup = await conn.fetchrow(
                """
                INSERT INTO config_backups (
                    id, "instanceId", name, description, config, "configSize",
                    "createdBy", "createdByName", "createdAt"
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                RETURNING id, "instanceId", name, description, "configSize",
                          "createdBy", "createdByName", "createdAt"
                """,
                backup_id,
                instance['id'],
                body.name,
                body.description,
                config_json,  # Store as JSON string
                config_size,
                user['id'],
                user.get('name') or user.get('email', 'Unknown'),
            )

            # Audit log
            await audit_log(
                request,
                AuditAction.CONFIG_BACKUP_CREATED,
                f"backup.{backup_id}",
                {"name": body.name, "size": config_size}
            )

            return BackupResponse(
                id=backup['id'],
                instance_id=backup['instanceId'],
                name=backup['name'],
                description=backup['description'],
                config_size=backup['configSize'],
                created_by=backup['createdBy'],
                created_by_name=backup['createdByName'],
                created_at=backup['createdAt'],
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ConfigRouter] Error creating backup: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create backup")


@router.get("/backups", response_model=BackupListResponse)
async def list_backups(request: Request, limit: int = 50, offset: int = 0):
    """
    List all backups for the active instance.

    Returns backups sorted by creation time (newest first).
    """
    if not hasattr(request.state, "instance") or not request.state.instance:
        raise HTTPException(status_code=400, detail="No active VyOS instance")

    instance = request.state.instance

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Get total count
            total = await conn.fetchval(
                'SELECT COUNT(*) FROM config_backups WHERE "instanceId" = $1',
                instance['id']
            )

            # Get backups
            backups = await conn.fetch(
                """
                SELECT id, "instanceId", name, description, "configSize",
                       "createdBy", "createdByName", "createdAt"
                FROM config_backups
                WHERE "instanceId" = $1
                ORDER BY "createdAt" DESC
                LIMIT $2 OFFSET $3
                """,
                instance['id'],
                limit,
                offset,
            )

            return BackupListResponse(
                backups=[
                    BackupResponse(
                        id=b['id'],
                        instance_id=b['instanceId'],
                        name=b['name'],
                        description=b['description'],
                        config_size=b['configSize'],
                        created_by=b['createdBy'],
                        created_by_name=b['createdByName'],
                        created_at=b['createdAt'],
                    )
                    for b in backups
                ],
                total=total,
            )

    except Exception as e:
        print(f"[ConfigRouter] Error listing backups: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list backups")


@router.get("/backup/{backup_id}", response_model=BackupDetailResponse)
async def get_backup(request: Request, backup_id: str):
    """
    Get a specific backup with full configuration.
    """
    if not hasattr(request.state, "instance") or not request.state.instance:
        raise HTTPException(status_code=400, detail="No active VyOS instance")

    instance = request.state.instance

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            backup = await conn.fetchrow(
                """
                SELECT id, "instanceId", name, description, config, "configSize",
                       "createdBy", "createdByName", "createdAt"
                FROM config_backups
                WHERE id = $1 AND "instanceId" = $2
                """,
                backup_id,
                instance['id'],
            )

            if not backup:
                raise HTTPException(status_code=404, detail="Backup not found")

            # Parse config from JSON string
            config = json.loads(backup['config']) if isinstance(backup['config'], str) else backup['config']

            return BackupDetailResponse(
                id=backup['id'],
                instance_id=backup['instanceId'],
                name=backup['name'],
                description=backup['description'],
                config=config,
                config_size=backup['configSize'],
                created_by=backup['createdBy'],
                created_by_name=backup['createdByName'],
                created_at=backup['createdAt'],
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ConfigRouter] Error getting backup: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get backup")


@router.get("/backup/{backup_id}/download")
async def download_backup(request: Request, backup_id: str):
    """
    Download a backup as a JSON file.
    """
    if not hasattr(request.state, "instance") or not request.state.instance:
        raise HTTPException(status_code=400, detail="No active VyOS instance")

    instance = request.state.instance

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            backup = await conn.fetchrow(
                """
                SELECT name, config, "createdAt"
                FROM config_backups
                WHERE id = $1 AND "instanceId" = $2
                """,
                backup_id,
                instance['id'],
            )

            if not backup:
                raise HTTPException(status_code=404, detail="Backup not found")

            # Parse config
            config = json.loads(backup['config']) if isinstance(backup['config'], str) else backup['config']

            # Create export object with metadata
            export_data = {
                "metadata": {
                    "backup_name": backup['name'],
                    "instance_name": instance['name'],
                    "created_at": backup['createdAt'].isoformat(),
                    "exported_at": datetime.utcnow().isoformat(),
                    "vymanager_version": "1.0.0",
                },
                "config": config,
            }

            # Generate filename
            safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in backup['name'])
            filename = f"vyos_backup_{safe_name}_{backup['createdAt'].strftime('%Y%m%d_%H%M%S')}.json"

            # Return as downloadable JSON file
            content = json.dumps(export_data, indent=2)
            return StreamingResponse(
                iter([content]),
                media_type="application/json",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"'
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ConfigRouter] Error downloading backup: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to download backup")


@router.delete("/backup/{backup_id}")
async def delete_backup(request: Request, backup_id: str):
    """
    Delete a specific backup.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if not hasattr(request.state, "instance") or not request.state.instance:
        raise HTTPException(status_code=400, detail="No active VyOS instance")

    instance = request.state.instance

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Get backup name for audit log
            backup = await conn.fetchrow(
                'SELECT name FROM config_backups WHERE id = $1 AND "instanceId" = $2',
                backup_id,
                instance['id'],
            )

            if not backup:
                raise HTTPException(status_code=404, detail="Backup not found")

            # Delete backup
            await conn.execute(
                'DELETE FROM config_backups WHERE id = $1',
                backup_id,
            )

            # Audit log
            await audit_log(
                request,
                AuditAction.CONFIG_BACKUP_DELETED,
                f"backup.{backup_id}",
                {"name": backup['name']}
            )

            return {"success": True, "message": "Backup deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ConfigRouter] Error deleting backup: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete backup")


@router.post("/backup/{backup_id}/restore", response_model=RestoreResponse)
async def restore_backup(request: Request, backup_id: str):
    """
    Restore configuration from a backup.

    This loads the backup configuration and applies it to the VyOS device.
    WARNING: This will overwrite the current running configuration!
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if not hasattr(request.state, "instance") or not request.state.instance:
        raise HTTPException(status_code=400, detail="No active VyOS instance")

    instance = request.state.instance

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Get backup
            backup = await conn.fetchrow(
                """
                SELECT id, name, config
                FROM config_backups
                WHERE id = $1 AND "instanceId" = $2
                """,
                backup_id,
                instance['id'],
            )

            if not backup:
                raise HTTPException(status_code=404, detail="Backup not found")

            # Parse config
            backup_config = json.loads(backup['config']) if isinstance(backup['config'], str) else backup['config']

        # Get VyOS service
        service = get_session_vyos_service(request)

        # Load the backup configuration
        # This uses VyOS config_file_load which loads a config file
        # We need to use the set commands approach instead

        # For now, we'll use a simplified approach:
        # 1. Get current config
        # 2. Calculate what needs to be changed
        # 3. Apply the changes

        current_config = await run_in_threadpool(service.get_full_config, refresh=True)

        # Calculate differences
        added, removed, modified = deep_diff(backup_config, current_config)

        # For a full restore, we would need to:
        # 1. Delete paths that exist in current but not in backup
        # 2. Set paths that exist in backup but not in current
        # 3. Update paths that differ

        # This is a complex operation - for now, return info about what would change
        total_changes = len(added) + len(removed) + len(modified)

        if total_changes == 0:
            return RestoreResponse(
                success=True,
                message="Configuration already matches backup - no changes needed",
                changes_applied=0,
            )

        # TODO: Implement actual restore by applying VyOS commands
        # This requires building and executing set/delete commands
        # For safety, we'll require manual review for now

        # Audit log the restore attempt
        await audit_log(
            request,
            AuditAction.CONFIG_RESTORE_INITIATED,
            f"backup.{backup_id}",
            {
                "name": backup['name'],
                "changes": {
                    "added": len(added),
                    "removed": len(removed),
                    "modified": len(modified),
                }
            }
        )

        return RestoreResponse(
            success=True,
            message=f"Restore preview: {len(added)} additions, {len(removed)} removals, {len(modified)} modifications would be applied. Full restore functionality coming soon.",
            changes_applied=0,  # Preview only for now
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ConfigRouter] Error restoring backup: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to restore backup")


@router.get("/backup/{backup_id}/diff", response_model=ConfigDiffResponse)
async def diff_backup_with_current(request: Request, backup_id: str):
    """
    Compare a backup with the current running configuration.

    Returns what would change if this backup were restored.
    """
    if not hasattr(request.state, "instance") or not request.state.instance:
        raise HTTPException(status_code=400, detail="No active VyOS instance")

    instance = request.state.instance

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            backup = await conn.fetchrow(
                """
                SELECT config
                FROM config_backups
                WHERE id = $1 AND "instanceId" = $2
                """,
                backup_id,
                instance['id'],
            )

            if not backup:
                raise HTTPException(status_code=404, detail="Backup not found")

            # Parse backup config
            backup_config = json.loads(backup['config']) if isinstance(backup['config'], str) else backup['config']

        # Get current config
        service = get_session_vyos_service(request)
        current_config = await run_in_threadpool(service.get_full_config, refresh=True)

        # Compare: what would change to go from current to backup
        added, removed, modified = deep_diff(backup_config, current_config)

        has_changes = bool(added or removed or modified)

        return ConfigDiffResponse(
            has_changes=has_changes,
            added=added,      # Would be added when restoring
            removed=removed,  # Would be removed when restoring
            modified=modified,
            summary={
                "added": len(added),
                "removed": len(removed),
                "modified": len(modified),
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ConfigRouter] Error diffing backup: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to compare backup")


# ========================================================================
# Cross-Instance Comparison
# ========================================================================


class InstanceCompareRequest(BaseModel):
    """Request to compare configs between instances."""
    source_backup_id: Optional[str] = None  # If None, use current running config
    target_instance_id: str
    target_backup_id: Optional[str] = None  # If None, use latest backup


class InstanceCompareResponse(BaseModel):
    """Response from instance comparison."""
    source_instance_id: str
    source_instance_name: str
    target_instance_id: str
    target_instance_name: str
    has_changes: bool
    added: Dict[str, Any] = {}
    removed: Dict[str, Any] = {}
    modified: Dict[str, Any] = {}
    summary: Dict[str, int] = {}


@router.post("/compare-instances", response_model=InstanceCompareResponse)
async def compare_instances(request: Request, data: InstanceCompareRequest):
    """
    Compare configuration between the current instance and another instance.

    Uses configuration backups for comparison. If no backup_id is specified,
    uses the latest backup for each instance.
    """
    instance = request.state.instance
    if not instance:
        raise HTTPException(status_code=400, detail="No active VyOS session")

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Get source config (current instance)
            if data.source_backup_id:
                source_backup = await conn.fetchrow(
                    """
                    SELECT config, i.name as instance_name
                    FROM config_backups cb
                    JOIN instances i ON cb."instanceId" = i.id
                    WHERE cb.id = $1 AND cb."instanceId" = $2
                    """,
                    data.source_backup_id,
                    instance['id'],
                )
                if not source_backup:
                    raise HTTPException(status_code=404, detail="Source backup not found")
                source_config = json.loads(source_backup['config']) if isinstance(source_backup['config'], str) else source_backup['config']
                source_name = source_backup['instance_name']
            else:
                # Use current running config
                service = get_session_vyos_service(request)
                source_config = await run_in_threadpool(service.get_full_config, refresh=True)
                source_name = instance.get('name', 'Current Instance')

            # Verify user has access to target instance
            target_access = await conn.fetchrow(
                """
                SELECT i.id, i.name
                FROM instances i
                JOIN user_instance_roles uir ON i.id = uir."instanceId"
                WHERE i.id = $1 AND uir."userId" = $2
                """,
                data.target_instance_id,
                request.state.user['id']
            )
            if not target_access:
                raise HTTPException(status_code=403, detail="No access to target instance")

            # Get target config
            if data.target_backup_id:
                target_backup = await conn.fetchrow(
                    """
                    SELECT config
                    FROM config_backups
                    WHERE id = $1 AND "instanceId" = $2
                    """,
                    data.target_backup_id,
                    data.target_instance_id,
                )
            else:
                # Get latest backup for target instance
                target_backup = await conn.fetchrow(
                    """
                    SELECT config
                    FROM config_backups
                    WHERE "instanceId" = $1
                    ORDER BY "createdAt" DESC
                    LIMIT 1
                    """,
                    data.target_instance_id,
                )

            if not target_backup:
                raise HTTPException(
                    status_code=404,
                    detail="No backup found for target instance. Create a backup first."
                )

            target_config = json.loads(target_backup['config']) if isinstance(target_backup['config'], str) else target_backup['config']

            # Compare configs
            added, removed, modified = deep_diff(source_config, target_config)
            has_changes = bool(added or removed or modified)

            return InstanceCompareResponse(
                source_instance_id=instance['id'],
                source_instance_name=source_name,
                target_instance_id=data.target_instance_id,
                target_instance_name=target_access['name'],
                has_changes=has_changes,
                added=added,
                removed=removed,
                modified=modified,
                summary={
                    "added": len(added),
                    "removed": len(removed),
                    "modified": len(modified),
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ConfigRouter] Error comparing instances: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to compare instances")
