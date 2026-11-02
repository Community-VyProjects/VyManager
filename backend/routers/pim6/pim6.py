"""
PIMv6 Router

API endpoints for managing VyOS PIMv6 (Protocol Independent Multicast for IPv6)
configuration.

No version differences between VyOS 1.4 and 1.5.

Config tree:
  protocols pim6/
    interface/<IFACE>/
      dr-priority        (1-4294967295)
      hello              (1-180)
      mld/
        disable
        interval                     (1-65535)
        join/<GROUP (ipv6)>/
          source                     (multi, ipv6)
        last-member-query-count      (1-255)
        last-member-query-interval   (100-6553500 ms)
        max-response-time            (100-6553500 ms)
        version                      (1|2, default 2)
      no-bsm
      no-unicast-bsm
      passive
    join-prune-interval  (1-65535)
    keep-alive-timer     (1-65535)
    packets              (1-255)
    register-suppress-time (1-65535)
    rp/
      address/<ADDR (ipv6)>/
        group            (multi, ipv6net)
        prefix-list6     (single, txt)
      keep-alive-timer   (1-65535)
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.pim6 import Pim6BatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method
import vyos_mappers  # noqa: F401  registers CommandMapperRegistry features
from vyos_mappers.base import CommandMapperRegistry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/pim6", tags=["pim6"])

# ============================================================================
# Pydantic Models
# ============================================================================


class Pim6MldJoin(BaseModel):
    """MLD join group on an interface."""
    group: str
    sources: List[str] = []


class Pim6InterfaceMld(BaseModel):
    """MLD settings for a PIMv6 interface."""
    disabled: bool = False
    interval: Optional[int] = None
    last_member_query_count: Optional[int] = None
    last_member_query_interval: Optional[int] = None
    max_response_time: Optional[int] = None
    version: Optional[int] = None
    joins: List[Pim6MldJoin] = []


class Pim6Interface(BaseModel):
    """PIMv6 interface configuration."""
    name: str
    dr_priority: Optional[int] = None
    hello: Optional[int] = None
    no_bsm: bool = False
    no_unicast_bsm: bool = False
    passive: bool = False
    mld: Optional[Pim6InterfaceMld] = None


class Pim6RpAddress(BaseModel):
    """Rendezvous Point address configuration."""
    address: str
    groups: List[str] = []
    prefix_list6: Optional[str] = None


class Pim6Rp(BaseModel):
    """RP configuration."""
    addresses: List[Pim6RpAddress] = []
    keep_alive_timer: Optional[int] = None


class Pim6Config(BaseModel):
    """Complete PIMv6 configuration."""
    interfaces: List[Pim6Interface] = []
    join_prune_interval: Optional[int] = None
    keep_alive_timer: Optional[int] = None
    packets: Optional[int] = None
    register_suppress_time: Optional[int] = None
    rp: Optional[Pim6Rp] = None


class Pim6BatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class Pim6BatchGroup(BaseModel):
    """A group of operations scoped to a single interface (or global)."""
    interface: Optional[str] = Field(None, description="Interface name (null for global ops)")
    operations: List[Pim6BatchOperation]


class Pim6BatchRequest(BaseModel):
    """Model for batch configuration. Supports multiple groups in a single atomic commit."""
    groups: List[Pim6BatchGroup]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_pim6_capabilities(request: Request):
    """Get PIMv6 feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.PIM6)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = Pim6BatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=Pim6Config)
async def get_pim6_config(http_request: Request, refresh: bool = False):
    """Get all PIMv6 configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.PIM6)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("pim6", service.get_version())
        return Pim6Config(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def pim6_batch_configure(http_request: Request, body: Pim6BatchRequest):
    """Execute a batch of PIMv6 configuration operations.

    Accepts multiple groups, each optionally scoped to a single interface.
    All groups are processed into a single builder and committed atomically.
    """
    await require_write_permission(http_request, FeatureGroup.PIM6)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = Pim6BatchBuilder(version=version)

        for group in body.groups:
            for operation in group.operations:
                method = resolve_batch_method(builder, operation.op)

                sig = inspect.signature(method)
                params = [p for p in sig.parameters.keys() if p != "self"]

                args: List[str] = []

                if "iface" in params and group.interface:
                    args.append(group.interface)

                if operation.value is not None and len(params) > len(args):
                    args.append(operation.value)

                method(*args)

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "PIMv6 configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
