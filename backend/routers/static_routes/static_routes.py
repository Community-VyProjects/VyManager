"""
Static Routes Router

API endpoints for ``protocols static``: routes, routing tables, the
route-map, static ARP, multicast routes and neighbor proxy.
"""

import logging
from typing import Any, Dict, List, Optional, cast

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from batch_dispatch import call_comma_batch_op
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service
from vyos_builders.static_routes import StaticRoutesBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.static_routes.static_routes import StaticRoutesMapper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/static-routes", tags=["static-routes"])


# ============================================================================
# Pydantic Models
# ============================================================================


class BfdSource(BaseModel):
    """BFD multi-hop source of a next-hop (``profile`` exists on 1.4 only)."""
    address: str
    profile: Optional[str] = None


class NextHop(BaseModel):
    """Next-hop of a static route."""
    address: str
    distance: Optional[int] = None
    disable: bool = False
    vrf: Optional[str] = None
    interface: Optional[str] = None
    bfd_enable: bool = False
    bfd_profile: Optional[str] = None
    bfd_multi_hop: bool = False
    bfd_multi_hop_sources: List[BfdSource] = []
    segments: Optional[str] = None


class InterfaceRoute(BaseModel):
    """Interface target of a static route."""
    interface: str
    distance: Optional[int] = None
    disable: bool = False
    vrf: Optional[str] = None
    segments: Optional[str] = None


class StaticRoute(BaseModel):
    """Static route (IPv4 or IPv6). The VRF config reuses this model."""
    destination: str
    description: Optional[str] = None
    next_hops: List[NextHop] = []
    interfaces: List[InterfaceRoute] = []
    blackhole: bool = False
    blackhole_distance: Optional[int] = None
    blackhole_tag: Optional[int] = None
    reject: bool = False
    reject_distance: Optional[int] = None
    reject_tag: Optional[int] = None
    dhcp_interfaces: List[str] = []
    route_type: str = "ipv4"


class RoutingTable(BaseModel):
    """Custom routing table."""
    table_id: int
    description: Optional[str] = None
    ipv4_routes: List[StaticRoute] = []
    ipv6_routes: List[StaticRoute] = []


class ArpEntry(BaseModel):
    """Static ARP entry."""
    ip_address: str
    mac_address: str
    description: Optional[str] = None


class ArpInterface(BaseModel):
    """ARP entries for an interface."""
    interface: str
    entries: List[ArpEntry] = []


class MrouteNextHop(BaseModel):
    """Multicast route next-hop."""
    address: str
    distance: Optional[int] = None
    disable: bool = False


class MrouteInterface(BaseModel):
    """Multicast route interface."""
    interface: str
    distance: Optional[int] = None
    disable: bool = False


class MulticastRoute(BaseModel):
    """Multicast route; ``*_configured`` says the node holding that list exists."""
    prefix: str
    next_hops: List[MrouteNextHop] = []
    interfaces: List[MrouteInterface] = []
    next_hops_configured: bool = False
    interfaces_configured: bool = False


class NeighborProxyArp(BaseModel):
    """Neighbor proxy ARP entry."""
    ip_address: str
    interfaces: List[str] = []


class NeighborProxyNd(BaseModel):
    """Neighbor proxy ND (IPv6) entry."""
    ipv6_address: str
    interfaces: List[str] = []


class NeighborProxy(BaseModel):
    """Neighbor proxy configuration."""
    arp_entries: List[NeighborProxyArp] = []
    nd_entries: List[NeighborProxyNd] = []


class StaticRoutesConfig(BaseModel):
    """Complete static routes configuration."""
    ipv4_routes: List[StaticRoute] = []
    ipv6_routes: List[StaticRoute] = []
    routing_tables: List[RoutingTable] = []
    route_map: Optional[str] = None
    arp_interfaces: List[ArpInterface] = []
    multicast_routes: List[MulticastRoute] = []
    neighbor_proxy: NeighborProxy = NeighborProxy()


class StaticRoutesBatchOperation(BaseModel):
    """One builder op; arguments are comma-separated in ``value``."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Zero-arg methods: omit (a value is rejected). "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated; the last argument keeps any commas."
        ),
    )


class StaticRoutesBatchRequest(BaseModel):
    """Batch of static route operations committed together."""
    operations: List[StaticRoutesBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_static_routes_capabilities(request: Request):
    """Feature flags for the leaves only one VyOS version has."""
    await require_read_permission(request, FeatureGroup.STATIC_ROUTES)

    try:
        service = get_session_vyos_service(request)
        capabilities = StaticRoutesBatchBuilder(version=service.get_version()).get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=StaticRoutesConfig)
async def get_static_routes_config(http_request: Request, refresh: bool = False):
    """Static routes configuration from the device (cached unless ``refresh``)."""
    await require_read_permission(http_request, FeatureGroup.STATIC_ROUTES)

    try:
        service = get_session_vyos_service(http_request)
        mapper = cast(
            StaticRoutesMapper,
            CommandMapperRegistry.get_mapper("static_routes", service.get_version()),
        )
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        return mapper.parse_config(full_config)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def static_routes_batch_configure(http_request: Request, body: StaticRoutesBatchRequest):
    """Execute a batch of static route operations in one commit."""
    await require_write_permission(http_request, FeatureGroup.STATIC_ROUTES)

    try:
        service = get_session_vyos_service(http_request)
        builder = StaticRoutesBatchBuilder(version=service.get_version())

        try:
            for operation in body.operations:
                call_comma_batch_op(builder, operation.op, operation.value)
        except ValueError as e:
            # The mapper raises ValueError for a leaf this version lacks.
            raise HTTPException(status_code=400, detail=str(e))

        response = await run_in_threadpool(service.execute_batch, builder)
        failed = response.status != 200 or bool(response.error)
        return VyOSResponse(
            success=not failed,
            data=None if failed else {"message": "Static routes configuration updated"},
            error=response.error or None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
