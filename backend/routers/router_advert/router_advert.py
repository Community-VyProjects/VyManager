"""
Router Advertisement Router

API endpoints for managing VyOS Router Advertisement (RA / radvd) configuration.

Config tree:
  service router-advert
    interface <iface>
      auto-ignore <prefix>          (multi)
      captive-portal <url>          (1.5 only)
      default-lifetime <0|4-9000>
      default-preference <low|medium|high>
      dnssl <domain>                (multi)
      hop-limit <0-255>
      interval
        max <4-1800>
        min <3-1350>
      link-mtu <1280-9000>
      managed-flag
      name-server <ipv6>            (multi)
      name-server-lifetime <0|1-7200>
      nat64prefix <prefix>
        valid-lifetime <4-65528|infinity>
      no-send-advert
      no-send-interval
      other-config-flag
      prefix <prefix>
        base-interface <iface>      (1.5 only)
        decrement-lifetime
        deprecate-prefix
        no-autonomous-flag
        no-on-link-flag
        preferred-lifetime <u32|infinity>
        valid-lifetime <u32|infinity>
      reachable-time <0|1-3600000>
      retrans-timer <0|1-4294967295>
      route <route>
        no-remove-route
        route-preference <low|medium|high>
        valid-lifetime <u32|infinity>
      source-address <ipv6>         (multi)
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders.router_advert import RouterAdvertBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/router-advert", tags=["router-advert"])


# ============================================================================
# Pydantic Models
# ============================================================================


class RAPrefix(BaseModel):
    prefix: str
    base_interface: Optional[str] = None
    decrement_lifetime: bool = False
    deprecate_prefix: bool = False
    no_autonomous_flag: bool = False
    no_on_link_flag: bool = False
    preferred_lifetime: Optional[str] = None
    valid_lifetime: Optional[str] = None


class NAT64Prefix(BaseModel):
    prefix: str
    valid_lifetime: Optional[str] = None


class RARoute(BaseModel):
    route: str
    no_remove_route: bool = False
    route_preference: Optional[str] = None
    valid_lifetime: Optional[str] = None


class RouterAdvertInterface(BaseModel):
    name: str
    auto_ignore: List[str] = []
    captive_portal: Optional[str] = None
    default_lifetime: Optional[str] = None
    default_preference: Optional[str] = None
    dnssl: List[str] = []
    hop_limit: Optional[int] = None
    interval_max: Optional[int] = None
    interval_min: Optional[int] = None
    link_mtu: Optional[int] = None
    managed_flag: bool = False
    name_server: List[str] = []
    name_server_lifetime: Optional[int] = None
    nat64_prefixes: List[NAT64Prefix] = []
    no_send_advert: bool = False
    no_send_interval: bool = False
    other_config_flag: bool = False
    prefixes: List[RAPrefix] = []
    reachable_time: Optional[int] = None
    retrans_timer: Optional[int] = None
    routes: List[RARoute] = []
    source_address: List[str] = []


class RouterAdvertConfig(BaseModel):
    interfaces: List[RouterAdvertInterface] = []


class RouterAdvertBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Comma-separated extra args beyond interface/prefix/nat64prefix/route context")


class RouterAdvertBatchGroup(BaseModel):
    interface: Optional[str] = Field(None, description="RA listener interface name")
    prefix: Optional[str] = Field(None, description="RA IPv6 prefix (for prefix-level ops)")
    nat64prefix: Optional[str] = Field(None, description="NAT64 IPv6 prefix (for nat64prefix-level ops)")
    route: Optional[str] = Field(None, description="IPv6 route (for route-level ops)")
    operations: List[RouterAdvertBatchOperation]


class RouterAdvertBatchRequest(BaseModel):
    groups: List[RouterAdvertBatchGroup]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_router_advert_capabilities(request: Request):
    await require_read_permission(request, FeatureGroup.ROUTER_ADVERT)
    try:
        service = get_session_vyos_service(request)
        builder = RouterAdvertBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except Exception:
        logger.exception("Unhandled error in get_router_advert_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=RouterAdvertConfig)
async def get_router_advert_config(http_request: Request, refresh: bool = False):
    await require_read_permission(http_request, FeatureGroup.ROUTER_ADVERT)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper(
            "router_advert", service.get_version()
        )
        return RouterAdvertConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error in get_router_advert_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def router_advert_batch_configure(http_request: Request, body: RouterAdvertBatchRequest):
    """Execute a batch of router-advert configuration operations atomically.

    Each group carries optional context (interface, prefix, nat64prefix, route).
    The dispatcher injects these as leading positional args when the builder
    method signature expects them, then appends comma-separated extra values.
    """
    await require_write_permission(http_request, FeatureGroup.ROUTER_ADVERT)

    try:
        service = get_session_vyos_service(http_request)
        builder = RouterAdvertBatchBuilder(version=service.get_version())

        for group in body.groups:
            for operation in group.operations:

                method = resolve_batch_method(builder, operation.op)
                sig = inspect.signature(method)
                params = [p for p in sig.parameters.keys() if p != "self"]

                args: List[str] = []

                if "interface" in params and group.interface:
                    args.append(group.interface)
                if "prefix" in params and group.prefix:
                    args.append(group.prefix)
                if "nat64prefix" in params and group.nat64prefix:
                    args.append(group.nat64prefix)
                if "route" in params and group.route:
                    args.append(group.route)

                if operation.value and len(params) > len(args):
                    args.extend(operation.value.split(","))

                method(*args)
    except HTTPException:
        raise
    except ValueError as e:
        # The mapper rejects a node this device version does not have.
        raise HTTPException(status_code=400, detail=str(e))
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception:
        logger.exception("Unhandled error in router_advert_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")

    if builder.is_empty():
        return VyOSResponse(success=True, data={"message": "No operations to execute"})

    try:
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Router advertisement configuration updated"},
            error=response.error if response.error else None,
        )
    except Exception:
        logger.exception("Unhandled error in router_advert_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
