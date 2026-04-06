"""
L2TPv3 Interface Configuration Endpoints

All L2TPv3 (Layer 2 Tunnel Protocol Version 3) interface endpoints for VyOS configuration.
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

router = APIRouter(prefix="/vyos/l2tpv3", tags=["l2tpv3-interface"])


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
    interface: str = Field(..., description="Interface name (e.g., l2tpeth0)")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class L2TPv3InterfaceConfig(BaseModel):
    name: str
    type: str
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    vrf: Optional[str] = None
    mtu: Optional[str] = None
    disable: Optional[bool] = None
    # L2TPv3-specific tunnel settings
    remote: Optional[str] = None
    source_address: Optional[str] = None
    tunnel_id: Optional[str] = None
    peer_tunnel_id: Optional[str] = None
    session_id: Optional[str] = None
    peer_session_id: Optional[str] = None
    encapsulation: Optional[str] = None
    destination_port: Optional[str] = None
    source_port: Optional[str] = None
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
    ipv6_address_interface_identifier: Optional[str] = None
    ipv6_address_no_default_link_local: Optional[bool] = None
    ipv6_adjust_mss: Optional[str] = None
    ipv6_base_reachable_time: Optional[str] = None
    ipv6_disable_forwarding: Optional[bool] = None
    ipv6_dup_addr_detect_transmits: Optional[str] = None
    ipv6_source_validation: Optional[str] = None
    # Mirror
    mirror_ingress: Optional[str] = None
    mirror_egress: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class L2TPv3InterfacesConfigResponse(BaseModel):
    interfaces: List[L2TPv3InterfaceConfig] = Field(default_factory=list)
    total: int = 0
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_vrf: Dict[str, int] = Field(default_factory=dict)


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for L2TPv3 interfaces."""
    await require_read_permission(request, FeatureGroup.INTERFACES)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.l2tpv3 import L2TPv3InterfaceBuilderMixin
    builder = L2TPv3InterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=L2TPv3InterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> L2TPv3InterfacesConfigResponse:
    """Get all L2TPv3 interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.INTERFACES)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("l2tpv3", {})

        from vyos_mappers.interfaces.l2tpv3_versions import get_l2tpv3_mapper
        mapper = get_l2tpv3_mapper(service.get_version())
        parsed = mapper.parse_interfaces_of_type(raw_config)
        return L2TPv3InterfacesConfigResponse(**parsed)
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """
    Configure an L2TPv3 interface using batch operations.

    **Supported operations:**
    | Operation | Value | Description |
    |-----------|-------|-------------|
    | `set_interface_description` | Yes | Set description |
    | `delete_interface_description` | No | Remove description |
    | `set_interface_address` | Yes | Add IP address (CIDR) |
    | `delete_interface_address` | Yes | Remove IP address |
    | `set_interface_mtu` | Yes | Set MTU (68-16000, default 1488) |
    | `delete_interface_mtu` | No | Reset MTU to default |
    | `set_interface_disable` | No | Administratively disable |
    | `delete_interface_disable` | No | Re-enable interface |
    | `set_interface_vrf` | Yes | Assign to VRF |
    | `delete_interface_vrf` | No | Remove VRF assignment |
    | `set_remote` | Yes | Set tunnel remote address |
    | `delete_remote` | No | Remove tunnel remote address |
    | `set_source_address` | Yes | Set source IP address |
    | `delete_source_address` | No | Remove source address |
    | `set_tunnel_id` | Yes | Set local tunnel ID (1-429496729) |
    | `delete_tunnel_id` | No | Remove tunnel ID |
    | `set_peer_tunnel_id` | Yes | Set peer tunnel ID (1-429496729) |
    | `delete_peer_tunnel_id` | No | Remove peer tunnel ID |
    | `set_session_id` | Yes | Set session ID (1-429496729) |
    | `delete_session_id` | No | Remove session ID |
    | `set_peer_session_id` | Yes | Set peer session ID (1-429496729) |
    | `delete_peer_session_id` | No | Remove peer session ID |
    | `set_encapsulation` | Yes | Set encapsulation (udp/ip) |
    | `delete_encapsulation` | No | Remove encapsulation |
    | `set_destination_port` | Yes | Set UDP destination port (1-65535) |
    | `delete_destination_port` | No | Remove destination port |
    | `set_source_port` | Yes | Set UDP source port (1-65535) |
    | `delete_source_port` | No | Remove source port |
    | `set_ip_adjust_mss` | Yes | Set TCP MSS (clamp-mss-to-pmtu or 536-65535) |
    | `delete_ip_adjust_mss` | No | Remove TCP MSS |
    | `set_ip_arp_cache_timeout` | Yes | Set ARP cache timeout (1-86400) |
    | `delete_ip_arp_cache_timeout` | No | Remove ARP cache timeout |
    | `set_ip_disable_arp_filter` | No | Disable ARP filter |
    | `delete_ip_disable_arp_filter` | No | Enable ARP filter |
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
    | `set_ipv6_accept_dad` | Yes | Set DAD mode (0/1/2) |
    | `delete_ipv6_accept_dad` | No | Remove DAD setting |
    | `set_ipv6_address_autoconf` | No | Enable SLAAC autoconfig |
    | `delete_ipv6_address_autoconf` | No | Disable SLAAC autoconfig |
    | `set_ipv6_address_eui64` | Yes | Add EUI-64 prefix |
    | `delete_ipv6_address_eui64` | Yes | Remove EUI-64 prefix |
    | `set_ipv6_address_interface_identifier` | Yes | Set SLAAC interface identifier |
    | `delete_ipv6_address_interface_identifier` | No | Remove interface identifier |
    | `set_ipv6_address_no_default_link_local` | No | Remove default link-local |
    | `delete_ipv6_address_no_default_link_local` | No | Restore default link-local |
    | `set_ipv6_adjust_mss` | Yes | Set IPv6 TCP MSS |
    | `delete_ipv6_adjust_mss` | No | Remove IPv6 TCP MSS |
    | `set_ipv6_base_reachable_time` | Yes | Set base reachable time (1-86400) |
    | `delete_ipv6_base_reachable_time` | No | Remove base reachable time |
    | `set_ipv6_disable_forwarding` | No | Disable IPv6 forwarding |
    | `delete_ipv6_disable_forwarding` | No | Enable IPv6 forwarding |
    | `set_ipv6_dup_addr_detect_transmits` | Yes | Set DAD NS count |
    | `delete_ipv6_dup_addr_detect_transmits` | No | Remove DAD NS count |
    | `set_ipv6_source_validation` | Yes | IPv6 source validation (strict/loose/disable) |
    | `delete_ipv6_source_validation` | No | Remove IPv6 source validation |
    | `set_mirror_ingress` | Yes | Mirror ingress to interface |
    | `delete_mirror_ingress` | No | Remove ingress mirror |
    | `set_mirror_egress` | Yes | Mirror egress to interface |
    | `delete_mirror_egress` | No | Remove egress mirror |
    | `delete_interface` | No | Delete entire interface |
    """
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(http_request)
        batch = service.create_l2tpv3_batch()

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
