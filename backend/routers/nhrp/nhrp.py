"""
NHRP Protocol Router

API endpoints for managing VyOS NHRP (Next Hop Resolution Protocol) configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5, which have significant
structural differences in NHRP templates.

Endpoints:
  GET  /vyos/nhrp/capabilities  — version-aware feature flags
  GET  /vyos/nhrp/config        — normalized NHRP configuration
  POST /vyos/nhrp/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders.nhrp import NhrpBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/nhrp", tags=["nhrp"])


# ============================================================================
# Pydantic Models
# ============================================================================


class NhrpMapEntry(BaseModel):
    """A static NHRP map entry (tunnel-IP to NBMA mapping)."""
    tunnel_ip: str
    nbma_address: Optional[str] = None
    cisco: bool = False          # VyOS 1.4 only
    register_flag: bool = Field(default=False, alias="register")  # VyOS 1.4 only


class NhrpDynamicMap(BaseModel):
    """A dynamic map entry (VyOS 1.4 only)."""
    network: str
    nbma_domain_name: Optional[str] = None


class NhrpNhsEntry(BaseModel):
    """An NHS (Next Hop Server) entry (VyOS 1.5 only)."""
    tunnel_ip: str
    nbma_addresses: List[str] = []


class NhrpShortcutTarget(BaseModel):
    """A shortcut target entry (VyOS 1.4 only)."""
    target: str
    holding_time: Optional[str] = None


class NhrpTunnel(BaseModel):
    """Complete NHRP tunnel configuration (version-normalized)."""
    name: str
    authentication: Optional[str] = None
    holding_time: Optional[str] = None
    maps: List[NhrpMapEntry] = []
    dynamic_maps: List[NhrpDynamicMap] = []        # VyOS 1.4 only
    nhs_entries: List[NhrpNhsEntry] = []           # VyOS 1.5 only
    multicast: List[str] = []
    mtu: Optional[str] = None                       # VyOS 1.5 only
    network_id: Optional[str] = None                # VyOS 1.5 only
    redirect: bool = False
    registration_no_unique: bool = False             # VyOS 1.5 only
    shortcut: bool = False
    non_caching: bool = False                        # VyOS 1.4 only
    shortcut_destination: bool = False               # VyOS 1.4 only
    shortcut_targets: List[NhrpShortcutTarget] = []  # VyOS 1.4 only


class NhrpConfig(BaseModel):
    """Complete NHRP configuration."""
    enabled: bool = False
    tunnels: List[NhrpTunnel] = []


class NhrpBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'tun0,10.0.0.1')."
        ),
    )


class NhrpBatchRequest(BaseModel):
    """Batch configuration request."""
    operations: List[NhrpBatchOperation]


class VyOSResponse(BaseModel):
    """Standard VyOS operation response."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_nhrp_capabilities(request: Request):
    """Return NHRP feature capabilities based on the connected VyOS version."""
    await require_read_permission(request, FeatureGroup.NHRP)
    try:
        service = get_session_vyos_service(request)
        builder = NhrpBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=NhrpConfig)
async def get_nhrp_config(http_request: Request, refresh: bool = False):
    """Return the full NHRP configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.NHRP)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("nhrp", service.get_version())
        return NhrpConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def nhrp_batch_configure(http_request: Request, body: NhrpBatchRequest):
    """Execute a batch of NHRP configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.NHRP)
    try:
        service = get_session_vyos_service(http_request)
        builder = NhrpBatchBuilder(version=service.get_version())

        for operation in body.operations:
            method = resolve_batch_method(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1:
                if operation.value is not None:
                    method(operation.value)
                else:
                    method()
            elif len(params) >= 2:
                if operation.value and "," in operation.value:
                    parts = operation.value.split(",", len(params) - 1)
                    method(*parts)
                elif operation.value:
                    method(operation.value)

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "NHRP configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
