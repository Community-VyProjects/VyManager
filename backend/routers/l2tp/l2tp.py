"""
L2TP VPN Router

API endpoints for managing VyOS L2TP remote-access VPN configuration.
The L2TP command tree is identical between VyOS 1.4 and 1.5.

Uses session-based architecture - VyOS instance comes from user's active session.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.l2tp import L2TPBatchBuilder
from vyos_mappers.l2tp import L2TPMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/vpn/l2tp", tags=["l2tp"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
})


# ========================================================================
# Pydantic Models
# ========================================================================

class L2TPBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name (e.g., set_outside_address, create_local_user)")
    value: Optional[str] = Field(None, description="Operation value")


class L2TPBatchRequest(BaseModel):
    """Batch request for L2TP configuration changes."""
    item_name: str = Field(..., description="Primary item name (e.g., username, pool name, or placeholder for global ops)")
    operations: List[L2TPBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ========================================================================
# Endpoint 1: Capabilities
# ========================================================================

@router.get("/capabilities")
async def get_l2tp_capabilities(request: Request):
    """
    Get L2TP capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    """
    await require_read_permission(request, FeatureGroup.L2TP)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        builder = L2TPBatchBuilder(version=version)
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
async def get_l2tp_config(request: Request, refresh: bool = False):
    """
    Get L2TP remote-access configuration from VyOS.

    Returns generalized L2TP configuration data including:
    - General settings (outside address, gateway, MTU, DNS)
    - Authentication (local users, RADIUS)
    - IPSec settings
    - Client IP pools (IPv4 and IPv6)
    - PPP options
    - LNS settings
    - Limits, logging, scripts, shaper, SNMP
    """
    await require_read_permission(request, FeatureGroup.L2TP)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        full_config = service.get_full_config(refresh=refresh)

        mapper = L2TPMapper(version)
        config = mapper.parse_config(full_config)

        # Convert local users dict to list for frontend
        local_users = []
        for username, data in config.get("authentication", {}).get("local_users", {}).items():
            # Mask passwords
            masked = {**data}
            if masked.get("password"):
                masked["password"] = "***"
            local_users.append(masked)

        # Convert RADIUS servers dict to list
        radius_servers = []
        for addr, data in config.get("authentication", {}).get("radius", {}).get("servers", {}).items():
            radius_servers.append(data)

        # Convert client IP pools dict to list
        client_ip_pools = []
        for name, data in config.get("client_ip_pools", {}).items():
            client_ip_pools.append(data)

        # Convert client IPv6 pools dict to list
        client_ipv6_pools = []
        for name, data in config.get("client_ipv6_pools", {}).items():
            client_ipv6_pools.append(data)

        auth = config.get("authentication", {})
        radius = auth.get("radius", {})

        return {
            "configured": config.get("configured", False),
            "description": config.get("description"),
            "outside_address": config.get("outside_address"),
            "gateway_address": config.get("gateway_address"),
            "mtu": config.get("mtu"),
            "name_servers": config.get("name_servers", []),
            "wins_servers": config.get("wins_servers", []),
            "default_pool": config.get("default_pool"),
            "default_ipv6_pool": config.get("default_ipv6_pool"),
            "max_concurrent_sessions": config.get("max_concurrent_sessions"),
            "thread_count": config.get("thread_count"),
            "authentication": {
                "mode": auth.get("mode"),
                "protocols": auth.get("protocols", []),
                "local_users": local_users,
                "radius": {
                    "servers": radius_servers,
                    "source_address": radius.get("source_address"),
                    "timeout": radius.get("timeout"),
                    "max_try": radius.get("max_try"),
                    "nas_identifier": radius.get("nas_identifier"),
                    "nas_ip_address": radius.get("nas_ip_address"),
                    "preallocate_vif": radius.get("preallocate_vif", False),
                    "accounting_interim_interval": radius.get("accounting_interim_interval"),
                    "acct_interim_jitter": radius.get("acct_interim_jitter"),
                    "acct_timeout": radius.get("acct_timeout"),
                    "dynamic_author": radius.get("dynamic_author", {}),
                    "rate_limit": radius.get("rate_limit", {}),
                },
            },
            "ipsec_settings": config.get("ipsec_settings", {}),
            "client_ip_pools": client_ip_pools,
            "client_ipv6_pools": client_ipv6_pools,
            "ppp_options": config.get("ppp_options", {}),
            "lns": config.get("lns", {}),
            "limits": config.get("limits", {}),
            "log": config.get("log", {}),
            "extended_scripts": config.get("extended_scripts", {}),
            "shaper": config.get("shaper", {}),
            "snmp": config.get("snmp", {}),
            "totals": {
                "local_users": len(local_users),
                "radius_servers": len(radius_servers),
                "client_ip_pools": len(client_ip_pools),
                "client_ipv6_pools": len(client_ipv6_pools),
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
async def l2tp_batch_configure(http_request: Request, request: L2TPBatchRequest):
    """
    Execute a batch of L2TP configuration operations.

    All operations are executed in a single VyOS commit for atomicity.

    The item_name field serves as the primary identifier for the operations
    (e.g., username for local user ops, pool name for pool ops, or a
    placeholder like "l2tp" for global settings).

    Each operation's `op` field maps to a method on L2TPBatchBuilder.
    The `value` field provides additional parameters when needed.
    """
    await require_write_permission(http_request, FeatureGroup.L2TP)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        builder = L2TPBatchBuilder(version=version)

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
                if len(params) >= 3:
                    parts = operation.value.split("|", len(params) - 2)
                    args.extend(parts)
                else:
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
            data={"message": "L2TP configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
