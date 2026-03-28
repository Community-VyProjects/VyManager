"""
Bonding Interface Configuration Endpoints

All bonding (link aggregation) interface endpoints for VyOS configuration.
Supports both VyOS 1.4 and 1.5 with version-aware capabilities.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/bonding", tags=["bonding-interface"])


# ============================================================================
# Request Models
# ============================================================================


class BondingBatchOperation(BaseModel):
    """Single batch operation for bonding interface."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Value for the operation")
    vlan_id: Optional[str] = Field(None, description="VLAN ID for vif/vif-s operations")
    inner_vlan_id: Optional[str] = Field(None, description="Inner VLAN ID for vif-c operations")


class BondingBatchRequest(BaseModel):
    """Batch request scoped to a single bonding interface."""
    interface_name: str
    operations: List[BondingBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Response Models
# ============================================================================


class ArpMonitorConfig(BaseModel):
    interval: Optional[str] = None
    targets: List[str] = Field(default_factory=list)


class EvpnConfig(BaseModel):
    es_df_pref: Optional[str] = None
    es_id: Optional[str] = None
    es_sys_mac: Optional[str] = None
    uplink: bool = False


class MirrorConfig(BaseModel):
    ingress: Optional[str] = None
    egress: Optional[str] = None


class EapolConfig(BaseModel):
    ca_certificate: Optional[str] = None
    certificate: Optional[str] = None
    passphrase: Optional[str] = None


class IpSettings(BaseModel):
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


class Ipv6Settings(BaseModel):
    accept_dad: Optional[str] = None
    adjust_mss: Optional[str] = None
    base_reachable_time: Optional[str] = None
    disable_forwarding: bool = False
    dup_addr_detect_transmits: Optional[str] = None
    source_validation: Optional[str] = None
    address_autoconf: bool = False
    address_eui64: List[str] = Field(default_factory=list)
    address_no_default_link_local: bool = False
    address_interface_identifier: Optional[str] = None


class DhcpOptionsConfig(BaseModel):
    client_id: Optional[str] = None
    default_route_distance: Optional[str] = None
    host_name: Optional[str] = None
    mtu: bool = False
    no_default_route: bool = False
    reject: List[str] = Field(default_factory=list)
    user_class: Optional[str] = None
    vendor_class_id: Optional[str] = None


class Dhcpv6PdInterface(BaseModel):
    name: str
    address: Optional[str] = None
    sla_id: Optional[str] = None


class Dhcpv6PdConfig(BaseModel):
    id: str
    length: Optional[str] = None
    interfaces: List[Dhcpv6PdInterface] = Field(default_factory=list)


class Dhcpv6OptionsConfig(BaseModel):
    duid: Optional[str] = None
    no_release: bool = False
    parameters_only: bool = False
    rapid_commit: bool = False
    temporary: bool = False
    no_request_dns: bool = False
    no_request_domain_name: bool = False
    pd: List[Dhcpv6PdConfig] = Field(default_factory=list)


class VifConfig(BaseModel):
    vlan_id: str
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    disable: bool = False
    mtu: Optional[str] = None
    vrf: Optional[str] = None
    mac: Optional[str] = None
    egress_qos: Optional[str] = None
    ingress_qos: Optional[str] = None


class VifCConfig(BaseModel):
    vlan_id: str
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    disable: bool = False


class VifSConfig(BaseModel):
    vlan_id: str
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    disable: bool = False
    protocol: Optional[str] = None
    vif_c: List[VifCConfig] = Field(default_factory=list)


class BondingInterfaceConfigResponse(BaseModel):
    """Bonding interface configuration from VyOS."""
    name: str
    type: str = "bonding"
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    disable: Optional[bool] = None
    disable_link_detect: bool = False
    mac: Optional[str] = None
    mtu: Optional[str] = None
    vrf: Optional[str] = None
    redirect: Optional[str] = None

    # Bonding-specific
    mode: Optional[str] = None
    hash_policy: Optional[str] = None
    lacp_rate: Optional[str] = None
    min_links: Optional[str] = None
    mii_mon_interval: Optional[str] = None
    primary: Optional[str] = None
    system_mac: Optional[str] = None
    members: List[str] = Field(default_factory=list)

    # Sub-configurations
    arp_monitor: Optional[ArpMonitorConfig] = None
    evpn: Optional[EvpnConfig] = None
    mirror: Optional[MirrorConfig] = None
    eapol: Optional[EapolConfig] = None
    ip: Optional[IpSettings] = None
    ipv6: Optional[Ipv6Settings] = None
    dhcp_options: Optional[DhcpOptionsConfig] = None
    dhcpv6_options: Optional[Dhcpv6OptionsConfig] = None
    vifs: List[VifConfig] = Field(default_factory=list)
    vif_s: List[VifSConfig] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class BondingInterfacesConfigResponse(BaseModel):
    """Response containing all bonding interface configurations."""
    interfaces: List[BondingInterfaceConfigResponse] = Field(default_factory=list)
    total: int = Field(0)
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_vrf: Dict[str, int] = Field(default_factory=dict)
    by_mode: Dict[str, int] = Field(default_factory=dict)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "interfaces": [
                    {
                        "name": "bond0",
                        "type": "bonding",
                        "mode": "802.3ad",
                        "members": ["eth0", "eth1"],
                        "addresses": ["10.0.0.1/24"],
                    }
                ],
                "total": 1,
                "by_type": {"bonding": 1},
                "by_vrf": {},
                "by_mode": {"802.3ad": 1},
            }
        }
    )


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_bonding_capabilities(request: Request):
    """Get bonding feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        from vyos_builders.interfaces.bonding import BondingInterfaceBuilderMixin
        builder = BondingInterfaceBuilderMixin(version=version)
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


@router.get("/config", response_model=BondingInterfacesConfigResponse)
async def get_bonding_config(http_request: Request) -> BondingInterfacesConfigResponse:
    """Get all bonding interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.INTERFACES)

    from vyos_mappers.interfaces.bonding_versions import get_bonding_mapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("interfaces", {}).get("bonding", {})

        mapper = get_bonding_mapper(service.get_version())
        parsed_data = mapper.parse_interfaces_of_type(raw_config)

        return BondingInterfacesConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch
