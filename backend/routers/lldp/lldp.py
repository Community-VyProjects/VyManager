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
from vyos_builders.lldp import LLDPBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

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
# Internal builder method denylist
# ============================================================================

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty",
    "get_capabilities", "mappers", "version", "_operations", "m",
})


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
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        lldp_raw = full_config.get("service", {}).get("lldp", {})
        if not lldp_raw:
            return LLDPConfig()

        return LLDPConfig(
            management_addresses=_parse_management_addresses(lldp_raw),
            snmp_enabled="snmp" in lldp_raw,
            legacy_protocols=_parse_legacy_protocols(lldp_raw),
            interfaces=_parse_interfaces(lldp_raw),
        )
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
            if operation.op in _INTERNAL_BUILDER_METHODS or operation.op.startswith("_"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation not allowed: {operation.op}",
                )

            method = getattr(builder, operation.op)
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


# ============================================================================
# Config parsers
# ============================================================================


def _parse_management_addresses(lldp_raw: dict) -> List[str]:
    addr_raw = lldp_raw.get("management-address")
    if addr_raw is None:
        return []
    if isinstance(addr_raw, list):
        return sorted(addr_raw)
    if isinstance(addr_raw, dict):
        return sorted(addr_raw.keys())
    return [str(addr_raw)]


def _parse_legacy_protocols(lldp_raw: dict) -> LLDPLegacyProtocols:
    proto_raw = lldp_raw.get("legacy-protocols", {})
    if not proto_raw or not isinstance(proto_raw, dict):
        return LLDPLegacyProtocols()
    return LLDPLegacyProtocols(
        cdp="cdp" in proto_raw,
        edp="edp" in proto_raw,
        fdp="fdp" in proto_raw,
        sonmp="sonmp" in proto_raw,
    )


def _parse_interfaces(lldp_raw: dict) -> List[LLDPInterface]:
    ifaces_raw = lldp_raw.get("interface", {})
    if not ifaces_raw or not isinstance(ifaces_raw, dict):
        return []

    interfaces = []
    for iface_name, iface_cfg in ifaces_raw.items():
        if iface_cfg is None:
            iface_cfg = {}
        interfaces.append(_parse_interface(iface_name, iface_cfg))

    interfaces.sort(key=lambda i: i.name)
    return interfaces


def _parse_interface(name: str, cfg: dict) -> LLDPInterface:
    # Normalize mode across 1.4 (disable presence flag) and 1.5 (mode node)
    if "mode" in cfg:
        mode = cfg["mode"]
    elif "disable" in cfg:
        mode = "disable"
    else:
        mode = "rx-tx"

    location = _parse_location(cfg.get("location"))

    return LLDPInterface(
        name=name,
        mode=mode,
        disabled=(mode == "disable"),
        location=location,
    )


def _parse_location(loc_raw) -> Optional[LLDPLocation]:
    if not loc_raw or not isinstance(loc_raw, dict):
        return None

    coord_raw = loc_raw.get("coordinate-based")
    coord = None
    if coord_raw and isinstance(coord_raw, dict):
        coord = LLDPLocationCoordinate(
            altitude=coord_raw.get("altitude"),
            datum=coord_raw.get("datum"),
            latitude=coord_raw.get("latitude"),
            longitude=coord_raw.get("longitude"),
        )

    elin_raw = loc_raw.get("elin")
    elin = None
    if elin_raw is not None:
        if isinstance(elin_raw, dict):
            elin = next(iter(elin_raw.keys()), None)
        else:
            elin = str(elin_raw)

    if coord is None and elin is None:
        return None

    return LLDPLocation(coordinate_based=coord, elin=elin)
