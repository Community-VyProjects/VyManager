"""
VTI (Virtual Tunnel Interface) Configuration Endpoints

All VTI interface endpoints for VyOS configuration.
VTI (XFRM) interfaces are used as the kernel-side of IPsec tunnels.
Interface naming follows the pattern vtiN (e.g., vti0, vti1).
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

router = APIRouter(prefix="/vyos/vti", tags=["vti-interface"])


# ============================================================================
# Request / Response Models
# ============================================================================


class BatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Operation value (if required)")


class BatchRequest(BaseModel):
    interface: str = Field(..., description="Interface name (e.g., vti0)")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class VtiInterfaceConfig(BaseModel):
    name: str
    type: str
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    mtu: Optional[str] = None
    disable: Optional[bool] = None
    vrf: Optional[str] = None
    redirect: Optional[str] = None
    # Mirror
    mirror_ingress: Optional[str] = None
    mirror_egress: Optional[str] = None
    # IP settings
    ip_adjust_mss: Optional[str] = None
    ip_arp_cache_timeout: Optional[str] = None
    ip_disable_arp_filter: Optional[bool] = None
    ip_disable_forwarding: Optional[bool] = None
    ip_enable_arp_accept: Optional[bool] = None
    ip_enable_arp_announce: Optional[bool] = None
    ip_enable_arp_ignore: Optional[bool] = None
    ip_enable_directed_broadcast: Optional[bool] = None
    ip_enable_proxy_arp: Optional[bool] = None
    ip_proxy_arp_pvlan: Optional[bool] = None
    ip_source_validation: Optional[str] = None
    # IPv6 settings
    ipv6_accept_dad: Optional[str] = None
    ipv6_address_autoconf: Optional[bool] = None
    ipv6_address_eui64: List[str] = Field(default_factory=list)
    ipv6_address_no_default_link_local: Optional[bool] = None
    ipv6_adjust_mss: Optional[str] = None
    ipv6_base_reachable_time: Optional[str] = None
    ipv6_disable_forwarding: Optional[bool] = None
    ipv6_dup_addr_detect_transmits: Optional[str] = None
    ipv6_source_validation: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class VtiInterfacesConfigResponse(BaseModel):
    interfaces: List[VtiInterfaceConfig] = Field(default_factory=list)
    total: int = 0
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_vrf: Dict[str, int] = Field(default_factory=dict)


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for VTI interfaces."""
    await require_read_permission(request, FeatureGroup.INTERFACES)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.vti import VtiInterfaceBuilderMixin
    builder = VtiInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=VtiInterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> VtiInterfacesConfigResponse:
    """Get all VTI interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.INTERFACES)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("vti", {})

        from vyos_mappers.interfaces.vti_versions import get_vti_mapper
        mapper = get_vti_mapper(service.get_version())
        parsed = mapper.parse_interfaces_of_type(raw_config)
        return VtiInterfacesConfigResponse(**parsed)
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """
    Configure a VTI interface using batch operations.

    **Supported operations (all versions):**
    | Operation | Value | Description |
    |-----------|-------|-------------|
    | `delete_interface` | No | Delete entire interface |
    | `set_interface_description` | Yes | Set description |
    | `delete_interface_description` | No | Remove description |
    | `set_interface_address` | Yes | Add IP address (CIDR) |
    | `delete_interface_address` | Yes | Remove specific IP address |
    | `delete_interface_addresses` | No | Remove all addresses |
    | `set_interface_mtu` | Yes | Set MTU (68-16000) |
    | `delete_interface_mtu` | No | Reset MTU to default |
    | `set_interface_disable` | No | Administratively disable |
    | `delete_interface_disable` | No | Re-enable interface |
    | `set_interface_vrf` | Yes | Assign to VRF |
    | `delete_interface_vrf` | No | Remove VRF assignment |
    | `set_redirect` | Yes | Redirect incoming packets |
    | `delete_redirect` | No | Remove redirect |
    | `set_mirror_ingress` | Yes | Mirror ingress traffic |
    | `delete_mirror_ingress` | No | Remove ingress mirror |
    | `set_mirror_egress` | Yes | Mirror egress traffic |
    | `delete_mirror_egress` | No | Remove egress mirror |
    | `set_ip_adjust_mss` | Yes | Adjust TCP MSS (clamp-mss-to-pmtu or 536-65535) |
    | `delete_ip_adjust_mss` | No | Remove MSS adjustment |
    | `set_ip_arp_cache_timeout` | Yes | ARP cache timeout (1-86400 seconds) |
    | `delete_ip_arp_cache_timeout` | No | Reset ARP cache timeout |
    | `set_ip_disable_arp_filter` | No | Disable ARP filter |
    | `delete_ip_disable_arp_filter` | No | Re-enable ARP filter |
    | `set_ip_disable_forwarding` | No | Disable IPv4 forwarding |
    | `delete_ip_disable_forwarding` | No | Enable IPv4 forwarding |
    | `set_ip_enable_arp_accept` | No | Enable ARP accept |
    | `delete_ip_enable_arp_accept` | No | Disable ARP accept |
    | `set_ip_enable_arp_announce` | No | Enable ARP announce |
    | `delete_ip_enable_arp_announce` | No | Disable ARP announce |
    | `set_ip_enable_arp_ignore` | No | Enable ARP ignore |
    | `delete_ip_enable_arp_ignore` | No | Disable ARP ignore |
    | `set_ip_enable_directed_broadcast` | No | Enable directed broadcast |
    | `delete_ip_enable_directed_broadcast` | No | Disable directed broadcast |
    | `set_ip_enable_proxy_arp` | No | Enable proxy ARP |
    | `delete_ip_enable_proxy_arp` | No | Disable proxy ARP |
    | `set_ip_proxy_arp_pvlan` | No | Enable private VLAN proxy ARP |
    | `delete_ip_proxy_arp_pvlan` | No | Disable private VLAN proxy ARP |
    | `set_ip_source_validation` | Yes | Source validation (strict/loose/disable) |
    | `delete_ip_source_validation` | No | Remove source validation |
    | `set_ipv6_accept_dad` | Yes | DAD mode (0/1/2) |
    | `delete_ipv6_accept_dad` | No | Reset DAD mode |
    | `set_ipv6_address_autoconf` | No | Enable SLAAC |
    | `delete_ipv6_address_autoconf` | No | Disable SLAAC |
    | `set_ipv6_address_eui64` | Yes | Add EUI-64 prefix |
    | `delete_ipv6_address_eui64` | Yes | Remove EUI-64 prefix |
    | `delete_ipv6_address_eui64_all` | No | Remove all EUI-64 prefixes |
    | `set_ipv6_address_no_default_link_local` | No | Remove default link-local |
    | `delete_ipv6_address_no_default_link_local` | No | Restore default link-local |
    | `set_ipv6_adjust_mss` | Yes | Adjust IPv6 TCP MSS |
    | `delete_ipv6_adjust_mss` | No | Remove IPv6 MSS adjustment |
    | `set_ipv6_base_reachable_time` | Yes | Base reachable time (1-86400 seconds) |
    | `delete_ipv6_base_reachable_time` | No | Reset base reachable time |
    | `set_ipv6_disable_forwarding` | No | Disable IPv6 forwarding |
    | `delete_ipv6_disable_forwarding` | No | Enable IPv6 forwarding |
    | `set_ipv6_dup_addr_detect_transmits` | Yes | DAD transmit count |
    | `delete_ipv6_dup_addr_detect_transmits` | No | Reset DAD transmit count |
    | `set_ipv6_source_validation` | Yes | IPv6 source validation (strict/loose/disable) |
    | `delete_ipv6_source_validation` | No | Remove IPv6 source validation |
    """
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(http_request)
        batch = service.create_vti_batch()

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
