"""Segment Routing Protocol Router.

API endpoints for managing VyOS Segment Routing (SRv6) configuration:
locators and per-interface SRv6 packet acceptance. The configuration tree
is identical on VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import SegmentRoutingBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

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
    value: Optional[str] = Field(None, description="Comma-separated arguments")


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

        sr_raw = full_config.get("protocols", {}).get("segment-routing", {})

        if not sr_raw:
            return SegmentRoutingConfig()

        return SegmentRoutingConfig(
            locators=_parse_locators(sr_raw.get("srv6", {}).get("locator", {})),
            interfaces=_parse_interfaces(sr_raw.get("interface", {})),
        )
    except Exception:
        logger.exception("Unhandled error in get_segment_routing_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def _safe_int(value) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _parse_locators(raw: dict) -> List[Srv6Locator]:
    if not raw:
        return []

    locators = []
    for name, cfg in raw.items():
        if cfg is None:
            cfg = {}

        locators.append(Srv6Locator(
            name=name,
            prefix=cfg.get("prefix"),
            block_len=_safe_int(cfg.get("block-len")),
            node_len=_safe_int(cfg.get("node-len")),
            func_bits=_safe_int(cfg.get("func-bits")),
            behavior_usid="behavior-usid" in cfg,
        ))

    return locators


def _parse_interfaces(raw: dict) -> List[SrInterface]:
    if not raw:
        return []

    interfaces = []
    for name, cfg in raw.items():
        if cfg is None:
            cfg = {}

        srv6 = cfg.get("srv6", {}) or {}
        interfaces.append(SrInterface(
            name=name,
            hmac=srv6.get("hmac"),
        ))

    return interfaces


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
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1:
                if operation.value is not None:
                    method(operation.value)
            elif len(params) == 2 and operation.value is not None:
                values = operation.value.split(",", 1)
                if len(values) == 2:
                    method(values[0], values[1])
                else:
                    method(operation.value, "")

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Segment Routing configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception:
        logger.exception("Unhandled error in segment_routing_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
