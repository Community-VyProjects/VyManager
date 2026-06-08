"""
OpenVPN Interface Configuration Endpoints

All OpenVPN interface endpoints for VyOS configuration.
OpenVPN provides secure tunneling with site-to-site, client, and server modes.
"""

import inspect
import logging
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from starlette.concurrency import run_in_threadpool

from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/openvpn", tags=["openvpn-interface"])


# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# ============================================================================
# Request / Response Models
# ============================================================================


class BatchOperation(BaseModel):
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value (if required)")


class BatchRequest(BaseModel):
    interface: str = Field(..., description="Interface name (e.g., vtun0)")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class OpenvpnAuthentication(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnLocalAddress(BaseModel):
    address: str
    subnet_mask: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnReplaceDefaultRoute(BaseModel):
    enabled: bool = False
    local: bool = False

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnKeepAlive(BaseModel):
    failure_count: Optional[str] = None
    interval: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnEncryption(BaseModel):
    cipher: Optional[str] = None
    data_ciphers: List[str] = Field(default_factory=list)
    data_ciphers_fallback: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnTls(BaseModel):
    auth_key: Optional[str] = None
    ca_certificates: List[str] = Field(default_factory=list)
    certificate: Optional[str] = None
    crypt_key: Optional[str] = None
    dh_params: Optional[str] = None
    peer_fingerprints: List[str] = Field(default_factory=list)
    role: Optional[str] = None
    tls_version_min: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnServerBridge(BaseModel):
    gateway: Optional[str] = None
    start: Optional[str] = None
    stop: Optional[str] = None
    subnet_mask: Optional[str] = None
    disable: bool = False

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnClientIpPool(BaseModel):
    start: Optional[str] = None
    stop: Optional[str] = None
    subnet_mask: Optional[str] = None
    disable: bool = False

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnClientIpv6Pool(BaseModel):
    base: Optional[str] = None
    disable: bool = False

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnServerClient(BaseModel):
    name: str
    disable: bool = False
    ip: Optional[str] = None
    push_route: List[str] = Field(default_factory=list)
    subnet: List[str] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnServerPushRoute(BaseModel):
    route: str
    metric: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnServerMfaTotp(BaseModel):
    challenge: Optional[str] = None
    digits: Optional[str] = None
    drift: Optional[str] = None
    slop: Optional[str] = None
    step: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnServer(BaseModel):
    subnet: List[str] = Field(default_factory=list)
    topology: Optional[str] = None
    domain_name: Optional[str] = None
    max_connections: Optional[str] = None
    name_server: List[str] = Field(default_factory=list)
    reject_unconfigured_clients: bool = False
    push_route: List[OpenvpnServerPushRoute] = Field(default_factory=list)
    bridge: Optional[OpenvpnServerBridge] = None
    client_ip_pool: Optional[OpenvpnClientIpPool] = None
    client_ipv6_pool: Optional[OpenvpnClientIpv6Pool] = None
    clients: List[OpenvpnServerClient] = Field(default_factory=list)
    mfa_totp: Optional[OpenvpnServerMfaTotp] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnIpConfig(BaseModel):
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

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnIpv6Config(BaseModel):
    accept_dad: Optional[str] = None
    address_autoconf: bool = False
    address_eui64: Optional[str] = None
    address_no_default_link_local: bool = False
    address_interface_identifier: Optional[str] = None
    adjust_mss: Optional[str] = None
    base_reachable_time: Optional[str] = None
    disable_forwarding: bool = False
    dup_addr_detect_transmits: Optional[str] = None
    source_validation: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnInterfaceConfig(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    disabled: bool = False
    device_type: Optional[str] = None
    mode: Optional[str] = None
    protocol: Optional[str] = None
    vrf: Optional[str] = None
    persistent_tunnel: bool = False
    use_lzo_compression: bool = False
    redirect: Optional[str] = None
    replace_default_route: Optional[OpenvpnReplaceDefaultRoute] = None
    offload_dco: bool = False
    openvpn_options: List[str] = Field(default_factory=list)
    authentication: Optional[OpenvpnAuthentication] = None
    local_addresses: List[OpenvpnLocalAddress] = Field(default_factory=list)
    local_host: Optional[str] = None
    local_port: Optional[str] = None
    remote_address: List[str] = Field(default_factory=list)
    remote_host: List[str] = Field(default_factory=list)
    remote_port: Optional[str] = None
    keep_alive: Optional[OpenvpnKeepAlive] = None
    shared_secret_key: Optional[str] = None
    encryption: Optional[OpenvpnEncryption] = None
    hash: Optional[str] = None
    tls: Optional[OpenvpnTls] = None
    server: Optional[OpenvpnServer] = None
    ip: Optional[OpenvpnIpConfig] = None
    ipv6: Optional[OpenvpnIpv6Config] = None
    mirror_ingress: Optional[str] = None
    mirror_egress: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnInterfacesConfigResponse(BaseModel):
    interfaces: List[OpenvpnInterfaceConfig] = Field(default_factory=list)
    total: int = 0


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for OpenVPN interfaces."""
    await require_read_permission(request, FeatureGroup.OPENVPN)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.openvpn import OpenvpnInterfaceBuilderMixin
    builder = OpenvpnInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=OpenvpnInterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> OpenvpnInterfacesConfigResponse:
    """Get all OpenVPN interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.OPENVPN)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("openvpn", {})

        from vyos_mappers.interfaces.openvpn_versions import get_openvpn_mapper
        mapper = get_openvpn_mapper(service.get_version())
        parsed = mapper.parse_interfaces_of_type(raw_config)
        return OpenvpnInterfacesConfigResponse(**parsed)
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """
    Configure an OpenVPN interface using batch operations.

    **Multi-parameter operations:** for builder methods that require more than
    the interface name + one value, encode extras in `value` using colon-separated
    components (e.g., `address:mask`, `client:ip`, `client:route`, `route:metric`).
    """
    await require_write_permission(http_request, FeatureGroup.OPENVPN)

    try:
        service = get_session_vyos_service(http_request)
        batch = service.create_openvpn_batch()

        for op in request.operations:
            if op.op in batch._INTERNAL_BUILDER_METHODS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation '{op.op}' is not a valid interface operation",
                )

            method = getattr(batch, op.op, None)
            if method is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported operation: {op.op}",
                )

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 1:
                method(request.interface)
            elif len(params) == 2:
                if op.value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires a value",
                    )
                method(request.interface, op.value)
            elif len(params) == 3:
                if op.value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires a value",
                    )
                parts = op.value.split(":", 1)
                if len(parts) != 2:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires value in 'param1:param2' format",
                    )
                method(request.interface, parts[0], parts[1])
            elif len(params) == 4:
                if op.value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires a value",
                    )
                parts = op.value.split(":", 2)
                if len(parts) != 3:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires value in 'param1:param2:param3' format",
                    )
                method(request.interface, parts[0], parts[1], parts[2])
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation '{op.op}' has unexpected signature",
                )

        response = service.execute_batch(batch)
        return VyOSResponse(
            success=response.status == 200,
            data=response.result if isinstance(response.result, dict) else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
