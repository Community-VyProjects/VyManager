"""
Firewall Zones Router

API endpoints for managing VyOS firewall zone configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.

VyOS 1.4 vs 1.5 differences:
- Interfaces: 1.4 uses `interface` at zone level; 1.5 uses `member interface` / `member vrf`
- Default firewall: 1.5 adds `default-firewall name/ipv6-name`
"""

from fastapi import APIRouter, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import FirewallZonesBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/firewall/zones", tags=["firewall-zones"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set",
    "add_delete",
    "get_operations",
    "is_empty",
    "clear",
    "operation_count",
    "get_capabilities",
})


# ============================================================================
# Request / Response Models
# ============================================================================

class ZoneBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name matching a builder method")
    value: Optional[str] = Field(None, description="Optional value for the operation")


class ZoneBatchRequest(BaseModel):
    """Batch firewall zone configuration request."""
    zone_name: str = Field(..., description="Zone name (e.g., LAN, WAN, DMZ)")
    operations: List[ZoneBatchOperation] = Field(
        ..., description="List of operations to perform atomically"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "zone_name": "LAN",
                "operations": [
                    {"op": "set_zone"},
                    {"op": "set_zone_description", "value": "Internal LAN zone"},
                    {"op": "set_zone_default_action", "value": "drop"},
                    {"op": "set_zone_interface", "value": "eth1"},
                ],
            }
        }


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Config Parsing Helpers
# ============================================================================

def _parse_zone(zone_name: str, zone_cfg: Dict[str, Any], version: str) -> Dict[str, Any]:
    """
    Parse a single zone config dict from VyOS JSON into a normalized structure.

    Handles the difference between VyOS 1.4 (interface at zone level) and
    VyOS 1.5 (member interface/vrf).
    """
    is_v15 = "1.5" in version

    # Members / interfaces
    interfaces: List[str] = []
    vrfs: List[str] = []

    if is_v15:
        member = zone_cfg.get("member", {})
        raw_ifaces = member.get("interface", [])
        raw_vrfs = member.get("vrf", [])
        interfaces = raw_ifaces if isinstance(raw_ifaces, list) else [raw_ifaces]
        vrfs = raw_vrfs if isinstance(raw_vrfs, list) else [raw_vrfs]
    else:
        # VyOS 1.4: interface node at zone level (multi-value: list or scalar)
        raw_ifaces = zone_cfg.get("interface", [])
        interfaces = raw_ifaces if isinstance(raw_ifaces, list) else [raw_ifaces]

    # From-zone policies
    from_zones: List[Dict[str, Any]] = []
    for from_zone_name, from_cfg in zone_cfg.get("from", {}).items():
        fw = from_cfg.get("firewall", {})
        from_zones.append(
            {
                "from_zone": from_zone_name,
                "firewall_name": fw.get("name"),
                "firewall_ipv6_name": fw.get("ipv6-name"),
            }
        )

    # Intra-zone filtering
    intra = zone_cfg.get("intra-zone-filtering", {})
    intra_fw = intra.get("firewall", {})
    intra_zone_filtering: Optional[Dict[str, Any]] = None
    if intra:
        intra_zone_filtering = {
            "action": intra.get("action"),
            "firewall_name": intra_fw.get("name"),
            "firewall_ipv6_name": intra_fw.get("ipv6-name"),
        }

    # Default firewall (VyOS 1.5 only)
    default_firewall: Optional[Dict[str, Any]] = None
    if is_v15:
        def_fw = zone_cfg.get("default-firewall", {})
        if def_fw:
            default_firewall = {
                "name": def_fw.get("name"),
                "ipv6_name": def_fw.get("ipv6-name"),
            }

    return {
        "name": zone_name,
        "description": zone_cfg.get("description"),
        "default_action": zone_cfg.get("default-action"),
        "default_log": "default-log" in zone_cfg,
        "local_zone": "local-zone" in zone_cfg,
        "interfaces": [i for i in interfaces if i],
        "vrfs": [v for v in vrfs if v],
        "default_firewall": default_firewall,
        "from_zones": from_zones,
        "intra_zone_filtering": intra_zone_filtering,
    }


def _get_zones_from_config(
    full_config: Dict[str, Any], version: str
) -> List[Dict[str, Any]]:
    """Extract and parse all zones from a full VyOS config."""
    zone_section = full_config.get("firewall", {}).get("zone", {})
    zones = []
    for zone_name, zone_cfg in zone_section.items():
        try:
            zones.append(_parse_zone(zone_name, zone_cfg, version))
        except Exception:
            logger.exception("Failed to parse zone %s", zone_name)
    return zones


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware capabilities for firewall zones."""
    await require_read_permission(request, FeatureGroup.FIREWALL_ZONES)
    service = await run_in_threadpool(get_session_vyos_service, request)
    builder = FirewallZonesBatchBuilder(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config")
async def get_config(request: Request, refresh: bool = False) -> Dict[str, Any]:
    """
    Return all configured firewall zones in a normalized format.

    Normalizes VyOS 1.4 and 1.5 differences so the frontend always receives
    the same structure regardless of version.
    """
    await require_read_permission(request, FeatureGroup.FIREWALL_ZONES)
    service = await run_in_threadpool(get_session_vyos_service, request)

    try:
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        version = service.get_version()
        zones = _get_zones_from_config(full_config, version)
        return {"zones": zones, "total": len(zones)}
    except Exception:
        logger.exception("Failed to retrieve firewall zone configuration")
        return {"zones": [], "total": 0, "error": "Failed to retrieve zone configuration"}


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: ZoneBatchRequest) -> VyOSResponse:
    """
    Execute a batch of firewall zone operations atomically.

    All operations are committed in a single VyOS transaction. If any operation
    fails the entire batch is rolled back.
    """
    await require_write_permission(http_request, FeatureGroup.FIREWALL_ZONES)
    service = await run_in_threadpool(get_session_vyos_service, http_request)

    import inspect

    batch = FirewallZonesBatchBuilder(version=service.get_version())

    for op in request.operations:
        if op.op in _INTERNAL_BUILDER_METHODS:
            logger.warning("Blocked attempt to invoke internal builder method: %s", op.op)
            return VyOSResponse(
                success=False,
                error=f"Operation '{op.op}' is not allowed",
            )

        if not hasattr(batch, op.op):
            return VyOSResponse(
                success=False,
                error=f"Unknown operation: '{op.op}'",
            )

        method = getattr(batch, op.op)
        sig = inspect.signature(method)
        # Parameters excluding 'self'
        params = [p for p in sig.parameters.keys() if p != "self"]

        try:
            if len(params) == 1:
                # Only zone_name — already bound as request.zone_name
                method(request.zone_name)
            elif len(params) == 2 and op.value is not None:
                method(request.zone_name, op.value)
            elif len(params) == 2:
                return VyOSResponse(
                    success=False,
                    error=f"Operation '{op.op}' requires a value",
                )
            else:
                return VyOSResponse(
                    success=False,
                    error=f"Operation '{op.op}' has unexpected signature",
                )
        except ValueError as exc:
            return VyOSResponse(success=False, error=str(exc))

    try:
        response = await run_in_threadpool(service.execute_batch, batch)
        return VyOSResponse(
            success=response.status == 200,
            error=response.error if response.status != 200 else None,
        )
    except Exception:
        logger.exception("Failed to execute firewall zone batch for zone '%s'", request.zone_name)
        return VyOSResponse(success=False, error="Failed to execute zone configuration")
