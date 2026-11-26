"""PIM Router.

API endpoints for managing VyOS PIM (Protocol Independent Multicast)
configuration. PIM is identical between VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.pim import PimMapper
from vyos_builders.pim import PimBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import logging
from batch_dispatch import call_comma_batch_op

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
    configured: bool = False
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
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Comma-separated arguments")


class PimBatchRequest(BaseModel):
    operations: List[PimBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_pim_capabilities(request: Request):
    """Return PIM feature capabilities; they are the same on every VyOS version."""
    await require_read_permission(request, FeatureGroup.PIM)

    try:
        service = get_session_vyos_service(request)
        builder = PimBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_pim_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=PimConfig)
async def get_pim_config(http_request: Request, refresh: bool = False):
    """Return the full PIM configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.PIM)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = cast(PimMapper, CommandMapperRegistry.get_mapper("pim", service.get_version()))
        return PimConfig(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_pim_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def pim_batch_configure(http_request: Request, body: PimBatchRequest):
    """Execute a batch of PIM configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.PIM)

    try:
        service = get_session_vyos_service(http_request)
        builder = PimBatchBuilder(version=service.get_version())

        try:
            for operation in body.operations:
                call_comma_batch_op(builder, operation.op, operation.value)
        except ValueError as exc:
            # The builder raises ValueError for a value the lab would reject.
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "PIM configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in pim_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
