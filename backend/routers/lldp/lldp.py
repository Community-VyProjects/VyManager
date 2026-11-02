"""LLDP Service Router.

API endpoints for managing VyOS LLDP (Link Layer Discovery Protocol) configuration.

Version differences:
  1.4 — per-interface disable is a presence flag (interface <name> disable)
  1.5 — per-interface mode supports: disable, rx-tx (default), rx, tx

Endpoints:
  GET  /vyos/lldp/capabilities  — version-aware feature flags
  GET  /vyos/lldp/config        — normalized LLDP configuration
  POST /vyos/lldp/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers import CommandMapperRegistry
from vyos_builders.lldp import LLDPBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/lldp", tags=["lldp"])


# ============================================================================
# Pydantic Models
# ============================================================================


class LLDPLocationCoordinate(BaseModel):
    """Coordinate-based LLDP-MED location."""
    altitude: Optional[str] = None
    datum: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None


class LLDPLocation(BaseModel):
    """LLDP-MED location data for an interface."""
    coordinate_based: Optional[LLDPLocationCoordinate] = None
    elin: Optional[str] = None


class LLDPInterface(BaseModel):
    """Per-interface LLDP configuration."""
    name: str
    mode: str = "rx-tx"
    disabled: bool = False
    location: Optional[LLDPLocation] = None


class LLDPLegacyProtocols(BaseModel):
    """Legacy vendor-specific discovery protocol flags."""
    cdp: bool = False
    edp: bool = False
    fdp: bool = False
    sonmp: bool = False


class LLDPConfig(BaseModel):
    """Full LLDP service configuration."""
    management_addresses: List[str] = []
    snmp_enabled: bool = False
    legacy_protocols: LLDPLegacyProtocols = Field(default_factory=LLDPLegacyProtocols)
    interfaces: List[LLDPInterface] = []


class LLDPBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'eth0,rx-tx')."
        ),
    )


class LLDPBatchRequest(BaseModel):
    operations: List[LLDPBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_lldp_capabilities(request: Request):
    """Return LLDP feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.LLDP)
    try:
        service = get_session_vyos_service(request)
        builder = LLDPBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_lldp_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=LLDPConfig)
async def get_lldp_config(http_request: Request, refresh: bool = False):
    """Return the full LLDP configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.LLDP)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("lldp", version)
        return LLDPConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error in get_lldp_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def lldp_batch_configure(http_request: Request, body: LLDPBatchRequest):
    """Execute a batch of LLDP configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.LLDP)
    try:
        service = get_session_vyos_service(http_request)
        builder = LLDPBatchBuilder(version=service.get_version())

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
            data={"message": "LLDP configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in lldp_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
