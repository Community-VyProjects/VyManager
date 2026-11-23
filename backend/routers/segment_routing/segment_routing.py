"""Segment Routing Protocol Router.

API endpoints for managing VyOS Segment Routing (SRv6) configuration:
locators and per-interface SRv6 packet acceptance.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders.segment_routing import SegmentRoutingBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import logging
from batch_dispatch import call_comma_batch_op

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/segment-routing", tags=["segment-routing"])


# ============================================================================
# Pydantic Models
# ============================================================================


class Srv6Locator(BaseModel):
    name: str
    prefix: Optional[str] = None
    block_len: Optional[int] = None
    node_len: Optional[int] = None
    func_bits: Optional[int] = None
    behavior_usid: bool = False


class SrInterface(BaseModel):
    name: str
    hmac: Optional[str] = None


class SegmentRoutingConfig(BaseModel):
    locators: List[Srv6Locator] = []
    interfaces: List[SrInterface] = []


class SegmentRoutingBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Zero-arg methods: omit (a value is rejected). "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated; the last argument keeps any commas."
        ),
    )


class SegmentRoutingBatchRequest(BaseModel):
    operations: List[SegmentRoutingBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_segment_routing_capabilities(request: Request):
    """Return Segment Routing feature capabilities based on the device VyOS version.

    version_info.modify_requires_recreate is true on VyOS 1.4, where FRR
    rejects any modification of an existing segment-routing tree: clients
    must delete the tree and recreate it in two separate batches to edit.
    """
    await require_read_permission(request, FeatureGroup.SEGMENT_ROUTING)

    try:
        service = get_session_vyos_service(request)
        builder = SegmentRoutingBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_segment_routing_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=SegmentRoutingConfig)
async def get_segment_routing_config(http_request: Request, refresh: bool = False):
    """Return the full Segment Routing configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.SEGMENT_ROUTING)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("segment_routing", service.get_version())
        return SegmentRoutingConfig(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_segment_routing_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def segment_routing_batch_configure(http_request: Request, body: SegmentRoutingBatchRequest):
    """Execute a batch of Segment Routing configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.SEGMENT_ROUTING)

    try:
        service = get_session_vyos_service(http_request)
        builder = SegmentRoutingBatchBuilder(version=service.get_version())

        for operation in body.operations:
            call_comma_batch_op(builder, operation.op, operation.value)

        response = await run_in_threadpool(service.execute_batch, builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Segment Routing configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in segment_routing_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
