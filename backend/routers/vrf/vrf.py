"""
VRF Router

API endpoints for managing VyOS VRF (Virtual Routing and Forwarding) configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.

Includes full protocol subtree management:
- Static routes (IPv4/IPv6)
- RPKI (VyOS 1.5+)
- Failover (VyOS 1.5+)
- OSPF, OSPFv3, IS-IS, BGP
- DHCP server, DHCPv6 server (VyOS 1.5+)
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders import VrfBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/vrf", tags=["vrf"])


# ============================================================================
# Pydantic Models — Core VRF
# ============================================================================


class VrfIpProtocolRouteMap(BaseModel):
    """Per-protocol route-map assignment."""
    protocol: str
    route_map: str


class VrfIpSettings(BaseModel):
    """IP/IPv6 settings for a VRF instance."""
    disable_forwarding: bool = False
    nht_no_resolve_via_default: bool = False
    protocol_route_maps: List[VrfIpProtocolRouteMap] = []


# ============================================================================
# Pydantic Models — Static Routes
# ============================================================================


class VrfStaticRouteBfd(BaseModel):
    """BFD configuration for a static route next-hop."""
    profile: Optional[str] = None
    multi_hop_source: Optional[str] = None


class VrfStaticRouteNextHop(BaseModel):
    """Next-hop for a static route."""
    address: str
    disable: bool = False
    distance: Optional[int] = None
    interface: Optional[str] = None
    vrf: Optional[str] = None
    bfd: Optional[VrfStaticRouteBfd] = None
    segments: Optional[str] = None


class VrfStaticRouteInterface(BaseModel):
    """Interface route for a static route."""
    name: str
    disable: bool = False
    distance: Optional[int] = None
    vrf: Optional[str] = None
    segments: Optional[str] = None


class VrfStaticRouteBlackhole(BaseModel):
    """Blackhole/reject settings."""
    distance: Optional[int] = None
    tag: Optional[int] = None


class VrfStaticRoute(BaseModel):
    """A single static route (IPv4 or IPv6)."""
    destination: str
    description: Optional[str] = None
    dhcp_interface: Optional[str] = None
    next_hops: List[VrfStaticRouteNextHop] = []
    interfaces: List[VrfStaticRouteInterface] = []
    blackhole: Optional[VrfStaticRouteBlackhole] = None
    reject: Optional[VrfStaticRouteBlackhole] = None


class VrfStaticConfig(BaseModel):
    """Static route configuration within a VRF."""
    routes: List[VrfStaticRoute] = []
    routes6: List[VrfStaticRoute] = []


# ============================================================================
# Pydantic Models — RPKI
# ============================================================================


class VrfRpkiCacheSsh(BaseModel):
    """RPKI cache SSH configuration."""
    key: Optional[str] = None
    username: Optional[str] = None


class VrfRpkiCache(BaseModel):
    """RPKI cache configuration."""
    name: str
    port: Optional[int] = None
    preference: Optional[int] = None
    source_address: Optional[str] = None
    ssh: Optional[VrfRpkiCacheSsh] = None


class VrfRpkiConfig(BaseModel):
    """RPKI configuration within a VRF."""
    caches: List[VrfRpkiCache] = []
    expire_interval: Optional[int] = None
    polling_period: Optional[int] = None
    retry_interval: Optional[int] = None
    raw_config: Optional[Dict[str, Any]] = None


# ============================================================================
# Pydantic Models — Failover
# ============================================================================


class VrfFailoverCheckTarget(BaseModel):
    """Failover check target."""
    address: str
    interface: Optional[str] = None
    vrf: Optional[str] = None


class VrfFailoverCheck(BaseModel):
    """Failover check configuration."""
    policy: Optional[str] = None
    port: Optional[int] = None
    targets: List[VrfFailoverCheckTarget] = []
    timeout: Optional[int] = None
    type: Optional[str] = None


class VrfFailoverNextHop(BaseModel):
    """Failover route next-hop."""
    address: str
    check: Optional[VrfFailoverCheck] = None
    interface: Optional[str] = None
    metric: Optional[int] = None
    onlink: bool = False


class VrfFailoverDhcpInterface(BaseModel):
    """Failover route DHCP interface."""
    name: str
    check: Optional[VrfFailoverCheck] = None
    interface: Optional[str] = None
    metric: Optional[int] = None
    onlink: bool = False


class VrfFailoverRoute(BaseModel):
    """A single failover route."""
    destination: str
    next_hops: List[VrfFailoverNextHop] = []
    dhcp_interfaces: List[VrfFailoverDhcpInterface] = []


class VrfFailoverConfig(BaseModel):
    """Failover configuration within a VRF."""
    routes: List[VrfFailoverRoute] = []
    raw_config: Optional[Dict[str, Any]] = None


# ============================================================================
# Pydantic Models — Protocol Summaries (for OSPF, OSPFv3, ISIS, BGP)
# These are intentionally kept as summary-level models. The full config
# is returned as raw dicts to avoid enormous model definitions for deeply
# nested protocol configs. The batch API handles detailed operations.
# ============================================================================


class VrfOspfSummary(BaseModel):
    """OSPF summary within a VRF."""
    configured: bool = False
    router_id: Optional[str] = None
    areas: List[str] = []
    interfaces: List[str] = []
    redistribute: List[str] = []
    raw_config: Optional[Dict[str, Any]] = None


class VrfOspfv3Summary(BaseModel):
    """OSPFv3 summary within a VRF."""
    configured: bool = False
    router_id: Optional[str] = None
    areas: List[str] = []
    interfaces: List[str] = []
    redistribute: List[str] = []
    raw_config: Optional[Dict[str, Any]] = None


class VrfIsisSummary(BaseModel):
    """IS-IS summary within a VRF."""
    configured: bool = False
    net: Optional[str] = None
    interfaces: List[str] = []
    redistribute_ipv4: List[str] = []
    redistribute_ipv6: List[str] = []
    raw_config: Optional[Dict[str, Any]] = None


class VrfBgpNetwork(BaseModel):
    """BGP network within an address family."""
    prefix: str
    route_map: Optional[str] = None
    backdoor: bool = False


class VrfBgpAddressFamily(BaseModel):
    """BGP address family within a VRF."""
    afi: str
    networks: List[VrfBgpNetwork] = []


class VrfBgpSummary(BaseModel):
    """BGP summary within a VRF."""
    configured: bool = False
    system_as: Optional[int] = None
    router_id: Optional[str] = None
    neighbors: List[str] = []
    peer_groups: List[str] = []
    address_families: List[VrfBgpAddressFamily] = []
    raw_config: Optional[Dict[str, Any]] = None


# ============================================================================
# Pydantic Models — DHCP / DHCPv6 Summaries
# ============================================================================


class VrfDhcpSubnetSummary(BaseModel):
    """DHCP subnet summary."""
    prefix: str
    default_router: Optional[str] = None
    ranges: int = 0
    static_mappings: int = 0


class VrfDhcpNetworkSummary(BaseModel):
    """DHCP shared network summary."""
    name: str
    description: Optional[str] = None
    disabled: bool = False
    subnets: List[VrfDhcpSubnetSummary] = []


class VrfDhcpConfig(BaseModel):
    """DHCP server configuration within a VRF."""
    configured: bool = False
    disabled: bool = False
    shared_networks: List[VrfDhcpNetworkSummary] = []
    raw_config: Optional[Dict[str, Any]] = None


class VrfDhcpv6SubnetSummary(BaseModel):
    """DHCPv6 subnet summary."""
    prefix: str
    ranges: int = 0
    static_mappings: int = 0


class VrfDhcpv6NetworkSummary(BaseModel):
    """DHCPv6 shared network summary."""
    name: str
    description: Optional[str] = None
    disabled: bool = False
    subnets: List[VrfDhcpv6SubnetSummary] = []


class VrfDhcpv6Config(BaseModel):
    """DHCPv6 server configuration within a VRF."""
    configured: bool = False
    disabled: bool = False
    shared_networks: List[VrfDhcpv6NetworkSummary] = []
    raw_config: Optional[Dict[str, Any]] = None


# ============================================================================
# Pydantic Models — VRF Instance (extended)
# ============================================================================


class VrfInstance(BaseModel):
    """VRF instance configuration."""
    name: str
    description: Optional[str] = None
    disabled: bool = False
    table: Optional[int] = None
    vni: Optional[int] = None
    ip: VrfIpSettings = VrfIpSettings()
    ipv6: VrfIpSettings = VrfIpSettings()
    protocols: List[str] = []
    services: List[str] = []
    static: Optional[VrfStaticConfig] = None
    rpki: Optional[VrfRpkiConfig] = None
    failover: Optional[VrfFailoverConfig] = None
    ospf: Optional[VrfOspfSummary] = None
    ospfv3: Optional[VrfOspfv3Summary] = None
    isis: Optional[VrfIsisSummary] = None
    bgp: Optional[VrfBgpSummary] = None
    dhcp: Optional[VrfDhcpConfig] = None
    dhcpv6: Optional[VrfDhcpv6Config] = None


class VrfConfig(BaseModel):
    """Complete VRF configuration."""
    bind_to_all: bool = False
    instances: List[VrfInstance] = []


class VrfBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class VrfBatchRequest(BaseModel):
    """Model for batch configuration."""
    operations: List[VrfBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_vrf_capabilities(request: Request):
    """Get VRF feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.VRF)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = VrfBatchBuilder(version=version)
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


@router.get("/config", response_model=VrfConfig)
async def get_vrf_config(http_request: Request, refresh: bool = False):
    """Get all VRF configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.VRF)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("vrf", service.get_version())
        return VrfConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def vrf_batch_configure(http_request: Request, body: VrfBatchRequest):
    """Execute a batch of VRF configuration operations."""
    await require_write_permission(http_request, FeatureGroup.VRF)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = VrfBatchBuilder(version=version)

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
    except HTTPException:
        raise
    except ValueError as e:
        # The mapper rejects a node this device version does not have.
        raise HTTPException(status_code=400, detail=str(e))
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")

    try:
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "VRF configuration updated"},
            error=response.error if response.error else None
        )
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
