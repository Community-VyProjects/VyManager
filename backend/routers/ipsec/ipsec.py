"""
IPSec VPN Router

API endpoints for managing VyOS IPSec VPN configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.

Uses session-based architecture - VyOS instance comes from user's active session.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.ipsec import IPSecBatchBuilder
from vyos_mappers.ipsec import IPSecMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/vpn/ipsec", tags=["ipsec"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
})


# ========================================================================
# Pydantic Models
# ========================================================================

class IPSecBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name (e.g., create_esp_group, set_s2s_peer_ike_group)")
    value: Optional[str] = Field(None, description="Operation value")


class IPSecBatchRequest(BaseModel):
    """Batch request for IPSec configuration changes."""
    item_name: str = Field(..., description="Primary item name (e.g., esp group name, peer name, connection name)")
    operations: List[IPSecBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ========================================================================
# Endpoint 1: Capabilities
# ========================================================================

@router.get("/capabilities")
async def get_ipsec_capabilities(request: Request):
    """
    Get IPSec capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported,
    including version-specific features like PPK and retransmission options.
    """
    await require_read_permission(request, FeatureGroup.IPSEC)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        builder = IPSecBatchBuilder(version=version)
        return builder.get_capabilities()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 2: Config (Generalized Data)
# ========================================================================

@router.get("/config")
async def get_ipsec_config(request: Request, refresh: bool = False):
    """
    Get all IPSec configurations from VyOS.

    Returns generalized IPSec configuration data including:
    - IKE groups
    - ESP groups
    - Site-to-site peers with tunnels
    - Remote access connections and pools
    - Authentication (PSK, PPK)
    - Profiles
    - Global options and logging
    """
    await require_read_permission(request, FeatureGroup.IPSEC)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        full_config = service.get_full_config(refresh=refresh)

        mapper = IPSecMapper(version)
        config = mapper.parse_config(full_config)

        # Convert to list format for frontend consumption
        ike_groups = []
        for name, data in config.get("ike_groups", {}).items():
            proposals = []
            for prop_num, prop_data in data.get("proposals", {}).items():
                proposals.append(prop_data)
            ike_groups.append({
                **data,
                "proposals": sorted(proposals, key=lambda p: str(p.get("number", "0"))),
            })

        esp_groups = []
        for name, data in config.get("esp_groups", {}).items():
            proposals = []
            for prop_num, prop_data in data.get("proposals", {}).items():
                proposals.append(prop_data)
            esp_groups.append({
                **data,
                "proposals": sorted(proposals, key=lambda p: str(p.get("number", "0"))),
            })

        site_to_site_peers = []
        for name, data in config.get("site_to_site_peers", {}).items():
            tunnels = []
            for tunnel_num, tunnel_data in data.get("tunnels", {}).items():
                tunnels.append(tunnel_data)
            site_to_site_peers.append({
                **data,
                "tunnels": sorted(tunnels, key=lambda t: str(t.get("number", "0"))),
            })

        ra_connections = []
        for name, data in config.get("remote_access", {}).get("connections", {}).items():
            ra_connections.append(data)

        ra_pools = []
        for name, data in config.get("remote_access", {}).get("pools", {}).items():
            ra_pools.append(data)

        profiles = []
        for name, data in config.get("profiles", {}).items():
            profiles.append(data)

        psk_entries = []
        for name, data in config.get("authentication", {}).get("psk", {}).items():
            # Mask secrets for display
            masked = {**data}
            if masked.get("secret"):
                masked["secret"] = "***"
            psk_entries.append(masked)

        return {
            "ike_groups": ike_groups,
            "esp_groups": esp_groups,
            "site_to_site_peers": site_to_site_peers,
            "remote_access": {
                "connections": ra_connections,
                "pools": ra_pools,
                "radius": config.get("remote_access", {}).get("radius", {}),
                "dhcp": config.get("remote_access", {}).get("dhcp", {}),
            },
            "profiles": profiles,
            "authentication": {
                "psk": psk_entries,
            },
            "options": config.get("options", {}),
            "log": config.get("log", {}),
            "interfaces": config.get("interfaces", []),
            "disable_uniqreqids": config.get("disable_uniqreqids", False),
            "totals": {
                "ike_groups": len(ike_groups),
                "esp_groups": len(esp_groups),
                "site_to_site_peers": len(site_to_site_peers),
                "remote_access_connections": len(ra_connections),
                "remote_access_pools": len(ra_pools),
                "profiles": len(profiles),
            },
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 3: Batch Operations
# ========================================================================

@router.post("/batch", response_model=VyOSResponse)
async def ipsec_batch_configure(http_request: Request, request: IPSecBatchRequest):
    """
    Execute a batch of IPSec configuration operations.

    All operations are executed in a single VyOS commit for atomicity.

    The item_name field serves as the primary identifier for the operations
    (e.g., ESP group name, peer name, connection name).

    Each operation's `op` field maps to a method on IPSecBatchBuilder.
    The `value` field provides additional parameters when needed.
    """
    await require_write_permission(http_request, FeatureGroup.IPSEC)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        builder = IPSecBatchBuilder(version=version)

        for operation in request.operations:
            if operation.op.startswith("_") or operation.op in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(status_code=400, detail=f"Invalid operation: {operation.op}")

            method = getattr(builder, operation.op, None)
            if not callable(method):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {operation.op}"
                )

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            args = []
            if len(params) >= 1:
                args.append(request.item_name)
            if len(params) >= 2 and operation.value is not None:
                args.append(operation.value)

            method(*args)

        if builder.is_empty():
            return VyOSResponse(
                success=True,
                data={"message": "No operations to execute"},
            )

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "IPSec configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
