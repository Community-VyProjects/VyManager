"""
WWAN Interface Configuration Endpoints

All WWAN (Wireless WAN / cellular modem) interface endpoints for VyOS configuration.
Supports APN, authentication, DHCP/DHCPv6 options, IP/IPv6 settings, mirror, and redirect.
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

router = APIRouter(prefix="/vyos/wwan", tags=["wwan-interface"])


# ============================================================================
# Request / Response Models
# ============================================================================


class BatchOperation(BaseModel):
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value (if required)")


class BatchRequest(BaseModel):
    interface: str = Field(..., description="WWAN interface name (e.g., wwan0)")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class Dhcpv6PdInterface(BaseModel):
    interface: str
    address: List[str] = Field(default_factory=list)
    sla_id: Optional[str] = None


class DhcpPrefixDelegation(BaseModel):
    id: str
    length: Optional[str] = None
    interfaces: List[Dhcpv6PdInterface] = Field(default_factory=list)


class WwanInterfaceConfig(BaseModel):
    name: str
    type: str = "wwan"
    description: Optional[str] = None
    disable: bool = False
    disable_link_detect: bool = False
    connect_on_demand: bool = False
    mtu: Optional[str] = None
    vrf: Optional[str] = None
    addresses: List[str] = Field(default_factory=list)
    redirect: Optional[str] = None
    # APN / Authentication
    apn: Optional[str] = None
    auth_username: Optional[str] = None
    auth_password: Optional[str] = None
    # DHCP options
    dhcp_client_id: Optional[str] = None
    dhcp_default_route_distance: Optional[str] = None
    dhcp_host_name: Optional[str] = None
    dhcp_mtu: Optional[str] = None
    dhcp_no_default_route: bool = False
    dhcp_reject: List[str] = Field(default_factory=list)
    dhcp_user_class: Optional[str] = None
    dhcp_vendor_class_id: Optional[str] = None
    # DHCPv6 options
    dhcpv6_duid: Optional[str] = None
    dhcpv6_no_release: bool = False
    dhcpv6_no_request_dns: Optional[bool] = None
    dhcpv6_no_request_domain_name: Optional[bool] = None
    dhcpv6_parameters_only: bool = False
    dhcpv6_rapid_commit: bool = False
    dhcpv6_temporary: bool = False
    dhcpv6_pd: List[DhcpPrefixDelegation] = Field(default_factory=list)
    # Mirror
    mirror_ingress: Optional[str] = None
    mirror_egress: Optional[str] = None
    # IP settings
    ip_adjust_mss: Optional[str] = None
    ip_arp_cache_timeout: Optional[str] = None
    ip_disable_arp_filter: bool = False
    ip_disable_forwarding: bool = False
    ip_enable_arp_accept: bool = False
    ip_enable_arp_announce: bool = False
    ip_enable_arp_ignore: bool = False
    ip_enable_directed_broadcast: bool = False
    ip_enable_proxy_arp: bool = False
    ip_proxy_arp_pvlan: bool = False
    ip_source_validation: Optional[str] = None
    # IPv6 settings
    ipv6_accept_dad: Optional[str] = None
    ipv6_address_autoconf: bool = False
    ipv6_address_eui64: List[str] = Field(default_factory=list)
    ipv6_address_no_default_link_local: bool = False
    ipv6_address_interface_identifier: Optional[str] = None
    ipv6_adjust_mss: Optional[str] = None
    ipv6_base_reachable_time: Optional[str] = None
    ipv6_disable_forwarding: bool = False
    ipv6_dup_addr_detect_transmits: Optional[str] = None
    ipv6_source_validation: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class WwanInterfacesConfigResponse(BaseModel):
    interfaces: List[WwanInterfaceConfig] = Field(default_factory=list)
    total: int = 0
    by_vrf: Dict[str, int] = Field(default_factory=dict)


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for WWAN interfaces."""
    await require_read_permission(request, FeatureGroup.WWAN)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.wwan import WwanInterfaceBatchBuilder
    builder = WwanInterfaceBatchBuilder(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=WwanInterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> WwanInterfacesConfigResponse:
    """Get all WWAN interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.WWAN)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("wwan", {})

        from vyos_mappers.interfaces.wwan_versions import get_wwan_mapper
        mapper = get_wwan_mapper(service.get_version())
        parsed = mapper.parse_interfaces_of_type(raw_config)

        interfaces = []
        for iface in parsed.get("interfaces", []):
            pd_entries = []
            for pd in (iface.get("dhcpv6_pd") or []):
                pd_ifaces = [
                    Dhcpv6PdInterface(
                        interface=pi["interface"],
                        address=pi.get("address") or [],
                        sla_id=pi.get("sla_id"),
                    )
                    for pi in (pd.get("interfaces") or [])
                ]
                pd_entries.append(DhcpPrefixDelegation(
                    id=pd["id"],
                    length=pd.get("length"),
                    interfaces=pd_ifaces,
                ))

            interfaces.append(WwanInterfaceConfig(
                name=iface["name"],
                description=iface.get("description"),
                disable=iface.get("disable", False),
                disable_link_detect=iface.get("disable_link_detect", False),
                connect_on_demand=iface.get("connect_on_demand", False),
                mtu=iface.get("mtu"),
                vrf=iface.get("vrf"),
                addresses=iface.get("addresses") or [],
                redirect=iface.get("redirect"),
                apn=iface.get("apn"),
                auth_username=iface.get("auth_username"),
                auth_password=iface.get("auth_password"),
                dhcp_client_id=iface.get("dhcp_client_id"),
                dhcp_default_route_distance=iface.get("dhcp_default_route_distance"),
                dhcp_host_name=iface.get("dhcp_host_name"),
                dhcp_mtu=iface.get("dhcp_mtu"),
                dhcp_no_default_route=iface.get("dhcp_no_default_route", False),
                dhcp_reject=iface.get("dhcp_reject") or [],
                dhcp_user_class=iface.get("dhcp_user_class"),
                dhcp_vendor_class_id=iface.get("dhcp_vendor_class_id"),
                dhcpv6_duid=iface.get("dhcpv6_duid"),
                dhcpv6_no_release=iface.get("dhcpv6_no_release", False),
                dhcpv6_no_request_dns=iface.get("dhcpv6_no_request_dns"),
                dhcpv6_no_request_domain_name=iface.get("dhcpv6_no_request_domain_name"),
                dhcpv6_parameters_only=iface.get("dhcpv6_parameters_only", False),
                dhcpv6_rapid_commit=iface.get("dhcpv6_rapid_commit", False),
                dhcpv6_temporary=iface.get("dhcpv6_temporary", False),
                dhcpv6_pd=pd_entries,
                mirror_ingress=iface.get("mirror_ingress"),
                mirror_egress=iface.get("mirror_egress"),
                ip_adjust_mss=iface.get("ip_adjust_mss"),
                ip_arp_cache_timeout=iface.get("ip_arp_cache_timeout"),
                ip_disable_arp_filter=iface.get("ip_disable_arp_filter", False),
                ip_disable_forwarding=iface.get("ip_disable_forwarding", False),
                ip_enable_arp_accept=iface.get("ip_enable_arp_accept", False),
                ip_enable_arp_announce=iface.get("ip_enable_arp_announce", False),
                ip_enable_arp_ignore=iface.get("ip_enable_arp_ignore", False),
                ip_enable_directed_broadcast=iface.get("ip_enable_directed_broadcast", False),
                ip_enable_proxy_arp=iface.get("ip_enable_proxy_arp", False),
                ip_proxy_arp_pvlan=iface.get("ip_proxy_arp_pvlan", False),
                ip_source_validation=iface.get("ip_source_validation"),
                ipv6_accept_dad=iface.get("ipv6_accept_dad"),
                ipv6_address_autoconf=iface.get("ipv6_address_autoconf", False),
                ipv6_address_eui64=iface.get("ipv6_address_eui64") or [],
                ipv6_address_no_default_link_local=iface.get("ipv6_address_no_default_link_local", False),
                ipv6_address_interface_identifier=iface.get("ipv6_address_interface_identifier"),
                ipv6_adjust_mss=iface.get("ipv6_adjust_mss"),
                ipv6_base_reachable_time=iface.get("ipv6_base_reachable_time"),
                ipv6_disable_forwarding=iface.get("ipv6_disable_forwarding", False),
                ipv6_dup_addr_detect_transmits=iface.get("ipv6_dup_addr_detect_transmits"),
                ipv6_source_validation=iface.get("ipv6_source_validation"),
            ))

        return WwanInterfacesConfigResponse(
            interfaces=interfaces,
            total=parsed.get("total", 0),
            by_vrf=parsed.get("by_vrf", {}),
        )
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """
    Configure a WWAN interface using batch operations.

    **Basic operations (all versions):**
    | Operation | Value | Description |
    |-----------|-------|-------------|
    | `set_interface` | No | Create interface node |
    | `delete_interface` | No | Delete entire interface |
    | `set_description` | Yes | Set interface description |
    | `delete_description` | No | Remove description |
    | `set_address` | Yes | Add IP address (CIDR, dhcp, or dhcpv6) |
    | `delete_address` | Yes | Remove a specific IP address |
    | `delete_address_all` | No | Remove all addresses |
    | `set_disable` | No | Administratively disable interface |
    | `delete_disable` | No | Re-enable interface |
    | `set_disable_link_detect` | No | Disable link state detection |
    | `delete_disable_link_detect` | No | Enable link state detection |
    | `set_connect_on_demand` | No | Connect when traffic is sent |
    | `delete_connect_on_demand` | No | Always-on connection |
    | `set_mtu` | Yes | Set MTU (68-1500) |
    | `delete_mtu` | No | Reset MTU to default |
    | `set_vrf` | Yes | Assign to VRF instance |
    | `delete_vrf` | No | Remove VRF assignment |
    | `set_redirect` | Yes | Redirect incoming packets to interface |
    | `delete_redirect` | No | Remove redirect |

    **APN / Authentication:**
    | `set_apn` | Yes | Set Access Point Name |
    | `delete_apn` | No | Remove APN |
    | `set_auth_username` | Yes | Set APN username |
    | `delete_auth_username` | No | Remove username |
    | `set_auth_password` | Yes | Set APN password |
    | `delete_auth_password` | No | Remove password |
    | `delete_authentication` | No | Remove all authentication config |

    **DHCP options:**
    | `set_dhcp_client_id` | Yes | DHCP client identifier |
    | `delete_dhcp_client_id` | No | Remove client identifier |
    | `set_dhcp_default_route_distance` | Yes | Default route distance (1-255) |
    | `delete_dhcp_default_route_distance` | No | Remove distance override |
    | `set_dhcp_host_name` | Yes | Override hostname sent to DHCP server |
    | `delete_dhcp_host_name` | No | Remove hostname override |
    | `set_dhcp_mtu` | Yes | Override MTU via DHCP |
    | `delete_dhcp_mtu` | No | Remove MTU override |
    | `set_dhcp_no_default_route` | No | Do not install default route from DHCP |
    | `delete_dhcp_no_default_route` | No | Allow default route from DHCP |
    | `set_dhcp_reject` | Yes | Reject leases from IP/subnet |
    | `delete_dhcp_reject` | Yes | Remove specific reject entry |
    | `delete_dhcp_reject_all` | No | Remove all reject entries |
    | `set_dhcp_user_class` | Yes | DHCP user class identifier |
    | `delete_dhcp_user_class` | No | Remove user class |
    | `set_dhcp_vendor_class_id` | Yes | DHCP vendor class identifier |
    | `delete_dhcp_vendor_class_id` | No | Remove vendor class |
    | `delete_dhcp_options` | No | Remove all DHCP options |

    **DHCPv6 options:**
    | `set_dhcpv6_duid` | Yes | DHCPv6 DUID |
    | `delete_dhcpv6_duid` | No | Remove DUID |
    | `set_dhcpv6_no_release` | No | Do not send Release on client exit |
    | `delete_dhcpv6_no_release` | No | Send Release on exit |
    | `set_dhcpv6_parameters_only` | No | Request parameters only, no address |
    | `delete_dhcpv6_parameters_only` | No | Request address and parameters |
    | `set_dhcpv6_rapid_commit` | No | Enable rapid commit (2-message exchange) |
    | `delete_dhcpv6_rapid_commit` | No | Disable rapid commit |
    | `set_dhcpv6_temporary` | No | Request temporary address |
    | `delete_dhcpv6_temporary` | No | Do not request temporary address |
    | `set_dhcpv6_pd_instance` | Yes | Create prefix delegation instance (e.g. "0") |
    | `delete_dhcpv6_pd_instance` | Yes | Delete prefix delegation instance |
    | `delete_dhcpv6_pd_all` | No | Remove all prefix delegations |
    | `delete_dhcpv6_options` | No | Remove all DHCPv6 options |

    **Mirror:**
    | `set_mirror_ingress` | Yes | Mirror ingress traffic to destination interface |
    | `delete_mirror_ingress` | No | Remove ingress mirror |
    | `set_mirror_egress` | Yes | Mirror egress traffic to destination interface |
    | `delete_mirror_egress` | No | Remove egress mirror |

    **IP settings:**
    | `set_ip_adjust_mss` | Yes | Clamp TCP MSS to PMTU |
    | `delete_ip_adjust_mss` | No | Remove MSS clamping |
    | `set_ip_arp_cache_timeout` | Yes | ARP cache timeout (seconds) |
    | `delete_ip_arp_cache_timeout` | No | Reset ARP cache timeout |
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
    | `set_ip_proxy_arp_pvlan` | No | Enable proxy ARP PVLAN |
    | `delete_ip_proxy_arp_pvlan` | No | Disable proxy ARP PVLAN |
    | `set_ip_source_validation` | Yes | Source validation (strict/loose/disable) |
    | `delete_ip_source_validation` | No | Remove source validation |

    **IPv6 settings:**
    | `set_ipv6_accept_dad` | Yes | DAD mode (0=disable, 1=enable, 2=enable+no-link-local-if-duplicate) |
    | `delete_ipv6_accept_dad` | No | Reset DAD |
    | `set_ipv6_address_autoconf` | No | Enable SLAAC |
    | `delete_ipv6_address_autoconf` | No | Disable SLAAC |
    | `set_ipv6_address_eui64` | Yes | EUI-64 prefix |
    | `delete_ipv6_address_eui64` | Yes | Remove specific EUI-64 prefix |
    | `delete_ipv6_address_eui64_all` | No | Remove all EUI-64 prefixes |
    | `set_ipv6_address_no_default_link_local` | No | Disable default link-local address |
    | `delete_ipv6_address_no_default_link_local` | No | Enable default link-local address |
    | `set_ipv6_adjust_mss` | Yes | Clamp TCP MSS to PMTU (IPv6) |
    | `delete_ipv6_adjust_mss` | No | Remove IPv6 MSS clamping |
    | `set_ipv6_base_reachable_time` | Yes | Neighbor base reachable time |
    | `delete_ipv6_base_reachable_time` | No | Reset base reachable time |
    | `set_ipv6_disable_forwarding` | No | Disable IPv6 forwarding |
    | `delete_ipv6_disable_forwarding` | No | Enable IPv6 forwarding |
    | `set_ipv6_dup_addr_detect_transmits` | Yes | DAD transmit count |
    | `delete_ipv6_dup_addr_detect_transmits` | No | Reset DAD transmit count |
    | `set_ipv6_source_validation` | Yes | IPv6 source validation (strict/loose/disable) |
    | `delete_ipv6_source_validation` | No | Remove IPv6 source validation |

    **VyOS 1.5 only:**
    | `set_dhcpv6_no_request_dns` | No | Do not request DNS servers via DHCPv6 |
    | `delete_dhcpv6_no_request_dns` | No | Request DNS servers via DHCPv6 |
    | `set_dhcpv6_no_request_domain_name` | No | Do not request domain name via DHCPv6 |
    | `delete_dhcpv6_no_request_domain_name` | No | Request domain name via DHCPv6 |
    | `set_ipv6_address_interface_identifier` | Yes | SLAAC interface identifier (::h:h:h:h) |
    | `delete_ipv6_address_interface_identifier` | No | Remove interface identifier |
    """
    await require_write_permission(http_request, FeatureGroup.WWAN)

    try:
        service = get_session_vyos_service(http_request)
        from vyos_builders.interfaces.wwan import WwanInterfaceBatchBuilder
        batch = WwanInterfaceBatchBuilder(version=service.get_version())

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
