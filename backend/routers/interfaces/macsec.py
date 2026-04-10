"""
MACsec Interface Configuration Endpoints

All MACsec interface endpoints for VyOS configuration.
MACsec (Media Access Control Security) provides layer-2 encryption
over Ethernet links using IEEE 802.1AE.
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

router = APIRouter(prefix="/vyos/macsec", tags=["macsec-interface"])


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
    interface: str = Field(..., description="Interface name (e.g., macsec0)")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class MacsecMkaConfig(BaseModel):
    cak: Optional[str] = None
    ckn: Optional[str] = None
    priority: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class MacsecStaticPeer(BaseModel):
    name: str
    key: Optional[str] = None
    mac: Optional[str] = None
    disable: bool = False

    model_config = ConfigDict(populate_by_name=True)


class MacsecStaticConfig(BaseModel):
    key: Optional[str] = None
    peers: List[MacsecStaticPeer] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class MacsecSecurityConfig(BaseModel):
    cipher: Optional[str] = None
    encrypt: bool = False
    replay_window: Optional[str] = None
    mka: Optional[MacsecMkaConfig] = None
    static: Optional[MacsecStaticConfig] = None

    model_config = ConfigDict(populate_by_name=True)


class MacsecIpConfig(BaseModel):
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


class MacsecIpv6Config(BaseModel):
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


class MacsecDhcpOptions(BaseModel):
    client_id: Optional[str] = None
    default_route_distance: Optional[str] = None
    host_name: Optional[str] = None
    mtu: bool = False
    no_default_route: bool = False
    reject: Optional[str] = None
    user_class: Optional[str] = None
    vendor_class_id: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class MacsecDhcpv6PdInterface(BaseModel):
    address: Optional[str] = None
    sla_id: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class MacsecDhcpv6Pd(BaseModel):
    length: Optional[str] = None
    interfaces: Dict[str, MacsecDhcpv6PdInterface] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)


class MacsecDhcpv6Options(BaseModel):
    duid: Optional[str] = None
    no_release: bool = False
    no_request_dns: bool = False
    no_request_domain_name: bool = False
    parameters_only: bool = False
    rapid_commit: bool = False
    temporary: bool = False
    pd: Optional[Dict[str, MacsecDhcpv6Pd]] = None

    model_config = ConfigDict(populate_by_name=True)


class MacsecInterfaceConfig(BaseModel):
    name: str
    type: str
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    disabled: bool = False
    mtu: Optional[str] = None
    source_interface: Optional[str] = None
    vrf: Optional[str] = None
    security: Optional[MacsecSecurityConfig] = None
    ip: Optional[MacsecIpConfig] = None
    ipv6: Optional[MacsecIpv6Config] = None
    dhcp_options: Optional[MacsecDhcpOptions] = None
    dhcpv6_options: Optional[MacsecDhcpv6Options] = None
    mirror_ingress: Optional[str] = None
    mirror_egress: Optional[str] = None
    redirect: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class MacsecInterfacesConfigResponse(BaseModel):
    interfaces: List[MacsecInterfaceConfig] = Field(default_factory=list)
    total: int = 0


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for MACsec interfaces."""
    await require_read_permission(request, FeatureGroup.INTERFACES)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.macsec import MacsecInterfaceBuilderMixin
    builder = MacsecInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=MacsecInterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> MacsecInterfacesConfigResponse:
    """Get all MACsec interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.INTERFACES)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("macsec", {})

        from vyos_mappers.interfaces.macsec_versions import get_macsec_mapper
        mapper = get_macsec_mapper(service.get_version())
        parsed = mapper.parse_interfaces_of_type(raw_config)
        return MacsecInterfacesConfigResponse(**parsed)
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """
    Configure a MACsec interface using batch operations.

    **Supported operations:**
    | Operation | Value | Description |
    |-----------|-------|-------------|
    | `set_interface_description` | Yes | Set description |
    | `delete_interface_description` | No | Remove description |
    | `set_interface_address` | Yes | Add IP address (CIDR) |
    | `delete_interface_address` | Yes | Remove IP address |
    | `set_interface_disable` | No | Disable interface |
    | `delete_interface_disable` | No | Enable interface |
    | `set_mtu` | Yes | Set MTU (68-16000) |
    | `delete_mtu` | No | Reset MTU to default |
    | `set_source_interface` | Yes | Set source ethernet interface |
    | `delete_source_interface` | No | Remove source interface |
    | `set_vrf` | Yes | Assign to VRF |
    | `delete_vrf` | No | Remove VRF assignment |
    | `set_security_cipher` | Yes | Set cipher (gcm-aes-128/gcm-aes-256) |
    | `delete_security_cipher` | No | Remove cipher |
    | `set_security_encrypt` | No | Enable encryption |
    | `delete_security_encrypt` | No | Disable encryption |
    | `set_security_replay_window` | Yes | Set replay window (0-4294967295) |
    | `delete_security_replay_window` | No | Remove replay window |
    | `set_security_mka_cak` | Yes | Set MKA CAK (hex) |
    | `delete_security_mka_cak` | No | Remove MKA CAK |
    | `set_security_mka_ckn` | Yes | Set MKA CKN (hex) |
    | `delete_security_mka_ckn` | No | Remove MKA CKN |
    | `set_security_mka_priority` | Yes | Set MKA priority (0-255) |
    | `delete_security_mka_priority` | No | Remove MKA priority |
    | `set_security_static_key` | Yes | Set static key (hex) |
    | `delete_security_static_key` | No | Remove static key |
    | `set_security_static_peer` | Yes | Create static peer |
    | `delete_security_static_peer` | Yes | Delete static peer |
    | `set_security_static_peer_disable` | Yes | Disable static peer |
    | `delete_security_static_peer_disable` | Yes | Enable static peer |
    | `set_security_static_peer_key` | Yes | Set peer key (peer:key) |
    | `delete_security_static_peer_key` | Yes | Remove peer key |
    | `set_security_static_peer_mac` | Yes | Set peer MAC (peer:mac) |
    | `delete_security_static_peer_mac` | Yes | Remove peer MAC |
    | `delete_interface` | No | Delete entire interface |
    """
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(http_request)
        batch = service.create_macsec_batch()

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
            elif len(params) == 5:
                if op.value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires a value",
                    )
                parts = op.value.split(":", 3)
                if len(parts) != 4:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires value in 'param1:param2:param3:param4' format",
                    )
                method(request.interface, parts[0], parts[1], parts[2], parts[3])
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
