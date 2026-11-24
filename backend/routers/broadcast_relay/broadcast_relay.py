"""Broadcast Relay Service Router.

API endpoints for managing VyOS UDP Broadcast Relay configuration.
The template structure is identical between VyOS 1.4 and 1.5.

Endpoints:
  GET  /vyos/broadcast-relay/capabilities  — feature flags
  GET  /vyos/broadcast-relay/config        — normalized relay configuration
  POST /vyos/broadcast-relay/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.broadcast_relay import BroadcastRelayMapper
from vyos_builders.broadcast_relay import BroadcastRelayBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import logging
from batch_dispatch import call_comma_batch_op

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/broadcast-relay", tags=["broadcast-relay"])


# ============================================================================
# Pydantic Models
# ============================================================================


class BroadcastRelayInstance(BaseModel):
    """A single broadcast relay instance (ID 1–99)."""
    id: str
    address: Optional[str] = None
    description: Optional[str] = None
    disabled: bool = False
    interfaces: List[str] = []
    port: Optional[int] = None


class BroadcastRelayConfig(BaseModel):
    """Full broadcast-relay service configuration."""
    globally_disabled: bool = False
    instances: List[BroadcastRelayInstance] = []


class BroadcastRelayBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Zero-arg methods: omit (a value is rejected). "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., '5,eth0'); "
            "the last argument keeps any commas."
        ),
    )


class BroadcastRelayBatchRequest(BaseModel):
    operations: List[BroadcastRelayBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_broadcast_relay_capabilities(request: Request):
    """Return broadcast-relay feature capabilities."""
    await require_read_permission(request, FeatureGroup.BROADCAST_RELAY)
    try:
        service = get_session_vyos_service(request)
        builder = BroadcastRelayBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_broadcast_relay_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=BroadcastRelayConfig)
async def get_broadcast_relay_config(http_request: Request, refresh: bool = False):
    """Return the full broadcast-relay configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.BROADCAST_RELAY)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = cast(
            BroadcastRelayMapper,
            CommandMapperRegistry.get_mapper("broadcast_relay", version),
        )
        return BroadcastRelayConfig(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_broadcast_relay_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def broadcast_relay_batch_configure(
    http_request: Request, body: BroadcastRelayBatchRequest
):
    """Execute a batch of broadcast-relay configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.BROADCAST_RELAY)
    try:
        service = get_session_vyos_service(http_request)
        builder = BroadcastRelayBatchBuilder(version=service.get_version())

        for operation in body.operations:
            call_comma_batch_op(builder, operation.op, operation.value)

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Broadcast Relay configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in broadcast_relay_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")