# ============================================================================


# Operations that require a value
_VALUE_REQUIRED_OPS = frozenset({
    "set_description", "set_address", "delete_address", "set_mtu",
    "set_vrf", "set_redirect", "set_mac",
    "set_mode", "set_hash_policy", "set_lacp_rate", "set_min_links",
    "set_mii_mon_interval", "set_primary", "set_system_mac",
    "add_member_interface", "delete_member_interface",
    "set_arp_monitor_interval", "add_arp_monitor_target", "delete_arp_monitor_target",
    "set_evpn_es_df_pref", "set_evpn_es_id", "set_evpn_es_sys_mac",
    "set_mirror_ingress", "set_mirror_egress",
    "set_ip_adjust_mss", "set_ip_arp_cache_timeout", "set_ip_source_validation",
    "set_ipv6_accept_dad", "set_ipv6_adjust_mss", "set_ipv6_base_reachable_time",
    "set_ipv6_dup_addr_detect_transmits", "set_ipv6_source_validation",
    "set_ipv6_address_eui64",
    "set_dhcp_options_client_id", "set_dhcp_options_default_route_distance",
    "set_dhcp_options_host_name", "set_dhcp_options_reject",
    "set_dhcp_options_user_class", "set_dhcp_options_vendor_class_id",
    "set_dhcpv6_options_duid",
    "set_eapol_ca_certificate", "set_eapol_certificate", "set_eapol_passphrase",
    "set_ipv6_address_interface_identifier",
})

# Operations that require NO value (flag-style)
_NO_VALUE_OPS = frozenset({
    "delete_description", "delete_mtu", "delete_vrf", "delete_redirect",
    "delete_mac", "delete_interface",
    "disable", "enable", "set_disable_link_detect", "delete_disable_link_detect",
    "delete_mode", "delete_hash_policy", "delete_lacp_rate", "delete_min_links",
    "delete_mii_mon_interval", "delete_primary", "delete_system_mac",
    "delete_all_members", "delete_arp_monitor", "delete_arp_monitor_interval",
    "delete_evpn", "delete_evpn_es_df_pref", "delete_evpn_es_id",
    "delete_evpn_es_sys_mac", "set_evpn_uplink", "delete_evpn_uplink",
    "delete_mirror_ingress", "delete_mirror_egress",
    "set_ip_disable_arp_filter", "delete_ip_disable_arp_filter",
    "set_ip_disable_forwarding", "delete_ip_disable_forwarding",
    "set_ip_enable_arp_accept", "delete_ip_enable_arp_accept",
    "set_ip_enable_arp_announce", "delete_ip_enable_arp_announce",
    "set_ip_enable_arp_ignore", "delete_ip_enable_arp_ignore",
    "set_ip_enable_directed_broadcast", "delete_ip_enable_directed_broadcast",
    "set_ip_enable_proxy_arp", "delete_ip_enable_proxy_arp",
    "set_ip_proxy_arp_pvlan", "delete_ip_proxy_arp_pvlan",
    "delete_ip_adjust_mss", "delete_ip_arp_cache_timeout", "delete_ip_source_validation",
    "delete_ipv6_accept_dad", "delete_ipv6_adjust_mss", "delete_ipv6_base_reachable_time",
    "set_ipv6_disable_forwarding", "delete_ipv6_disable_forwarding",
    "delete_ipv6_dup_addr_detect_transmits", "delete_ipv6_source_validation",
    "set_ipv6_address_autoconf", "delete_ipv6_address_autoconf",
    "delete_ipv6_address_eui64",
    "set_ipv6_address_no_default_link_local", "delete_ipv6_address_no_default_link_local",
    "set_dhcp_options_mtu", "delete_dhcp_options_mtu",
    "set_dhcp_options_no_default_route", "delete_dhcp_options_no_default_route",
    "delete_dhcp_options_client_id", "delete_dhcp_options_default_route_distance",
    "delete_dhcp_options_host_name", "delete_all_dhcp_options",
    "set_dhcpv6_options_no_release", "delete_dhcpv6_options_no_release",
    "set_dhcpv6_options_parameters_only", "delete_dhcpv6_options_parameters_only",
    "set_dhcpv6_options_rapid_commit", "delete_dhcpv6_options_rapid_commit",
    "set_dhcpv6_options_temporary", "delete_dhcpv6_options_temporary",
    "delete_dhcpv6_options_duid", "delete_all_dhcpv6_options",
    "set_dhcpv6_options_no_request_dns", "delete_dhcpv6_options_no_request_dns",
    "set_dhcpv6_options_no_request_domain_name", "delete_dhcpv6_options_no_request_domain_name",
    "delete_eapol", "delete_eapol_ca_certificate", "delete_eapol_certificate",
    "delete_eapol_passphrase",
    "delete_ipv6_address_interface_identifier",
    "delete_dhcp_options_reject",
})

