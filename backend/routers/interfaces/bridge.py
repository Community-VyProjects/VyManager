"""
Bridge Interface Configuration Endpoints

All bridge interface endpoints for VyOS configuration.
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

router = APIRouter(prefix="/vyos/bridge", tags=["bridge-interface"])


# ============================================================================
# Request Models
# ============================================================================


class BridgeBatchOperation(BaseModel):
    """Single batch operation for bridge interface."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Value for the operation")
    vlan_id: Optional[str] = Field(None, description="VLAN ID for vif operations")
    member: Optional[str] = Field(None, description="Member interface name")


class BridgeBatchRequest(BaseModel):
    """Batch request scoped to a single bridge interface."""
    interface_name: str
    operations: List[BridgeBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Response Models
# ============================================================================


class IgmpConfig(BaseModel):
    snooping: bool = False
    querier: bool = False


class MirrorConfig(BaseModel):
    ingress: Optional[str] = None
    egress: Optional[str] = None


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


class MemberInterfaceConfig(BaseModel):
    name: str
    cost: Optional[str] = None
    priority: Optional[str] = None
    isolated: bool = False
    native_vlan: Optional[str] = None
    allowed_vlan: List[str] = Field(default_factory=list)
    bpdu_guard: bool = False
    root_guard: bool = False


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


class BridgeInterfaceConfigResponse(BaseModel):
    """Bridge interface configuration from VyOS."""
    name: str
    type: str = "bridge"
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    disable: Optional[bool] = None
    disable_link_detect: bool = False
    mac: Optional[str] = None
    mtu: Optional[str] = None
    vrf: Optional[str] = None
    redirect: Optional[str] = None

    # Bridge-specific
    aging: Optional[str] = None
    forwarding_delay: Optional[str] = None
    hello_time: Optional[str] = None
    max_age: Optional[str] = None
    priority: Optional[str] = None
    stp: bool = False
    enable_vlan: bool = False
    protocol: Optional[str] = None
    igmp: Optional[IgmpConfig] = None
    members: List[MemberInterfaceConfig] = Field(default_factory=list)

    # Sub-configurations
    mirror: Optional[MirrorConfig] = None
    ip: Optional[IpSettings] = None
    ipv6: Optional[Ipv6Settings] = None
    dhcp_options: Optional[DhcpOptionsConfig] = None
    dhcpv6_options: Optional[Dhcpv6OptionsConfig] = None
    vifs: List[VifConfig] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class BridgeInterfacesConfigResponse(BaseModel):
    """Response containing all bridge interface configurations."""
    interfaces: List[BridgeInterfaceConfigResponse] = Field(default_factory=list)
    total: int = Field(0)
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_vrf: Dict[str, int] = Field(default_factory=dict)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "interfaces": [
                    {
                        "name": "br0",
                        "type": "bridge",
                        "stp": True,
                        "members": [{"name": "eth0"}, {"name": "eth1"}],
                        "addresses": ["10.0.0.1/24"],
                    }
                ],
                "total": 1,
                "by_type": {"bridge": 1},
                "by_vrf": {},
            }
        }
    )


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_bridge_capabilities(request: Request):
    """Get bridge feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        from vyos_builders.interfaces.bridge import BridgeInterfaceBuilderMixin
        builder = BridgeInterfaceBuilderMixin(version=version)
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


@router.get("/config", response_model=BridgeInterfacesConfigResponse)
async def get_bridge_config(http_request: Request) -> BridgeInterfacesConfigResponse:
    """Get all bridge interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.INTERFACES)

    from vyos_mappers.interfaces.bridge_versions import get_bridge_mapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("interfaces", {}).get("bridge", {})

        mapper = get_bridge_mapper(service.get_version())
        parsed_data = mapper.parse_interfaces_of_type(raw_config)

        return BridgeInterfacesConfigResponse(**parsed_data)
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
    "set_aging", "set_forwarding_delay", "set_hello_time", "set_max_age",
    "set_priority", "set_protocol",
    "set_mirror_ingress", "set_mirror_egress",
    "set_ip_adjust_mss", "set_ip_arp_cache_timeout", "set_ip_source_validation",
    "set_ipv6_accept_dad", "set_ipv6_adjust_mss", "set_ipv6_base_reachable_time",
    "set_ipv6_dup_addr_detect_transmits", "set_ipv6_source_validation",
    "set_ipv6_address_eui64",
    "set_dhcp_options_client_id", "set_dhcp_options_default_route_distance",
    "set_dhcp_options_host_name", "set_dhcp_options_reject",
    "set_dhcp_options_user_class", "set_dhcp_options_vendor_class_id",
    "set_dhcpv6_options_duid",
    "set_ipv6_address_interface_identifier",
})

