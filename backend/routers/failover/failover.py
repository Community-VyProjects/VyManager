"""
Failover Routing Router

API endpoints for managing VyOS failover route configuration. The mapper
decides which nodes this VyOS version has; capabilities report them.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_builders.failover import FailoverBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import logging
from batch_dispatch import call_item_batch_op
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.failover.failover import FailoverMapper
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/failover", tags=["failover"])


# ============================================================================
# Pydantic Models
# ============================================================================


class FailoverCheckTarget(BaseModel):
    """Health check target configuration."""
    address: str
    interface: Optional[str] = None  # tag-node child (1.5)
    vrf: Optional[str] = None  # tag-node child (1.5)


class FailoverCheck(BaseModel):
    """Health check configuration for a next-hop or dhcp-interface."""
    policy: Optional[str] = None  # any-available, all-available
    port: Optional[int] = None
    targets: List[FailoverCheckTarget] = []
    timeout: Optional[int] = None
    type: Optional[str] = None  # arp, icmp, tcp


class FailoverNextHop(BaseModel):
    """Failover next-hop configuration."""
    address: str
    check: FailoverCheck = FailoverCheck()
    interface: Optional[str] = None
    metric: Optional[int] = None
    onlink: bool = False


class FailoverDhcpInterface(BaseModel):
    """Failover DHCP interface configuration (1.5)."""
    name: str
    check: FailoverCheck = FailoverCheck()
    interface: Optional[str] = None
    metric: Optional[int] = None
    onlink: bool = False


class FailoverRoute(BaseModel):
    """Failover route configuration."""
    destination: str
    next_hops: List[FailoverNextHop] = []
    dhcp_interfaces: List[FailoverDhcpInterface] = []


class FailoverConfig(BaseModel):
    """Complete failover configuration."""
    routes: List[FailoverRoute] = []


class FailoverBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description="Parameters after the destination, comma-separated (next-hop or dhcp-interface first)",
    )


class FailoverBatchRequest(BaseModel):
    """Model for batch configuration."""
    destination: str = Field(..., description="Route destination (CIDR)")
    operations: List[FailoverBatchOperation]

    @field_validator("destination")
    @classmethod
    def _destination_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("destination must not be blank")
        return value


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
        builder = FailoverBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in failover capabilities")
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
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = cast(FailoverMapper, CommandMapperRegistry.get_mapper("failover", service.get_version()))
        return FailoverConfig(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in failover config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def failover_batch_configure(http_request: Request, body: FailoverBatchRequest):
    """Execute a batch of failover configuration operations."""
    await require_write_permission(http_request, FeatureGroup.FAILOVER)

    try:
        service = get_session_vyos_service(http_request)
        builder = FailoverBatchBuilder(version=service.get_version())

        try:
            # Every op takes the route destination first; the value fills the
            # remaining parameters, split on "," (test_failover_batch_router
            # locks the arity).
            for operation in body.operations:
                call_item_batch_op(
                    builder, operation.op, body.destination, operation.value, separator=","
                )
        except ValueError as exc:
            # The mapper raises ValueError for a node this VyOS version lacks.
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Failover configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in failover batch")
        raise HTTPException(status_code=500, detail="Internal server error")
