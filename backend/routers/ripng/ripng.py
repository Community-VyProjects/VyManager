"""RIPng Protocol Router.

API endpoints for managing VyOS RIPng (Routing Information Protocol next generation)
configuration. Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders.ripng import RipNgBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/ripng", tags=["ripng"])


# ============================================================================
# Pydantic Models
# ============================================================================


class RipNgDistributeListGlobal(BaseModel):
    access_list_in: Optional[str] = None
    access_list_out: Optional[str] = None
    prefix_list_in: Optional[str] = None
    prefix_list_out: Optional[str] = None


class RipNgDistributeListInterface(BaseModel):
    interface: str
    access_list_in: Optional[str] = None
    access_list_out: Optional[str] = None
    prefix_list_in: Optional[str] = None
    prefix_list_out: Optional[str] = None


class RipNgDistributeList(BaseModel):
    global_filters: RipNgDistributeListGlobal = RipNgDistributeListGlobal()
    interface_filters: List[RipNgDistributeListInterface] = []


class RipNgInterface(BaseModel):
    name: str
    split_horizon: Optional[str] = None


class RipNgRedistribute(BaseModel):
    protocol: str
    metric: Optional[int] = None
    route_map: Optional[str] = None


class RipNgTimers(BaseModel):
    update: Optional[int] = None
    timeout: Optional[int] = None
    garbage_collection: Optional[int] = None


class RipNgConfig(BaseModel):
    default_information_originate: bool = False
    default_metric: Optional[int] = None
    route_map: Optional[str] = None
    aggregate_addresses: List[str] = []
    networks: List[str] = []
    routes: List[str] = []
    passive_interfaces: List[str] = []
    distribute_list: RipNgDistributeList = RipNgDistributeList()
    interfaces: List[RipNgInterface] = []
    redistribute: List[RipNgRedistribute] = []
    timers: RipNgTimers = RipNgTimers()


class RipNgBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Comma-separated arguments")


class RipNgBatchRequest(BaseModel):
    operations: List[RipNgBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_ripng_capabilities(request: Request):
    """Return RIPng feature capabilities based on the device VyOS version."""
    await require_read_permission(request, FeatureGroup.RIPNG)

    try:
        service = get_session_vyos_service(request)
        builder = RipNgBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except Exception:
        logger.exception("Unhandled error in get_ripng_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=RipNgConfig)
async def get_ripng_config(http_request: Request, refresh: bool = False):
    """Return the full RIPng configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.RIPNG)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("ripng", service.get_version())
        return RipNgConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error in get_ripng_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def ripng_batch_configure(http_request: Request, body: RipNgBatchRequest):
    """Execute a batch of RIPng configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.RIPNG)

    try:
        service = get_session_vyos_service(http_request)
        builder = RipNgBatchBuilder(version=service.get_version())

        for operation in body.operations:
            method = resolve_batch_method(builder, operation.op)
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
            elif len(params) == 3 and operation.value is not None:
                values = operation.value.split(",", 2)
                if len(values) == 3:
                    method(values[0], values[1], values[2])
                elif len(values) == 2:
                    method(values[0], values[1], "")

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "RIPng configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception:
        logger.exception("Unhandled error in ripng_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