# VIF operations that require vlan_id
_VIF_VALUE_OPS = frozenset({
    "set_vif_description", "set_vif_address", "delete_vif_address",
    "set_vif_mtu", "set_vif_vrf",
})
_VIF_NO_VALUE_OPS = frozenset({
    "set_vif", "delete_vif",
    "delete_vif_description", "set_vif_disable", "delete_vif_disable",
    "delete_vif_mtu", "delete_vif_vrf",
})

# VIF-S operations
_VIF_S_OPS = frozenset({
    "set_vif_s", "delete_vif_s",
    "set_vif_s_address", "delete_vif_s_address",
    "set_vif_s_vif_c", "delete_vif_s_vif_c",
})


@router.post("/batch", response_model=VyOSResponse)
async def configure_bonding_batch(http_request: Request, request: BondingBatchRequest) -> VyOSResponse:
    """
    Configure bonding interface using batch operations.

    All operations are version-aware and sent to VyOS in a single batch.
    """
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(http_request)
        from vyos_builders.interfaces.bonding import BondingInterfaceBuilderMixin
        batch = BondingInterfaceBuilderMixin(version=service.get_version())
        iface = request.interface_name

        for operation in request.operations:
            op = operation.op
            val = operation.value
            vlan = operation.vlan_id
            inner_vlan = operation.inner_vlan_id

            # Value-required operations
            if op in _VALUE_REQUIRED_OPS:
                if not val:
                    raise HTTPException(status_code=400, detail=f"'{op}' requires a value")
                method = getattr(batch, op, None)
                if method is None:
                    raise HTTPException(status_code=400, detail=f"Unsupported operation: {op}")
                method(iface, val)

            # No-value operations
            elif op in _NO_VALUE_OPS:
                if op == "disable":
                    batch.set_interface_disable(iface)
                elif op == "enable":
                    batch.delete_interface_disable(iface)
                else:
                    method = getattr(batch, op, None)
                    if method is None:
                        raise HTTPException(status_code=400, detail=f"Unsupported operation: {op}")
                    method(iface)

            # VIF operations requiring vlan_id + optional value
            elif op in _VIF_VALUE_OPS:
                if not vlan:
                    raise HTTPException(status_code=400, detail=f"'{op}' requires vlan_id")
                if not val:
                    raise HTTPException(status_code=400, detail=f"'{op}' requires a value")
                method = getattr(batch, op, None)
                if method is None:
                    raise HTTPException(status_code=400, detail=f"Unsupported operation: {op}")
                method(iface, vlan, val)

            elif op in _VIF_NO_VALUE_OPS:
                if not vlan:
                    raise HTTPException(status_code=400, detail=f"'{op}' requires vlan_id")
                method = getattr(batch, op, None)
                if method is None:
                    raise HTTPException(status_code=400, detail=f"Unsupported operation: {op}")
                method(iface, vlan)

            # VIF-S operations
            elif op in _VIF_S_OPS:
                if not vlan:
                    raise HTTPException(status_code=400, detail=f"'{op}' requires vlan_id")
                if op in ("set_vif_s", "delete_vif_s"):
                    getattr(batch, op)(iface, vlan)
                elif op in ("set_vif_s_address", "delete_vif_s_address"):
                    if not val:
                        raise HTTPException(status_code=400, detail=f"'{op}' requires a value")
                    getattr(batch, op)(iface, vlan, val)
                elif op in ("set_vif_s_vif_c", "delete_vif_s_vif_c"):
                    if not inner_vlan:
                        raise HTTPException(status_code=400, detail=f"'{op}' requires inner_vlan_id")
                    getattr(batch, op)(iface, vlan, inner_vlan)

            else:
                raise HTTPException(status_code=400, detail=f"Unsupported operation: {op}")

        response = service.execute_batch(batch)

        return VyOSResponse(
            success=response.status == 200,
            data=response.result,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
