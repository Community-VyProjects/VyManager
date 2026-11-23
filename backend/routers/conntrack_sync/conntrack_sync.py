"""Conntrack-Sync Service Router.

API endpoints for managing VyOS Connection Tracking Synchronization configuration.

Endpoints:
  GET  /vyos/conntrack-sync/capabilities  — version-aware feature flags
  GET  /vyos/conntrack-sync/config        — normalized conntrack-sync configuration
  POST /vyos/conntrack-sync/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.conntrack_sync.conntrack_sync import ConntrackSyncMapper
from vyos_builders.conntrack_sync import ConntrackSyncBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/conntrack-sync", tags=["conntrack-sync"])


# ============================================================================
# Pydantic Models
# ============================================================================


class ConntrackSyncInterface(BaseModel):
    """A single interface configured for conntrack-sync."""
    name: str
    peer: Optional[str] = None
    port: Optional[int] = None


class ConntrackSyncFailoverVrrp(BaseModel):
    sync_group: Optional[str] = None


class ConntrackSyncFailoverMechanism(BaseModel):
    vrrp: Optional[ConntrackSyncFailoverVrrp] = None


class ConntrackSyncConfig(BaseModel):
    """Full conntrack-sync service configuration."""
    configured: bool = False
    accept_protocols: List[str] = []
    disable_external_cache: bool = False
    disable_syslog: bool = False
    event_listen_queue_size: Optional[int] = None
    expect_sync: List[str] = []
    failover_mechanism: Optional[ConntrackSyncFailoverMechanism] = None
    ignore_addresses: List[str] = []
    interfaces: List[ConntrackSyncInterface] = []
    listen_addresses: List[str] = []
    mcast_group: Optional[str] = None
    purge_timeout: Optional[int] = None
    startup_resync: bool = False
    sync_queue_size: Optional[int] = None
    vrrp_sync_groups: List[str] = []


class ConntrackSyncBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'eth0,192.168.1.2')."
        ),
    )


class ConntrackSyncBatchRequest(BaseModel):
    operations: List[ConntrackSyncBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_conntrack_sync_capabilities(request: Request):
    """Return conntrack-sync feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.CONNTRACK_SYNC)
    try:
        service = get_session_vyos_service(request)
        builder = ConntrackSyncBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_conntrack_sync_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=ConntrackSyncConfig)
async def get_conntrack_sync_config(http_request: Request, refresh: bool = False):
    """Return the full conntrack-sync configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.CONNTRACK_SYNC)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = cast(
            ConntrackSyncMapper,
            CommandMapperRegistry.get_mapper("conntrack_sync", service.get_version()),
        )
        return ConntrackSyncConfig(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_conntrack_sync_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def conntrack_sync_batch_configure(
    http_request: Request, body: ConntrackSyncBatchRequest
):
    """Execute a batch of conntrack-sync configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.CONNTRACK_SYNC)
    try:
        service = get_session_vyos_service(http_request)
        builder = ConntrackSyncBatchBuilder(version=service.get_version())

        # The mapper raises ValueError for a leaf this version does not have.
        # Catch it only around this loop: execute_batch raises ValueError for
        # an empty batch, and that stays a 500.
        try:
            for operation in body.operations:
                method = resolve_batch_method(builder, operation.op)
                count = len(inspect.signature(method).parameters)

                if count == 0:
                    method()
                    continue
                if not operation.value:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation {operation.op} requires a value",
                    )
                parts = operation.value.split(",", count - 1)
                if len(parts) != count or not all(parts):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation {operation.op} requires {count} values",
                    )
                method(*parts)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Conntrack-Sync configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in conntrack_sync_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
