"""
PIM Router

API endpoints for managing VyOS PIM (Protocol Independent Multicast) configuration.
No version differences between VyOS 1.4 and 1.5.

Config tree:
  protocols pim/
    ecmp
    ecmp rebalance
    igmp/
      watermark-warning  (1-65535)
    interface/<IFACE>/
      bfd
      bfd profile        (txt)
      dr-priority        (1-4294967295)
      hello              (1-180)
      igmp/
        disable
        join/<GROUP>/
          source-address (multi, ipv4)
        query-interval           (1-1800)
        query-max-response-time  (10-250)
        version                  (2|3)
      no-bsm
      no-unicast-bsm
      passive
      source-address     (ipv4)
    join-prune-interval  (1-65535)
    keep-alive-timer     (1-65535)
    no-v6-secondary
    packets              (1-255)
    register-accept-list/
      prefix-list        (txt)
    register-suppress-time (1-65535)
    rp/
      address/<IP>/
        group            (multi, ipv4net)
      keep-alive-timer   (1-65535)
    spt-switchover/
      infinity-and-beyond
      infinity-and-beyond prefix-list (txt)
    ssm/
      prefix-list        (txt)
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.pim import PimBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method
import vyos_mappers  # noqa: F401  registers CommandMapperRegistry features
from vyos_mappers.base import CommandMapperRegistry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/pim", tags=["pim"])


# ============================================================================
# Pydantic Models
# ============================================================================


class PimIgmpJoin(BaseModel):
    """IGMP join group on an interface."""
    group: str
    source_addresses: List[str] = []


class PimInterfaceIgmp(BaseModel):
    """IGMP settings for a PIM interface."""
    disabled: bool = False
    joins: List[PimIgmpJoin] = []
    query_interval: Optional[int] = None
    query_max_response_time: Optional[int] = None
    version: Optional[int] = None


class PimInterface(BaseModel):
    """PIM interface configuration."""
    name: str
    bfd: bool = False
    bfd_profile: Optional[str] = None
    dr_priority: Optional[int] = None
    hello: Optional[int] = None
    no_bsm: bool = False
    no_unicast_bsm: bool = False
    passive: bool = False
    source_address: Optional[str] = None
    igmp: Optional[PimInterfaceIgmp] = None


class PimRpAddress(BaseModel):
    """Rendezvous Point address configuration."""
    address: str
    groups: List[str] = []


class PimRp(BaseModel):
    """RP configuration."""
    addresses: List[PimRpAddress] = []
    keep_alive_timer: Optional[int] = None


class PimSptSwitchover(BaseModel):
    """SPT switchover configuration."""
    infinity_and_beyond: bool = False
    prefix_list: Optional[str] = None


class PimConfig(BaseModel):
    """Complete PIM configuration."""
    ecmp: bool = False
    ecmp_rebalance: bool = False
    igmp_watermark_warning: Optional[int] = None
    interfaces: List[PimInterface] = []
    join_prune_interval: Optional[int] = None
    keep_alive_timer: Optional[int] = None
    no_v6_secondary: bool = False
    packets: Optional[int] = None
    register_accept_list_prefix_list: Optional[str] = None
    register_suppress_time: Optional[int] = None
    rp: Optional[PimRp] = None
    spt_switchover: Optional[PimSptSwitchover] = None
    ssm_prefix_list: Optional[str] = None


class PimBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class PimBatchGroup(BaseModel):
    """A group of operations scoped to a single interface (or global)."""
    interface: Optional[str] = Field(None, description="Interface name (null for global ops)")
    operations: List[PimBatchOperation]


class PimBatchRequest(BaseModel):
    """Model for batch configuration. Supports multiple groups in a single atomic commit."""
    groups: List[PimBatchGroup]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_pim_capabilities(request: Request):
    """Get PIM feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.PIM)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = PimBatchBuilder(version=version)
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


@router.get("/config", response_model=PimConfig)
async def get_pim_config(http_request: Request, refresh: bool = False):
    """Get all PIM configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.PIM)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("pim", service.get_version())
        return PimConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def pim_batch_configure(http_request: Request, body: PimBatchRequest):
    """Execute a batch of PIM configuration operations.

    Accepts multiple groups, each optionally scoped to a single interface.
    All groups are processed into a single builder and committed atomically.
    """
    await require_write_permission(http_request, FeatureGroup.PIM)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = PimBatchBuilder(version=version)

        for group in body.groups:
            for operation in group.operations:
                method = resolve_batch_method(builder, operation.op)
                sig = inspect.signature(method)
                params = [p for p in sig.parameters.keys() if p != "self"]

                args = []

                if "iface" in params and group.interface:
                    args.append(group.interface)

                if operation.value and len(params) > len(args):
                    args.append(operation.value)

                method(*args)

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "PIM configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
