"""
OSPF Protocol Router

API endpoints for managing VyOS OSPF (Open Shortest Path First) configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.ospf import OspfBatchBuilder
from vyos_mappers.base import CommandMapperRegistry
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/ospf", tags=["ospf"])


# ============================================================================
# Pydantic Models
# ============================================================================


class OspfParameters(BaseModel):
    """OSPF global parameters."""
    router_id: Optional[str] = None
    abr_type: Optional[str] = None
    opaque_lsa: bool = False
    rfc1583_compatibility: bool = False


class OspfAreaRange(BaseModel):
    """OSPF area range configuration."""
    prefix: str
    cost: Optional[int] = None
    not_advertise: bool = False
    substitute: Optional[str] = None


class OspfVirtualLink(BaseModel):
    """OSPF area virtual-link configuration."""
    address: str
    dead_interval: Optional[int] = None
    hello_interval: Optional[int] = None
    retransmit_interval: Optional[int] = None
    retransmit_window: Optional[int] = None
    transmit_delay: Optional[int] = None


class OspfArea(BaseModel):
    """OSPF area configuration."""
    area_id: str
    area_type: Optional[str] = None
    area_type_no_summary: bool = False
    area_type_default_cost: Optional[int] = None
    networks: List[str] = []
    ranges: List[OspfAreaRange] = []
    authentication: Optional[str] = None
    shortcut: Optional[str] = None
    export_list: Optional[str] = None
    import_list: Optional[str] = None
    virtual_links: List[OspfVirtualLink] = []


class OspfInterfaceAuthentication(BaseModel):
    """OSPF interface authentication settings."""
    md5_key_ids: Dict[str, str] = {}
    plaintext_password: Optional[str] = None


class OspfInterface(BaseModel):
    """OSPF interface configuration."""
    name: str
    area: Optional[str] = None
    cost: Optional[int] = None
    priority: Optional[int] = None
    hello_interval: Optional[int] = None
    dead_interval: Optional[int] = None
    retransmit_interval: Optional[int] = None
    retransmit_window: Optional[int] = None
    transmit_delay: Optional[int] = None
    network: Optional[str] = None
    passive: Optional[bool] = None
    passive_disable: bool = False
    bfd: bool = False
    mtu_ignore: bool = False
    bandwidth: Optional[int] = None
    hello_multiplier: Optional[int] = None
    authentication: OspfInterfaceAuthentication = OspfInterfaceAuthentication()
    ldp_sync: bool = False
    ldp_sync_disable: bool = False
    ldp_sync_holddown: Optional[int] = None


class OspfRedistribute(BaseModel):
    """OSPF redistribute entry."""
    protocol: str
    metric: Optional[str] = None
    metric_type: Optional[str] = None
    route_map: Optional[str] = None
    table: Optional[str] = None


class OspfDefaultInformation(BaseModel):
    """OSPF default-information originate settings."""
    enabled: bool = False
    always: bool = False
    metric: Optional[int] = None
    metric_type: Optional[int] = None
    route_map: Optional[str] = None


class OspfDistanceOspf(BaseModel):
    """OSPF distance per-type settings."""
    external: Optional[int] = None
    inter_area: Optional[int] = None
    intra_area: Optional[int] = None


class OspfDistance(BaseModel):
    """OSPF distance settings."""
    global_value: Optional[int] = None
    ospf: OspfDistanceOspf = OspfDistanceOspf()


class OspfTimersThrottleSpf(BaseModel):
    """OSPF SPF throttle timers."""
    delay: Optional[int] = None
    initial_holdtime: Optional[int] = None
    max_holdtime: Optional[int] = None


class OspfMaxMetricRouterLsa(BaseModel):
    """OSPF max-metric router-lsa settings."""
    administrative: bool = False
    on_shutdown: Optional[int] = None
    on_startup: Optional[int] = None


class OspfGracefulRestartHelper(BaseModel):
    """OSPF graceful restart helper settings."""
    enable: bool = False
    router_ids: List[str] = []
    no_strict_lsa_checking: bool = False
    planned_only: bool = False
    supported_grace_time: Optional[int] = None


class OspfGracefulRestart(BaseModel):
    """OSPF graceful restart settings."""
    enabled: bool = False
    grace_period: Optional[int] = None
    helper: OspfGracefulRestartHelper = OspfGracefulRestartHelper()


class OspfNeighbor(BaseModel):
    """OSPF neighbor configuration."""
    address: str
    poll_interval: Optional[int] = None
    priority: Optional[int] = None


class OspfMplsTe(BaseModel):
    """OSPF MPLS-TE settings."""
    enable: bool = False
    router_address: Optional[str] = None


class OspfSummaryAddress(BaseModel):
    """OSPF summary address."""
    prefix: str
    no_advertise: bool = False
    tag: Optional[int] = None


class OspfSegmentRouting(BaseModel):
    """OSPF segment routing settings."""
    global_block_low: Optional[int] = None
    global_block_high: Optional[int] = None
    local_block_low: Optional[int] = None
    local_block_high: Optional[int] = None
    maximum_label_depth: Optional[int] = None


class OspfConfig(BaseModel):
    """Complete OSPF configuration."""
    parameters: OspfParameters = OspfParameters()
    areas: List[OspfArea] = []
    interfaces: List[OspfInterface] = []
    redistribute: List[OspfRedistribute] = []
    default_information: OspfDefaultInformation = OspfDefaultInformation()
    distance: OspfDistance = OspfDistance()
    timers_throttle_spf: OspfTimersThrottleSpf = OspfTimersThrottleSpf()
    max_metric_router_lsa: OspfMaxMetricRouterLsa = OspfMaxMetricRouterLsa()
    graceful_restart: OspfGracefulRestart = OspfGracefulRestart()
    neighbors: List[OspfNeighbor] = []
    mpls_te: OspfMplsTe = OspfMplsTe()
    summary_addresses: List[OspfSummaryAddress] = []
    segment_routing: OspfSegmentRouting = OspfSegmentRouting()
    auto_cost_reference_bandwidth: Optional[int] = None
    log_adjacency_changes: Optional[bool] = None
    log_adjacency_changes_detail: bool = False
    passive_interface_default: bool = False
    maximum_paths: Optional[int] = None
    ldp_sync_holddown: Optional[int] = None
    refresh_timers: Optional[int] = None
    aggregation_timer: Optional[int] = None
    capability_opaque: bool = False


class OspfBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class OspfBatchRequest(BaseModel):
    """Model for batch configuration."""
    operations: List[OspfBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_ospf_capabilities(request: Request):
    """Get OSPF feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.OSPF)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = OspfBatchBuilder(version=version)
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


@router.get("/config", response_model=OspfConfig)
async def get_ospf_config(http_request: Request, refresh: bool = False):
    """Get all OSPF configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.OSPF)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("ospf", service.get_version())
        return OspfConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def ospf_batch_configure(http_request: Request, body: OspfBatchRequest):
    """Execute a batch of OSPF configuration operations."""
    await require_write_permission(http_request, FeatureGroup.OSPF)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = OspfBatchBuilder(version=version)

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
            data={"message": "OSPF configuration updated"},
            error=response.error if response.error else None
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
