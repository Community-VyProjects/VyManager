"""
NDP Proxy Router

API endpoints for managing VyOS NDP proxy configuration.
No version differences between VyOS 1.4 and 1.5.

Config tree:
  service ndp-proxy/
    route-refresh          (10000-120000 ms, default 30000)
    interface/<IFACE>/
      disable
      enable-router-bit
      timeout              (500-120000 ms, default 500)
      ttl                  (10000-120000 ms, default 30000)
      prefix/<PREFIX>/
        disable
        mode               (static|auto|interface, default static)
        interface          (iface name, required for interface mode)
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.ndp_proxy import NdpProxyBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/ndp-proxy", tags=["ndp-proxy"])

_INTERNAL_BUILDER_METHODS = {
    "add_set", "add_delete", "get_operations", "is_empty", "get_capabilities",
}


# ============================================================================
# Pydantic Models
# ============================================================================


class NdpProxyPrefix(BaseModel):
    """NDP proxy prefix configuration."""
    prefix: str
    disabled: bool = False
    mode: Optional[str] = None        # static | auto | interface
    interface: Optional[str] = None   # forwarding interface (interface mode only)


class NdpProxyInterface(BaseModel):
    """NDP proxy listener interface configuration."""
    name: str
    disabled: bool = False
    enable_router_bit: bool = False
    timeout: Optional[int] = None     # ms, 500-120000, default 500
    ttl: Optional[int] = None         # ms, 10000-120000, default 30000
    prefixes: List[NdpProxyPrefix] = []


class NdpProxyConfig(BaseModel):
    """Complete NDP proxy configuration."""
    route_refresh: Optional[int] = None   # ms, 10000-120000, default 30000
    interfaces: List[NdpProxyInterface] = []


class NdpProxyBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Comma-separated args beyond the first two positional")


class NdpProxyBatchGroup(BaseModel):
    """Operations scoped to a single interface + optional prefix."""
    interface: Optional[str] = Field(None, description="Listener interface name")
    prefix: Optional[str] = Field(None, description="IPv6 prefix (for prefix-level ops)")
    operations: List[NdpProxyBatchOperation]


class NdpProxyBatchRequest(BaseModel):
    """Batch configuration request. All groups are committed atomically."""
    groups: List[NdpProxyBatchGroup]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_ndp_proxy_capabilities(request: Request):
    """Get NDP proxy feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.NDP_PROXY)

    try:
        service = get_session_vyos_service(request)
        builder = NdpProxyBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except Exception:
        logger.exception("Unhandled error in get_ndp_proxy_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=NdpProxyConfig)
async def get_ndp_proxy_config(http_request: Request, refresh: bool = False):
    """Get all NDP proxy configuration from VyOS in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.NDP_PROXY)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        ndp_config = full_config.get("service", {}).get("ndp-proxy", {})

        if not ndp_config:
            return NdpProxyConfig()

        route_refresh_raw = ndp_config.get("route-refresh")
        route_refresh = int(route_refresh_raw) if route_refresh_raw is not None else None

        return NdpProxyConfig(
            route_refresh=route_refresh,
            interfaces=_parse_interfaces(ndp_config.get("interface", {})),
        )
    except Exception:
        logger.exception("Unhandled error in get_ndp_proxy_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def _parse_prefixes(prefixes_raw: dict) -> List[NdpProxyPrefix]:
    if not prefixes_raw:
        return []

    prefixes = []
    for prefix_val, prefix_cfg in prefixes_raw.items():
        if prefix_cfg is None:
            prefix_cfg = {}
        prefixes.append(NdpProxyPrefix(
            prefix=prefix_val,
            disabled="disable" in prefix_cfg,
            mode=prefix_cfg.get("mode"),
            interface=prefix_cfg.get("interface"),
        ))
    return prefixes


def _parse_interfaces(interfaces_raw: dict) -> List[NdpProxyInterface]:
    if not interfaces_raw:
        return []

    interfaces = []
    for iface_name, iface_cfg in interfaces_raw.items():
        if iface_cfg is None:
            iface_cfg = {}

        timeout_raw = iface_cfg.get("timeout")
        ttl_raw = iface_cfg.get("ttl")

        interfaces.append(NdpProxyInterface(
            name=iface_name,
            disabled="disable" in iface_cfg,
            enable_router_bit="enable-router-bit" in iface_cfg,
            timeout=int(timeout_raw) if timeout_raw is not None else None,
            ttl=int(ttl_raw) if ttl_raw is not None else None,
            prefixes=_parse_prefixes(iface_cfg.get("prefix", {})),
        ))
    return interfaces


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def ndp_proxy_batch_configure(http_request: Request, body: NdpProxyBatchRequest):
    """Execute a batch of NDP proxy configuration operations atomically.

    Each group may carry an interface and/or prefix context.  The dispatcher
    injects those as the first positional arguments when the builder method
    signature requires them, then appends any extra comma-separated values.
    """
    await require_write_permission(http_request, FeatureGroup.NDP_PROXY)

    try:
        service = get_session_vyos_service(http_request)
        builder = NdpProxyBatchBuilder(version=service.get_version())

        for group in body.groups:
            for operation in group.operations:
                if operation.op in _INTERNAL_BUILDER_METHODS or operation.op.startswith("_"):
                    raise HTTPException(status_code=400, detail=f"Invalid operation: {operation.op}")

                method = getattr(builder, operation.op)
                sig = inspect.signature(method)
                params = [p for p in sig.parameters.keys() if p != "self"]

                args: List[str] = []

                # Inject context args in order if the signature expects them
                if "interface" in params and group.interface:
                    args.append(group.interface)
                if "prefix" in params and group.prefix:
                    args.append(group.prefix)

                # Append extra value args (comma-separated)
                if operation.value and len(params) > len(args):
                    args.extend(operation.value.split(","))

                method(*args)

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "NDP proxy configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception:
        logger.exception("Unhandled error in ndp_proxy_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
