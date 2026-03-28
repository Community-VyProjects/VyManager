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

        tunnel_config = full_config.get("interfaces", {}).get("tunnel", {})

        if not tunnel_config:
            return TunnelConfigResponse()

        interfaces = []
        for iface_name, iface_data in tunnel_config.items():
            if iface_data is None:
                iface_data = {}
            interfaces.append(_parse_tunnel_interface(iface_name, iface_data))

        return TunnelConfigResponse(interfaces=interfaces, total=len(interfaces))
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def _ensure_list(value: Any) -> List[str]:
    """Convert VyOS config value to a list."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value]
    return []


def _parse_tunnel_interface(name: str, data: dict) -> TunnelInterface:
    """Parse a single tunnel interface configuration."""
    ip_data = data.get("ip", {}) or {}
    ipv6_data = data.get("ipv6", {}) or {}
    ipv6_addr_data = ipv6_data.get("address", {}) or {}
    mirror_data = data.get("mirror", {}) or {}
    params_data = data.get("parameters", {}) or {}
    erspan_data = params_data.get("erspan", {}) or {}
    params_ip_data = params_data.get("ip", {}) or {}
    params_ipv6_data = params_data.get("ipv6", {}) or {}

    return TunnelInterface(
        name=name,
        sixrd_prefix=data.get("6rd-prefix"),
        sixrd_relay_prefix=data.get("6rd-relay-prefix"),
        addresses=_ensure_list(data.get("address")),
        description=data.get("description"),
        disabled="disable" in data,
        disable_link_detect="disable-link-detect" in data,
        enable_multicast="enable-multicast" in data,
        encapsulation=data.get("encapsulation"),
        ip=TunnelIpSettings(
            adjust_mss=ip_data.get("adjust-mss"),
            arp_cache_timeout=ip_data.get("arp-cache-timeout"),
            disable_arp_filter="disable-arp-filter" in ip_data,
            disable_forwarding="disable-forwarding" in ip_data,
            enable_arp_accept="enable-arp-accept" in ip_data,
            enable_arp_announce="enable-arp-announce" in ip_data,
            enable_arp_ignore="enable-arp-ignore" in ip_data,
            enable_directed_broadcast="enable-directed-broadcast" in ip_data,
            enable_proxy_arp="enable-proxy-arp" in ip_data,
            proxy_arp_pvlan="proxy-arp-pvlan" in ip_data,
            source_validation=ip_data.get("source-validation"),
        ),
        ipv6=TunnelIpv6Settings(
            accept_dad=ipv6_data.get("accept-dad"),
            address=TunnelIpv6Address(
                autoconf="autoconf" in ipv6_addr_data,
                eui64=_ensure_list(ipv6_addr_data.get("eui64")),
                no_default_link_local="no-default-link-local" in ipv6_addr_data,
            ),
            adjust_mss=ipv6_data.get("adjust-mss"),
            base_reachable_time=ipv6_data.get("base-reachable-time"),
            disable_forwarding="disable-forwarding" in ipv6_data,
            dup_addr_detect_transmits=ipv6_data.get("dup-addr-detect-transmits"),
            source_validation=ipv6_data.get("source-validation"),
        ),
        mirror=TunnelMirror(
            egress=mirror_data.get("egress"),
            ingress=mirror_data.get("ingress"),
        ),
        mtu=data.get("mtu"),
        parameters=TunnelParameters(
            erspan=TunnelParametersErspan(
                direction=erspan_data.get("direction"),
                hw_id=erspan_data.get("hw-id"),
                index=erspan_data.get("index"),
                version=erspan_data.get("version"),
            ),
            ip=TunnelParametersIp(
                ignore_df="ignore-df" in params_ip_data,
                key=params_ip_data.get("key"),
                no_pmtu_discovery="no-pmtu-discovery" in params_ip_data,
                tos=params_ip_data.get("tos"),
                ttl=params_ip_data.get("ttl"),
            ),
            ipv6=TunnelParametersIpv6(
                encaplimit=params_ipv6_data.get("encaplimit"),
                flowlabel=params_ipv6_data.get("flowlabel"),
                hoplimit=params_ipv6_data.get("hoplimit"),
                tclass=params_ipv6_data.get("tclass"),
            ),
        ),
        redirect=data.get("redirect"),
        remote=data.get("remote"),
        source_address=data.get("source-address"),
        source_interface=data.get("source-interface"),
        vrf=data.get("vrf"),
    )


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
            if operation.op in TunnelBatchBuilder._INTERNAL_BUILDER_METHODS:
                raise HTTPException(status_code=400, detail=f"Invalid operation: {operation.op}")

            method = getattr(builder, operation.op)
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
