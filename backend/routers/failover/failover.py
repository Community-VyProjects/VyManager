"""
Failover Routing Router

API endpoints for managing VyOS failover route configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.

VyOS 1.4: next-hop only, check/target is multi-value (flat IP list)
VyOS 1.5: next-hop + dhcp-interface, check/target is tag node with interface/vrf
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.failover import FailoverBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/failover", tags=["failover"])


# ============================================================================
# Pydantic Models
# ============================================================================


class FailoverCheckTarget(BaseModel):
    """Health check target configuration."""
    address: str
    interface: Optional[str] = None  # 1.5 only
    vrf: Optional[str] = None  # 1.5 only


class FailoverCheck(BaseModel):
    """Health check configuration for a next-hop or dhcp-interface."""
    policy: Optional[str] = None  # all-pass, any-pass
    port: Optional[int] = None
    targets: List[FailoverCheckTarget] = []
    timeout: Optional[int] = None
    type: Optional[str] = None  # arp, icmp, tcp, none


class FailoverNextHop(BaseModel):
    """Failover next-hop configuration."""
    address: str
    check: FailoverCheck = FailoverCheck()
    interface: Optional[str] = None
    metric: Optional[int] = None
    onlink: bool = False


class FailoverDhcpInterface(BaseModel):
    """Failover DHCP interface configuration (1.5 only)."""
    name: str
    check: FailoverCheck = FailoverCheck()
    interface: Optional[str] = None
    metric: Optional[int] = None
    onlink: bool = False


class FailoverRoute(BaseModel):
    """Failover route configuration."""
    destination: str
    next_hops: List[FailoverNextHop] = []
    dhcp_interfaces: List[FailoverDhcpInterface] = []  # 1.5 only


class FailoverConfig(BaseModel):
    """Complete failover configuration."""
    routes: List[FailoverRoute] = []


class FailoverBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class FailoverBatchRequest(BaseModel):
    """Model for batch configuration."""
    destination: str = Field(..., description="Route destination (CIDR)")
    next_hop: Optional[str] = Field(None, description="Next-hop IP address")
    dhcp_interface: Optional[str] = Field(None, description="DHCP interface name (1.5 only)")
    operations: List[FailoverBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_failover_capabilities(request: Request):
    """Get failover feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.FAILOVER)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = FailoverBatchBuilder(version=version)
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


@router.get("/config", response_model=FailoverConfig)
async def get_failover_config(http_request: Request, refresh: bool = False):
    """Get all failover configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.FAILOVER)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        is_1_5 = "1.5" in version or "latest" in version
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        failover_config = full_config.get("protocols", {}).get("failover", {})

        if not failover_config:
            return FailoverConfig()

        routes = parse_routes(failover_config.get("route", {}), is_1_5)
        return FailoverConfig(routes=routes)
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def parse_check_targets(check_config: dict, is_1_5: bool) -> List[FailoverCheckTarget]:
    """Parse health check targets from config."""
    target_raw = check_config.get("target", {})
    if not target_raw:
        return []

    targets = []

    if is_1_5:
        # 1.5: target is a tag node dict {addr: {interface: ..., vrf: ...}}
        if isinstance(target_raw, dict):
            for addr, props in target_raw.items():
                if props is None:
                    props = {}
                targets.append(FailoverCheckTarget(
                    address=addr,
                    interface=props.get("interface") if isinstance(props, dict) else None,
                    vrf=props.get("vrf") if isinstance(props, dict) else None,
                ))
        elif isinstance(target_raw, list):
            for addr in target_raw:
                targets.append(FailoverCheckTarget(address=addr))
    else:
        # 1.4: target is a multi-value (list of IPs or single string)
        if isinstance(target_raw, list):
            for addr in target_raw:
                targets.append(FailoverCheckTarget(address=addr))
        elif isinstance(target_raw, str):
            targets.append(FailoverCheckTarget(address=target_raw))

    return targets


def parse_check(check_config: dict, is_1_5: bool) -> FailoverCheck:
    """Parse health check configuration."""
    if not check_config:
        return FailoverCheck()

    return FailoverCheck(
        policy=check_config.get("policy"),
        port=int(check_config["port"]) if check_config.get("port") else None,
        targets=parse_check_targets(check_config, is_1_5),
        timeout=int(check_config["timeout"]) if check_config.get("timeout") else None,
        type=check_config.get("type"),
    )


def parse_next_hops(route_config: dict, is_1_5: bool) -> List[FailoverNextHop]:
    """Parse next-hop configurations for a route."""
    next_hops_raw = route_config.get("next-hop", {})
    if not next_hops_raw:
        return []

    next_hops = []
    for nh_addr, nh_config in next_hops_raw.items():
        if nh_config is None:
            nh_config = {}

        next_hops.append(FailoverNextHop(
            address=nh_addr,
            check=parse_check(nh_config.get("check", {}), is_1_5),
            interface=nh_config.get("interface"),
            metric=int(nh_config["metric"]) if nh_config.get("metric") else None,
            onlink="onlink" in nh_config,
        ))

    return next_hops


def parse_dhcp_interfaces(route_config: dict, is_1_5: bool) -> List[FailoverDhcpInterface]:
    """Parse DHCP interface configurations for a route (1.5 only)."""
    if not is_1_5:
        return []

    dhcp_raw = route_config.get("dhcp-interface", {})
    if not dhcp_raw:
        return []

    dhcp_interfaces = []
    for iface_name, iface_config in dhcp_raw.items():
        if iface_config is None:
            iface_config = {}

        dhcp_interfaces.append(FailoverDhcpInterface(
            name=iface_name,
            check=parse_check(iface_config.get("check", {}), is_1_5),
            interface=iface_config.get("interface"),
            metric=int(iface_config["metric"]) if iface_config.get("metric") else None,
            onlink="onlink" in iface_config,
        ))

    return dhcp_interfaces


def parse_routes(routes_raw: dict, is_1_5: bool) -> List[FailoverRoute]:
    """Parse failover route configurations."""
    routes = []

    for dest, route_config in routes_raw.items():
        if route_config is None:
            route_config = {}

        routes.append(FailoverRoute(
            destination=dest,
            next_hops=parse_next_hops(route_config, is_1_5),
            dhcp_interfaces=parse_dhcp_interfaces(route_config, is_1_5),
        ))

    return routes


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def failover_batch_configure(http_request: Request, body: FailoverBatchRequest):
    """Execute a batch of failover configuration operations."""
    await require_write_permission(http_request, FeatureGroup.FAILOVER)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = FailoverBatchBuilder(version=version)

        for operation in body.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments dynamically based on parameter names
            args = []

            if "destination" in params:
                args.append(body.destination)

            if "next_hop" in params and body.next_hop:
                args.append(body.next_hop)

            if "dhcp_interface" in params and body.dhcp_interface:
                args.append(body.dhcp_interface)

            # Add operation value if provided
            if operation.value and len(params) > len(args):
                # Handle comma-separated values for multi-parameter operations
                values = operation.value.split(",") if "," in operation.value else [operation.value]
                remaining_params = params[len(args):]
                for i, param in enumerate(remaining_params):
                    if param != "self" and i < len(values):
                        args.append(values[i])

            method(*args)

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Failover configuration updated"},
            error=response.error if response.error else None
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
