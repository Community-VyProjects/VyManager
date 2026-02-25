"""
IGMP Proxy Router

API endpoints for managing VyOS IGMP proxy configuration.
No version differences between VyOS 1.4 and 1.5.

Config tree:
  protocols igmp-proxy/
    disable
    disable-quickleave
    interface/<IFACE>/
      role           (upstream|downstream|disabled)
      threshold      (1-255)
      alt-subnet     (multi-value, IPv4 prefix)
      whitelist      (multi-value, IPv4 prefix)
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.igmp_proxy import IgmpProxyBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/igmp-proxy", tags=["igmp-proxy"])


# ============================================================================
# Pydantic Models
# ============================================================================


class IgmpProxyInterface(BaseModel):
    """IGMP proxy interface configuration."""
    name: str
    role: Optional[str] = None  # upstream, downstream, disabled
    threshold: Optional[int] = None  # 1-255
    alt_subnets: List[str] = []  # IPv4 prefixes
    whitelists: List[str] = []  # IPv4 prefixes


class IgmpProxyConfig(BaseModel):
    """Complete IGMP proxy configuration."""
    disabled: bool = False
    disable_quickleave: bool = False
    interfaces: List[IgmpProxyInterface] = []


class IgmpProxyBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class IgmpProxyBatchGroup(BaseModel):
    """A group of operations scoped to a single interface (or global)."""
    interface: Optional[str] = Field(None, description="Interface name")
    operations: List[IgmpProxyBatchOperation]


class IgmpProxyBatchRequest(BaseModel):
    """Model for batch configuration. Supports multiple interface groups in a single atomic commit."""
    groups: List[IgmpProxyBatchGroup]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_igmp_proxy_capabilities(request: Request):
    """Get IGMP proxy feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.IGMP_PROXY)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = IgmpProxyBatchBuilder(version=version)
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


@router.get("/config", response_model=IgmpProxyConfig)
async def get_igmp_proxy_config(http_request: Request, refresh: bool = False):
    """Get all IGMP proxy configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.IGMP_PROXY)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        igmp_config = full_config.get("protocols", {}).get("igmp-proxy", {})

        if not igmp_config:
            return IgmpProxyConfig()

        return IgmpProxyConfig(
            disabled="disable" in igmp_config,
            disable_quickleave="disable-quickleave" in igmp_config,
            interfaces=parse_interfaces(igmp_config.get("interface", {})),
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def _ensure_list(value: Any) -> List[str]:
    """Convert VyOS config value to a list. Single values come as strings, multiple as lists."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value]
    return []


def parse_interfaces(interfaces_raw: dict) -> List[IgmpProxyInterface]:
    """Parse IGMP proxy interface configurations."""
    if not interfaces_raw:
        return []

    interfaces = []
    for iface_name, iface_config in interfaces_raw.items():
        if iface_config is None:
            iface_config = {}

        interfaces.append(IgmpProxyInterface(
            name=iface_name,
            role=iface_config.get("role"),
            threshold=int(iface_config["threshold"]) if iface_config.get("threshold") else None,
            alt_subnets=_ensure_list(iface_config.get("alt-subnet")),
            whitelists=_ensure_list(iface_config.get("whitelist")),
        ))

    return interfaces


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def igmp_proxy_batch_configure(http_request: Request, body: IgmpProxyBatchRequest):
    """Execute a batch of IGMP proxy configuration operations.

    Accepts multiple groups, each scoped to a single interface (or global).
    All groups are processed into a single builder and committed atomically.
    This allows setting up upstream + downstream interfaces in one commit.
    """
    await require_write_permission(http_request, FeatureGroup.IGMP_PROXY)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = IgmpProxyBatchBuilder(version=version)

        for group in body.groups:
            for operation in group.operations:
                method = getattr(builder, operation.op)
                sig = inspect.signature(method)
                params = [p for p in sig.parameters.keys() if p != "self"]

                # Build arguments dynamically based on parameter names
                args = []

                if "interface" in params and group.interface:
                    args.append(group.interface)

                # Add operation value if provided
                if operation.value and len(params) > len(args):
                    args.append(operation.value)

                method(*args)

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "IGMP proxy configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
