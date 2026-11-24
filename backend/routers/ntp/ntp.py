"""NTP Service Router.

API endpoints for managing VyOS NTP (Network Time Protocol) configuration.

Version differences:
  timestamp interface receive-filter exists only on 1.5. The mapper subclass
  owns that path. This router does not branch on the version string.

Endpoints:
  GET  /vyos/ntp/capabilities  — version-aware feature flags
  GET  /vyos/ntp/config        — normalized NTP configuration
  POST /vyos/ntp/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.ntp.ntp import NTPMapper
from vyos_builders.ntp import NTPBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import logging
from batch_dispatch import call_comma_batch_op

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/ntp", tags=["ntp"])


# ============================================================================
# Pydantic Models
# ============================================================================


class NTPServer(BaseModel):
    """A single upstream NTP server and its flags."""
    name: str
    noselect: bool = False
    nts: bool = False
    pool: bool = False
    prefer: bool = False


class NTPTimestampInterface(BaseModel):
    """Per-interface NIC receive timestamp filter (VyOS 1.5+)."""
    interface: str
    receive_filter: str


class NTPConfig(BaseModel):
    """Full NTP service configuration."""
    allow_clients: List[str] = []
    interfaces: List[str] = []
    leap_second: Optional[str] = None
    listen_addresses: List[str] = []
    servers: List[NTPServer] = []
    timestamp_interfaces: List[NTPTimestampInterface] = []
    vrf: Optional[str] = None


class NTPBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Zero-arg methods: omit (a value is rejected). "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'eth0,all'); "
            "the last argument keeps any commas."
        ),
    )


class NTPBatchRequest(BaseModel):
    operations: List[NTPBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_ntp_capabilities(request: Request):
    """Return NTP feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.NTP)
    try:
        service = get_session_vyos_service(request)
        builder = NTPBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_ntp_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=NTPConfig)
async def get_ntp_config(http_request: Request, refresh: bool = False):
    """Return the full NTP configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.NTP)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = cast(NTPMapper, CommandMapperRegistry.get_mapper("ntp", version))
        return NTPConfig(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_ntp_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def ntp_batch_configure(http_request: Request, body: NTPBatchRequest):
    """Execute a batch of NTP configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.NTP)
    try:
        service = get_session_vyos_service(http_request)
        builder = NTPBatchBuilder(version=service.get_version())

        try:
            for operation in body.operations:
                call_comma_batch_op(builder, operation.op, operation.value)
        except ValueError as e:
            # The mapper rejects a timestamp leaf this device version does not have.
            raise HTTPException(status_code=400, detail=str(e))

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "NTP configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        # Includes the 409 execute_batch raises while a commit-confirm is pending.
        raise
    except Exception:
        logger.exception("Unhandled error in ntp_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