# Operations that require NO value (flag-style)
_NO_VALUE_OPS = frozenset({
    "delete_description", "delete_mtu", "delete_vrf", "delete_redirect",
    "delete_mac", "delete_interface",
    "disable", "enable", "set_disable_link_detect", "delete_disable_link_detect",
    "delete_aging", "delete_forwarding_delay", "delete_hello_time", "delete_max_age",
    "delete_priority", "delete_protocol",
    "set_stp", "delete_stp", "set_enable_vlan", "delete_enable_vlan",
    "set_igmp_snooping", "delete_igmp_snooping",
    "set_igmp_querier", "delete_igmp_querier", "delete_igmp",
    "delete_all_members",
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
    "delete_ipv6_address_interface_identifier",
    "delete_dhcp_options_reject",
})

# Member operations requiring member + value
_MEMBER_VALUE_OPS = frozenset({
    "set_member_interface_cost", "set_member_interface_priority",
    "set_member_interface_native_vlan",
    "set_member_interface_allowed_vlan", "delete_member_interface_allowed_vlan",
})

# Member operations requiring member only (no value)
_MEMBER_NO_VALUE_OPS = frozenset({
    "add_member_interface", "delete_member_interface",
    "set_member_interface_isolated", "delete_member_interface_isolated",
    "delete_member_interface_cost", "delete_member_interface_priority",
    "delete_member_interface_native_vlan", "delete_all_member_interface_allowed_vlans",
    "set_member_interface_bpdu_guard", "delete_member_interface_bpdu_guard",
    "set_member_interface_root_guard", "delete_member_interface_root_guard",
})

# VIF operations that require vlan_id + value
_VIF_VALUE_OPS = frozenset({
    "set_vif_description", "set_vif_address", "delete_vif_address",
    "set_vif_mtu", "set_vif_vrf",
})

# VIF operations that require vlan_id only
_VIF_NO_VALUE_OPS = frozenset({
    "set_vif", "delete_vif",
    "delete_vif_description", "set_vif_disable", "delete_vif_disable",
    "delete_vif_mtu", "delete_vif_vrf",
})


@router.post("/batch", response_model=VyOSResponse)
async def configure_bridge_batch(http_request: Request, request: BridgeBatchRequest) -> VyOSResponse:
    """
    Configure bridge interface using batch operations.

    All operations are version-aware and sent to VyOS in a single batch.
    """
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(http_request)
        from vyos_builders.interfaces.bridge import BridgeInterfaceBuilderMixin
        batch = BridgeInterfaceBuilderMixin(version=service.get_version())
        iface = request.interface_name

        for operation in request.operations:
            op = operation.op
            val = operation.value
            vlan = operation.vlan_id
            member = operation.member

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

            # Member operations with value
            elif op in _MEMBER_VALUE_OPS:
                if not member:
                    raise HTTPException(status_code=400, detail=f"'{op}' requires member")
                if not val:
                    raise HTTPException(status_code=400, detail=f"'{op}' requires a value")
                method = getattr(batch, op, None)
                if method is None:
                    raise HTTPException(status_code=400, detail=f"Unsupported operation: {op}")
                method(iface, member, val)

            # Member operations without value
            elif op in _MEMBER_NO_VALUE_OPS:
                if not member:
                    raise HTTPException(status_code=400, detail=f"'{op}' requires member")
                method = getattr(batch, op, None)
                if method is None:
                    raise HTTPException(status_code=400, detail=f"Unsupported operation: {op}")
                method(iface, member)

            # VIF operations requiring vlan_id + value
            elif op in _VIF_VALUE_OPS:
                if not vlan:
                    raise HTTPException(status_code=400, detail=f"'{op}' requires vlan_id")
                if not val:
                    raise HTTPException(status_code=400, detail=f"'{op}' requires a value")
                method = getattr(batch, op, None)
                if method is None:
                    raise HTTPException(status_code=400, detail=f"Unsupported operation: {op}")
                method(iface, vlan, val)

            # VIF operations requiring vlan_id only
            elif op in _VIF_NO_VALUE_OPS:
                if not vlan:
                    raise HTTPException(status_code=400, detail=f"'{op}' requires vlan_id")
                method = getattr(batch, op, None)
                if method is None:
                    raise HTTPException(status_code=400, detail=f"Unsupported operation: {op}")
                method(iface, vlan)

            else:
                raise HTTPException(status_code=400, detail=f"Unsupported operation: {op}")

        response = service.execute_batch(batch)

        result_data = response.result
        if result_data == "" or result_data is None:
            result_data = None
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data}

        return VyOSResponse(
            success=response.status == 200,
            data=result_data,
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
