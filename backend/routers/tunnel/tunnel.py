"""
Tunnel Interface Router

API endpoints for managing VyOS tunnel interface configuration.

Tunnel commands are identical between VyOS 1.4 and 1.5.

Config tree:
  interfaces tunnel/<NAME>/
    6rd-prefix, 6rd-relay-prefix, address, description,
    disable, disable-link-detect, enable-multicast, encapsulation,
    ip/<settings>, ipv6/<settings>,
    mirror/<ingress|egress>, mtu,
    parameters/<erspan|ip|ipv6>,
    redirect, remote, source-address, source-interface, vrf
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.tunnel import TunnelBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method
from vyos_mappers.base import CommandMapperRegistry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/tunnel", tags=["tunnel"])


# ============================================================================
# Pydantic Models
# ============================================================================


class TunnelIpSettings(BaseModel):
    """IPv4 settings for a tunnel interface."""
    adjust_mss: Optional[str] = None
    arp_cache_timeout: Optional[str] = None
    disable_arp_filter: bool = False
    disable_forwarding: bool = False
    enable_arp_accept: bool = False
    enable_arp_announce: bool = False
    enable_arp_ignore: bool = False
    enable_directed_broadcast: bool = False
    enable_proxy_arp: bool = False
    proxy_arp_pvlan: bool = False
    source_validation: Optional[str] = None


class TunnelIpv6Address(BaseModel):
    """IPv6 address settings."""
    autoconf: bool = False
    eui64: List[str] = []
    no_default_link_local: bool = False


class TunnelIpv6Settings(BaseModel):
    """IPv6 settings for a tunnel interface."""
    accept_dad: Optional[str] = None
    address: TunnelIpv6Address = TunnelIpv6Address()
    adjust_mss: Optional[str] = None
    base_reachable_time: Optional[str] = None
    disable_forwarding: bool = False
    dup_addr_detect_transmits: Optional[str] = None
    source_validation: Optional[str] = None


class TunnelMirror(BaseModel):
    """Mirror settings."""
    egress: Optional[str] = None
    ingress: Optional[str] = None


class TunnelParametersErspan(BaseModel):
    """ERSPAN tunnel parameters."""
    direction: Optional[str] = None
    hw_id: Optional[str] = None
    index: Optional[str] = None
    version: Optional[str] = None


class TunnelParametersIp(BaseModel):
    """IPv4-specific tunnel parameters."""
    ignore_df: bool = False
    key: Optional[str] = None
    no_pmtu_discovery: bool = False
    tos: Optional[str] = None
    ttl: Optional[str] = None


class TunnelParametersIpv6(BaseModel):
    """IPv6-specific tunnel parameters."""
    encaplimit: Optional[str] = None
    flowlabel: Optional[str] = None
    hoplimit: Optional[str] = None
    tclass: Optional[str] = None


class TunnelParameters(BaseModel):
    """Tunnel parameters."""
    erspan: TunnelParametersErspan = TunnelParametersErspan()
    ip: TunnelParametersIp = TunnelParametersIp()
    ipv6: TunnelParametersIpv6 = TunnelParametersIpv6()


class TunnelInterface(BaseModel):
    """Complete tunnel interface configuration."""
    name: str
    sixrd_prefix: Optional[str] = None
    sixrd_relay_prefix: Optional[str] = None
    addresses: List[str] = []
    description: Optional[str] = None
    disabled: bool = False
    disable_link_detect: bool = False
    enable_multicast: bool = False
    encapsulation: Optional[str] = None
    ip: TunnelIpSettings = TunnelIpSettings()
    ipv6: TunnelIpv6Settings = TunnelIpv6Settings()
    mirror: TunnelMirror = TunnelMirror()
    mtu: Optional[str] = None
    parameters: TunnelParameters = TunnelParameters()
    redirect: Optional[str] = None
    remote: Optional[str] = None
    source_address: Optional[str] = None
    source_interface: Optional[str] = None
    vrf: Optional[str] = None


class TunnelConfigResponse(BaseModel):
    """Response for tunnel config endpoint."""
    interfaces: List[TunnelInterface] = []
    total: int = 0


class TunnelBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class TunnelBatchRequest(BaseModel):
    """Batch request scoped to a single tunnel interface."""
    interface_name: str
    operations: List[TunnelBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_tunnel_capabilities(request: Request):
    """Get tunnel feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.TUNNEL)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = TunnelBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=TunnelConfigResponse)
async def get_tunnel_config(http_request: Request, refresh: bool = False):
    """Get all tunnel interface configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.TUNNEL)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("tunnel", service.get_version())
        return TunnelConfigResponse(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def tunnel_batch_configure(http_request: Request, body: TunnelBatchRequest):
    """Execute a batch of tunnel configuration operations.

    All operations are scoped to a single tunnel interface and committed atomically.
    """
    await require_write_permission(http_request, FeatureGroup.TUNNEL)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = TunnelBatchBuilder(version=version)

        for operation in body.operations:

            method = resolve_batch_method(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 1:
                method(body.interface_name)
            elif len(params) == 2 and operation.value is not None:
                method(body.interface_name, operation.value)

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Tunnel configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
