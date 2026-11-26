"""PIMv6 Router.

API endpoints for managing VyOS PIMv6 (Protocol Independent Multicast for
IPv6) configuration. PIMv6 is identical between VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.pim6 import Pim6Mapper
from vyos_builders.pim6 import Pim6BatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import logging
from batch_dispatch import call_comma_batch_op

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
    configured: bool = False
    interfaces: List[Pim6Interface] = []
    join_prune_interval: Optional[int] = None
    keep_alive_timer: Optional[int] = None
    packets: Optional[int] = None
    register_suppress_time: Optional[int] = None
    rp: Optional[Pim6Rp] = None


class Pim6BatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Comma-separated arguments")


class Pim6BatchRequest(BaseModel):
    operations: List[Pim6BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_pim6_capabilities(request: Request):
    """Return PIMv6 feature capabilities; they are the same on every VyOS version."""
    await require_read_permission(request, FeatureGroup.PIM6)

    try:
        service = get_session_vyos_service(request)
        builder = Pim6BatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_pim6_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=Pim6Config)
async def get_pim6_config(http_request: Request, refresh: bool = False):
    """Return the full PIMv6 configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.PIM6)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = cast(Pim6Mapper, CommandMapperRegistry.get_mapper("pim6", service.get_version()))
        return Pim6Config(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_pim6_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def pim6_batch_configure(http_request: Request, body: Pim6BatchRequest):
    """Execute a batch of PIMv6 configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.PIM6)

    try:
        service = get_session_vyos_service(http_request)
        builder = Pim6BatchBuilder(version=service.get_version())

        try:
            for operation in body.operations:
                call_comma_batch_op(builder, operation.op, operation.value)
        except ValueError as exc:
            # The builder raises ValueError for a value the lab would reject.
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "PIMv6 configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in pim6_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
