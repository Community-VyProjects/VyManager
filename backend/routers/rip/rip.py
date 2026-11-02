"""RIP Protocol Router.

API endpoints for managing VyOS RIP (Routing Information Protocol) configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import RipBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method
import vyos_mappers  # noqa: F401  registers CommandMapperRegistry features
from vyos_mappers.base import CommandMapperRegistry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/rip", tags=["rip"])


# ============================================================================
# Pydantic Models
# ============================================================================


class RipDistributeListGlobal(BaseModel):
    access_list_in: Optional[str] = None
    access_list_out: Optional[str] = None
    prefix_list_in: Optional[str] = None
    prefix_list_out: Optional[str] = None


class RipDistributeListInterface(BaseModel):
    interface: str
    access_list_in: Optional[str] = None
    access_list_out: Optional[str] = None
    prefix_list_in: Optional[str] = None
    prefix_list_out: Optional[str] = None


class RipDistributeList(BaseModel):
    global_filters: RipDistributeListGlobal = RipDistributeListGlobal()
    interface_filters: List[RipDistributeListInterface] = []


class RipMd5Key(BaseModel):
    key_id: str
    password: str


class RipInterface(BaseModel):
    name: str
    authentication_type: Optional[str] = None
    md5_keys: List[RipMd5Key] = []
    plaintext_password: Optional[str] = None
    receive_version: Optional[str] = None
    send_version: Optional[str] = None
    split_horizon: Optional[str] = None


class RipNetworkDistance(BaseModel):
    prefix: str
    distance: Optional[int] = None
    access_list: Optional[str] = None


class RipRedistribute(BaseModel):
    protocol: str
    metric: Optional[int] = None
    route_map: Optional[str] = None


class RipTimers(BaseModel):
    update: Optional[int] = None
    timeout: Optional[int] = None
    garbage_collection: Optional[int] = None


class RipConfig(BaseModel):
    default_distance: Optional[int] = None
    default_information_originate: bool = False
    default_metric: Optional[int] = None
    route_map: Optional[str] = None
    version: Optional[str] = None
    networks: List[str] = []
    neighbors: List[str] = []
    routes: List[str] = []
    passive_interfaces: List[str] = []
    distribute_list: RipDistributeList = RipDistributeList()
    interfaces: List[RipInterface] = []
    network_distances: List[RipNetworkDistance] = []
    redistribute: List[RipRedistribute] = []
    timers: RipTimers = RipTimers()


class RipBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Comma-separated arguments")


class RipBatchRequest(BaseModel):
    operations: List[RipBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_rip_capabilities(request: Request):
    """Return RIP feature capabilities based on the device VyOS version."""
    await require_read_permission(request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(request)
        builder = RipBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except Exception:
        logger.exception("Unhandled error in get_rip_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=RipConfig)
async def get_rip_config(http_request: Request, refresh: bool = False):
    """Return the full RIP configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("rip", service.get_version())
        return RipConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error in get_rip_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def rip_batch_configure(http_request: Request, body: RipBatchRequest):
    """Execute a batch of RIP configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)
        builder = RipBatchBuilder(version=service.get_version())

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
            data={"message": "RIP configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception:
        logger.exception("Unhandled error in rip_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
