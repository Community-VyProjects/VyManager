"""
GENEVE Interface Configuration Endpoints

All GENEVE (Generic Network Virtualization Encapsulation) interface endpoints for VyOS configuration.
GENEVE interfaces provide network virtualization tunneling.
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

router = APIRouter(prefix="/vyos/geneve", tags=["geneve-interface"])


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
    interface: str = Field(..., description="Interface name (e.g., gnv0)")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class GeneveInterfaceConfig(BaseModel):
    name: str
    type: str
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    vrf: Optional[str] = None
    mtu: Optional[str] = None
    mac: Optional[str] = None
    disable: Optional[bool] = None
    # GENEVE-specific
    remote: Optional[str] = None
    vni: Optional[str] = None
    port: Optional[str] = None
    # Parameters: IP
    parameters_ip_df: Optional[str] = None
    parameters_ip_tos: Optional[str] = None
    parameters_ip_ttl: Optional[str] = None
    parameters_ip_innerproto: Optional[bool] = None
    # Parameters: IPv6
    parameters_ipv6_flowlabel: Optional[str] = None
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
    ipv6_adjust_mss: Optional[str] = None
    ipv6_base_reachable_time: Optional[str] = None
    ipv6_disable_forwarding: Optional[bool] = None
    ipv6_dup_addr_detect_transmits: Optional[str] = None
    ipv6_source_validation: Optional[str] = None
    ipv6_address_autoconf: Optional[bool] = None
    ipv6_address_eui64: List[str] = Field(default_factory=list)
    ipv6_address_no_default_link_local: Optional[bool] = None
    ipv6_address_interface_identifier: Optional[str] = None
    # Mirror
    mirror_ingress: Optional[str] = None
    mirror_egress: Optional[str] = None
    # Redirect
    redirect: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class GeneveInterfacesConfigResponse(BaseModel):
    interfaces: List[GeneveInterfaceConfig] = Field(default_factory=list)
    total: int = 0
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_vrf: Dict[str, int] = Field(default_factory=dict)


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for geneve interfaces."""
    await require_read_permission(request, FeatureGroup.INTERFACES)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.geneve import GeneveInterfaceBuilderMixin
    builder = GeneveInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=GeneveInterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> GeneveInterfacesConfigResponse:
    """Get all geneve interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.INTERFACES)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("geneve", {})

        from vyos_mappers.interfaces.geneve_versions import get_geneve_mapper
        mapper = get_geneve_mapper(service.get_version())
        parsed = mapper.parse_interfaces_of_type(raw_config)
        return GeneveInterfacesConfigResponse(**parsed)
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """
    Configure a geneve interface using batch operations.

    **Supported operations (all versions):**
    | Operation | Value | Description |
    |-----------|-------|-------------|
    | `set_interface_description` | Yes | Set description |
    | `delete_interface_description` | No | Remove description |
    | `set_interface_address` | Yes | Add IP address (CIDR) |
    | `delete_interface_address` | Yes | Remove IP address |
    | `set_interface_mtu` | Yes | Set MTU (1200-16000) |
    | `delete_interface_mtu` | No | Reset MTU to default |
    | `set_interface_disable` | No | Administratively disable |
    | `delete_interface_disable` | No | Re-enable interface |
    | `set_interface_vrf` | Yes | Assign to VRF |
    | `delete_interface_vrf` | No | Remove VRF assignment |
    | `set_mac` | Yes | Set MAC address |
    | `delete_mac` | No | Remove MAC address |
    | `set_remote` | Yes | Set tunnel remote address |
    | `delete_remote` | No | Remove tunnel remote address |
    | `set_vni` | Yes | Set Virtual Network Identifier |
    | `delete_vni` | No | Remove VNI |
    | `set_port` | Yes | Set port number |
    | `delete_port` | No | Reset port to default |
    | `set_parameters_ip_df` | Yes | Set DF bit (set/unset/inherit) |
    | `delete_parameters_ip_df` | No | Remove DF setting |
    | `set_parameters_ip_tos` | Yes | Set TOS (0-99) |
    | `delete_parameters_ip_tos` | No | Remove TOS |
    | `set_parameters_ip_ttl` | Yes | Set TTL (0-255) |
    | `delete_parameters_ip_ttl` | No | Remove TTL |
    | `set_parameters_ip_innerproto` | No | Use IPv4 as inner protocol |
    | `delete_parameters_ip_innerproto` | No | Remove inner protocol setting |
    | `set_parameters_ipv6_flowlabel` | Yes | Set IPv6 flow label |
    | `delete_parameters_ipv6_flowlabel` | No | Remove flow label |
    | `set_ip_adjust_mss` | Yes | Adjust TCP MSS |
    | `delete_ip_adjust_mss` | No | Remove MSS adjustment |
    | `set_ip_arp_cache_timeout` | Yes | Set ARP cache timeout |
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
    | `set_ip_enable_proxy_arp` | No | Enable proxy-arp |
    | `delete_ip_enable_proxy_arp` | No | Disable proxy-arp |
    | `set_ip_proxy_arp_pvlan` | No | Enable private VLAN proxy ARP |
    | `delete_ip_proxy_arp_pvlan` | No | Disable private VLAN proxy ARP |
    | `set_ip_source_validation` | Yes | Source validation (strict/loose/disable) |
    | `delete_ip_source_validation` | No | Remove source validation |
    | `set_ipv6_accept_dad` | Yes | Set DAD mode (0/1/2) |
    | `delete_ipv6_accept_dad` | No | Remove DAD setting |
    | `set_ipv6_adjust_mss` | Yes | Adjust TCP MSS for IPv6 |
    | `delete_ipv6_adjust_mss` | No | Remove IPv6 MSS adjustment |
    | `set_ipv6_base_reachable_time` | Yes | Set base reachable time |
    | `delete_ipv6_base_reachable_time` | No | Remove base reachable time |
    | `set_ipv6_disable_forwarding` | No | Disable IPv6 forwarding |
    | `delete_ipv6_disable_forwarding` | No | Enable IPv6 forwarding |
    | `set_ipv6_dup_addr_detect_transmits` | Yes | Set DAD transmit count |
    | `delete_ipv6_dup_addr_detect_transmits` | No | Remove DAD transmit count |
    | `set_ipv6_source_validation` | Yes | IPv6 source validation |
    | `delete_ipv6_source_validation` | No | Remove IPv6 source validation |
    | `set_ipv6_address_autoconf` | No | Enable SLAAC |
    | `delete_ipv6_address_autoconf` | No | Disable SLAAC |
    | `set_ipv6_address_eui64` | Yes | Add EUI-64 prefix |
    | `delete_ipv6_address_eui64` | Yes | Remove EUI-64 prefix |
    | `set_ipv6_address_no_default_link_local` | No | Remove default link-local |
    | `delete_ipv6_address_no_default_link_local` | No | Restore default link-local |
    | `set_mirror_ingress` | Yes | Mirror ingress to interface |
    | `delete_mirror_ingress` | No | Remove ingress mirror |
    | `set_mirror_egress` | Yes | Mirror egress to interface |
    | `delete_mirror_egress` | No | Remove egress mirror |
    | `set_redirect` | Yes | Redirect incoming packets |
    | `delete_redirect` | No | Remove redirect |
    | `delete_interface` | No | Delete entire interface |

    **VyOS 1.5+ only:**
    | `set_ipv6_address_interface_identifier` | Yes | Set SLAAC interface identifier |
    | `delete_ipv6_address_interface_identifier` | No | Remove SLAAC interface identifier |
    """
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(http_request)
        batch = service.create_geneve_batch()

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
