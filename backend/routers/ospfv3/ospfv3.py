"""
OSPFv3 Protocol Router

API endpoints for managing VyOS OSPFv3 (IPv6 OSPF) configuration.
OSPFv3 is identical between VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.ospfv3 import Ospfv3BatchBuilder
from vyos_mappers.base import CommandMapperRegistry
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/ospfv3", tags=["ospfv3"])


# ============================================================================
# Pydantic Models
# ============================================================================


class Ospfv3Parameters(BaseModel):
    """OSPFv3 global parameters."""
    router_id: Optional[str] = None


class Ospfv3AreaRange(BaseModel):
    """OSPFv3 area range configuration."""
    prefix: str
    advertise: bool = False
    not_advertise: bool = False


class Ospfv3Area(BaseModel):
    """OSPFv3 area configuration."""
    area_id: str
    area_type: Optional[str] = None
    area_type_no_summary: bool = False
    area_type_default_cost: Optional[int] = None
    nssa_default_information_originate: bool = False
    ranges: List[Ospfv3AreaRange] = []
    export_list: Optional[str] = None
    import_list: Optional[str] = None


class Ospfv3Interface(BaseModel):
    """OSPFv3 interface configuration."""
    name: str
    area: Optional[str] = None
    cost: Optional[int] = None
    priority: Optional[int] = None
    hello_interval: Optional[int] = None
    dead_interval: Optional[int] = None
    retransmit_interval: Optional[int] = None
    transmit_delay: Optional[int] = None
    network: Optional[str] = None
    passive: bool = False
    bfd: bool = False
    bfd_profile: Optional[str] = None
    mtu_ignore: bool = False
    ifmtu: Optional[int] = None
    instance_id: Optional[int] = None


class Ospfv3Redistribute(BaseModel):
    """OSPFv3 redistribute entry."""
    protocol: str
    metric: Optional[str] = None
    metric_type: Optional[str] = None
    route_map: Optional[str] = None


class Ospfv3DefaultInformation(BaseModel):
    """OSPFv3 default-information originate settings."""
    enabled: bool = False
    always: bool = False
    metric: Optional[int] = None
    metric_type: Optional[int] = None
    route_map: Optional[str] = None


class Ospfv3DistanceOspfv3(BaseModel):
    """OSPFv3 distance per-type settings."""
    external: Optional[int] = None
    inter_area: Optional[int] = None
    intra_area: Optional[int] = None


class Ospfv3Distance(BaseModel):
    """OSPFv3 distance settings."""
    global_value: Optional[int] = None
    ospfv3: Ospfv3DistanceOspfv3 = Ospfv3DistanceOspfv3()


class Ospfv3GracefulRestartHelper(BaseModel):
    """OSPFv3 graceful restart helper settings."""
    enable: bool = False
    router_ids: List[str] = []
    lsa_check_disable: bool = False
    planned_only: bool = False
    supported_grace_time: Optional[int] = None


class Ospfv3GracefulRestart(BaseModel):
    """OSPFv3 graceful restart settings."""
    enabled: bool = False
    grace_period: Optional[int] = None
    helper: Ospfv3GracefulRestartHelper = Ospfv3GracefulRestartHelper()


class Ospfv3Config(BaseModel):
    """Complete OSPFv3 configuration."""
    parameters: Ospfv3Parameters = Ospfv3Parameters()
    areas: List[Ospfv3Area] = []
    interfaces: List[Ospfv3Interface] = []
    redistribute: List[Ospfv3Redistribute] = []
    default_information: Ospfv3DefaultInformation = Ospfv3DefaultInformation()
    distance: Ospfv3Distance = Ospfv3Distance()
    graceful_restart: Ospfv3GracefulRestart = Ospfv3GracefulRestart()
    auto_cost_reference_bandwidth: Optional[int] = None
    log_adjacency_changes: Optional[bool] = None
    log_adjacency_changes_detail: bool = False


class Ospfv3BatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class Ospfv3BatchRequest(BaseModel):
    """Model for batch configuration."""
    operations: List[Ospfv3BatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_ospfv3_capabilities(request: Request):
    """Get OSPFv3 feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = Ospfv3BatchBuilder(version=version)
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


@router.get("/config", response_model=Ospfv3Config)
async def get_ospfv3_config(http_request: Request, refresh: bool = False):
    """Get all OSPFv3 configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("ospfv3", service.get_version())
        return Ospfv3Config(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def ospfv3_batch_configure(http_request: Request, body: Ospfv3BatchRequest):
    """Execute a batch of OSPFv3 configuration operations."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = Ospfv3BatchBuilder(version=version)

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
            elif len(params) == 3 and operation.value:
                values = operation.value.split(",", 2)
                if len(values) == 3:
                    method(values[0], values[1], values[2])
                elif len(values) == 2:
                    method(values[0], values[1])

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "OSPFv3 configuration updated"},
            error=response.error if response.error else None
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
