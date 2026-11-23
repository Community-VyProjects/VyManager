"""
BFD Protocol Router

API endpoints for managing VyOS BFD (Bidirectional Forwarding Detection) configuration.
protocols bfd is the same on VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.bfd import BfdMapper
from vyos_builders.bfd import BfdBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from bfd_status import BfdPeerStatus, parse_bfd_peers
from requests.exceptions import RequestException
import logging
from batch_dispatch import call_comma_batch_op
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/bfd", tags=["bfd"])


# ============================================================================
# Pydantic Models
# ============================================================================


class BfdInterval(BaseModel):
    """BFD timer interval settings."""
    echo_interval: Optional[int] = None  # 10-60000 ms
    multiplier: Optional[int] = None  # 2-255 (default: 3)
    receive: Optional[int] = None  # 10-60000 ms (default: 300)
    transmit: Optional[int] = None  # 10-60000 ms (default: 300)


class BfdSource(BaseModel):
    """BFD peer source configuration."""
    address: Optional[str] = None
    interface: Optional[str] = None


class BfdPeer(BaseModel):
    """BFD peer configuration."""
    address: str
    echo_mode: bool = False
    interval: BfdInterval = BfdInterval()
    minimum_ttl: Optional[int] = None  # 1-254
    multihop: bool = False
    passive: bool = False
    profile: Optional[str] = None
    shutdown: bool = False
    source: BfdSource = BfdSource()
    vrf: Optional[str] = None


class BfdProfile(BaseModel):
    """BFD profile configuration."""
    name: str
    echo_mode: bool = False
    interval: BfdInterval = BfdInterval()
    minimum_ttl: Optional[int] = None  # 1-254
    passive: bool = False
    shutdown: bool = False


class BfdConfig(BaseModel):
    """Complete BFD configuration."""
    peers: List[BfdPeer] = []
    profiles: List[BfdProfile] = []


class BfdStatusResponse(BaseModel):
    """Live BFD session status (operational, includes dynamic peers)."""
    peers: List[BfdPeerStatus] = []


class BfdBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated; the last argument keeps any commas."
        ),
    )


class BfdBatchRequest(BaseModel):
    """Model for batch configuration."""
    operations: List[BfdBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_bfd_capabilities(request: Request):
    """Get BFD feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.BFD)

    try:
        service = get_session_vyos_service(request)
        builder = BfdBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=BfdConfig)
async def get_bfd_config(http_request: Request, refresh: bool = False):
    """Get all BFD configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.BFD)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = cast(BfdMapper, CommandMapperRegistry.get_mapper("bfd", service.get_version()))
        return BfdConfig(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint: Operational Status (live / dynamic peers)
# ============================================================================


@router.get("/status", response_model=BfdStatusResponse)
async def get_bfd_status(request: Request):
    """Get live BFD sessions from the op-mode ``show bfd peers`` command.

    Unlike ``/config``, this reflects the running BFD daemon and therefore
    includes ``dynamic`` peers created by routing protocols (BGP/OSPF/IS-IS with
    ``bfd`` enabled) that have no ``protocols bfd peer`` configuration node.
    """
    await require_read_permission(request, FeatureGroup.BFD)

    try:
        service = get_session_vyos_service(request)
        mapper = cast(BfdMapper, CommandMapperRegistry.get_mapper("bfd", service.get_version()))
        try:
            response = await run_in_threadpool(
                service.device.show, path=mapper.get_peers_show_path()
            )
        except RequestException as e:
            logger.warning("BFD status request failed: %s", e)
            raise HTTPException(status_code=502, detail="Failed to fetch BFD status")

        if response.status != 200 or response.error:
            logger.warning(
                "BFD status show failed (status %s): %s", response.status, response.error
            )
            raise HTTPException(status_code=502, detail="Failed to fetch BFD status")

        output = response.result if isinstance(response.result, str) else ""
        return BfdStatusResponse(peers=parse_bfd_peers(output))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def bfd_batch_configure(http_request: Request, body: BfdBatchRequest):
    """Execute a batch of BFD configuration operations."""
    await require_write_permission(http_request, FeatureGroup.BFD)

    try:
        service = get_session_vyos_service(http_request)
        builder = BfdBatchBuilder(version=service.get_version())

        for operation in body.operations:
            call_comma_batch_op(builder, operation.op, operation.value)

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "BFD configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
