"""
Babel Protocol Router

API endpoints for managing VyOS Babel routing protocol configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders.babel import BabelBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/babel", tags=["babel"])


# ============================================================================
# Pydantic Models
# ============================================================================


class BabelInterface(BaseModel):
    """Babel interface configuration."""
    name: str
    type: Optional[str] = None  # auto, wired, wireless
    channel: Optional[str] = None  # 1-254, interfering, non-interfering
    hello_interval: Optional[int] = None  # 20-655340 ms
    update_interval: Optional[int] = None  # 20-655340 ms
    rxcost: Optional[int] = None  # 1-65534
    split_horizon: Optional[str] = None  # default, enable, disable
    enable_timestamps: bool = False
    max_rtt_penalty: Optional[int] = None  # 0-65535 ms
    rtt_decay: Optional[int] = None  # 1-256
    rtt_min: Optional[int] = None  # 1-65535 ms
    rtt_max: Optional[int] = None  # 1-65535 ms


class BabelParameters(BaseModel):
    """Babel global parameters."""
    diversity: bool = False
    diversity_factor: Optional[int] = None  # 1-256
    resend_delay: Optional[int] = None  # 20-655340 ms
    smoothing_half_life: Optional[int] = None  # 0-65534 seconds


class BabelRedistribute(BaseModel):
    """Babel redistribution settings."""
    ipv4: List[str] = []  # List of protocols
    ipv6: List[str] = []  # List of protocols


class DistributeListFilter(BaseModel):
    """A single direction filter (access-list or prefix-list)."""
    access_list_in: Optional[str] = None
    access_list_out: Optional[str] = None
    prefix_list_in: Optional[str] = None
    prefix_list_out: Optional[str] = None


class DistributeListInterfaceFilter(BaseModel):
    """Per-interface distribute list filter."""
    interface: str
    access_list_in: Optional[str] = None
    access_list_out: Optional[str] = None
    prefix_list_in: Optional[str] = None
    prefix_list_out: Optional[str] = None


class BabelDistributeList(BaseModel):
    """Babel distribute list configuration."""
    ipv4: DistributeListFilter = DistributeListFilter()
    ipv6: DistributeListFilter = DistributeListFilter()
    ipv4_interfaces: List[DistributeListInterfaceFilter] = []
    ipv6_interfaces: List[DistributeListInterfaceFilter] = []


class BabelConfig(BaseModel):
    """Complete Babel configuration."""
    interfaces: List[BabelInterface] = []
    parameters: BabelParameters = BabelParameters()
    redistribute: BabelRedistribute = BabelRedistribute()
    distribute_list: BabelDistributeList = BabelDistributeList()


class BabelBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class BabelBatchRequest(BaseModel):
    """Model for batch configuration."""
    operations: List[BabelBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_babel_capabilities(request: Request):
    """Get Babel feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = BabelBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=BabelConfig)
async def get_babel_config(http_request: Request, refresh: bool = False):
    """Get all Babel configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("babel", service.get_version())
        return BabelConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def babel_batch_configure(http_request: Request, body: BabelBatchRequest):
    """Execute a batch of Babel configuration operations."""
    await require_write_permission(http_request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = BabelBatchBuilder(version=version)

        for operation in body.operations:
            method = resolve_batch_method(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1 and operation.value:
                method(operation.value)
            elif len(params) == 2 and operation.value:
                values = operation.value.split(",", 1)
                if len(values) == 2:
                    method(values[0], values[1])
                else:
                    method(operation.value)
            elif len(params) == 0:
                method()

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Babel configuration updated"},
            error=response.error if response.error else None
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
