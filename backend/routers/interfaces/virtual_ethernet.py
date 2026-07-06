"""
Virtual Ethernet Interface Configuration Endpoints

All virtual-ethernet interface endpoints for VyOS configuration.
A virtual-ethernet interface is one end of a kernel veth pair, commonly used
to connect network namespaces or containers. It supports VLAN sub-interfaces
(vif, vif-s/vif-c QinQ) and optional network namespace assignment (VyOS 1.5+).
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

router = APIRouter(prefix="/vyos/virtual-ethernet", tags=["virtual-ethernet-interface"])


# ============================================================================
# Request / Response Models
# ============================================================================


class BatchOperation(BaseModel):
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value (if required)")


class BatchRequest(BaseModel):
    interface: str = Field(..., description="Interface name (e.g., veth0)")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class DhcpOptions(BaseModel):
    client_id: Optional[str] = None
    host_name: Optional[str] = None
    vendor_class_id: Optional[str] = None
    user_class: Optional[str] = None
    no_default_route: bool = False
    default_route_distance: Optional[str] = None
    reject: List[str] = Field(default_factory=list)
    mtu: bool = False

    model_config = ConfigDict(populate_by_name=True)


class Dhcpv6PdInterface(BaseModel):
    name: str
    address: Optional[str] = None
    sla_id: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class Dhcpv6PdInstance(BaseModel):
    instance: str
    length: Optional[str] = None
    interfaces: List[Dhcpv6PdInterface] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class Dhcpv6Options(BaseModel):
    duid: Optional[str] = None
    no_release: bool = False
    no_request_dns: bool = False
    no_request_domain_name: bool = False
    parameters_only: bool = False
    rapid_commit: bool = False
    temporary: bool = False
    pd: List[Dhcpv6PdInstance] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class IpSettings(BaseModel):
    adjust_mss: Optional[str] = None
    adjust_mss_clamp_to_pmtu: bool = False
    arp_cache_timeout: Optional[str] = None
    disable_arp_filter: bool = False
    enable_arp_accept: bool = False
    enable_arp_announce: bool = False
    enable_arp_ignore: bool = False
    enable_directed_broadcast: bool = False
    enable_proxy_arp: bool = False
    proxy_arp_pvlan: bool = False
    disable_forwarding: bool = False
    source_validation: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class Ipv6Settings(BaseModel):
    accept_dad: Optional[str] = None
    adjust_mss: Optional[str] = None
    adjust_mss_clamp_to_pmtu: bool = False
    base_reachable_time: Optional[str] = None
    disable_forwarding: bool = False
    dup_addr_detect_transmits: Optional[str] = None
    source_validation: Optional[str] = None
    address_autoconf: bool = False
    address_eui64: List[str] = Field(default_factory=list)
    address_no_default_link_local: bool = False
    address_interface_identifier: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class MirrorSettings(BaseModel):
    ingress: Optional[str] = None
    egress: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class VifCConfig(BaseModel):
    vlan_id: str
    description: Optional[str] = None
    disabled: bool = False
    disable_link_detect: bool = False
    addresses: List[str] = Field(default_factory=list)
    mtu: Optional[str] = None
    mac: Optional[str] = None
    vrf: Optional[str] = None
    redirect: Optional[str] = None
    dhcp_options: Optional[DhcpOptions] = None
    dhcpv6_options: Optional[Dhcpv6Options] = None
    ip: Optional[IpSettings] = None
    ipv6: Optional[Ipv6Settings] = None
    mirror: Optional[MirrorSettings] = None

    model_config = ConfigDict(populate_by_name=True)


class VifSConfig(BaseModel):
    vlan_id: str
    description: Optional[str] = None
    disabled: bool = False
    disable_link_detect: bool = False
    addresses: List[str] = Field(default_factory=list)
    mtu: Optional[str] = None
    mac: Optional[str] = None
    vrf: Optional[str] = None
    redirect: Optional[str] = None
    protocol: Optional[str] = None
    dhcp_options: Optional[DhcpOptions] = None
    dhcpv6_options: Optional[Dhcpv6Options] = None
    ip: Optional[IpSettings] = None
    ipv6: Optional[Ipv6Settings] = None
    mirror: Optional[MirrorSettings] = None
    vif_c: List[VifCConfig] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class VifConfig(BaseModel):
    vlan_id: str
    description: Optional[str] = None
    disabled: bool = False
    disable_link_detect: bool = False
    addresses: List[str] = Field(default_factory=list)
    mtu: Optional[str] = None
    mac: Optional[str] = None
    vrf: Optional[str] = None
    redirect: Optional[str] = None
    egress_qos: Optional[str] = None
    ingress_qos: Optional[str] = None
    dhcp_options: Optional[DhcpOptions] = None
    dhcpv6_options: Optional[Dhcpv6Options] = None
    ip: Optional[IpSettings] = None
    ipv6: Optional[Ipv6Settings] = None
    mirror: Optional[MirrorSettings] = None

    model_config = ConfigDict(populate_by_name=True)


class VirtualEthernetInterfaceConfig(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    disabled: bool = False
    peer_name: Optional[str] = None
    netns: Optional[str] = None
    mtu: Optional[str] = None
    vrf: Optional[str] = None
    addresses: List[str] = Field(default_factory=list)
    dhcp_options: Optional[DhcpOptions] = None
    dhcpv6_options: Optional[Dhcpv6Options] = None
    vif: List[VifConfig] = Field(default_factory=list)
    vif_s: List[VifSConfig] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class VirtualEthernetConfigResponse(BaseModel):
    interfaces: List[VirtualEthernetInterfaceConfig] = Field(default_factory=list)
    total: int = 0


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for virtual-ethernet interfaces."""
    await require_read_permission(request, FeatureGroup.VIRTUAL_ETHERNET)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.virtual_ethernet import VirtualEthernetInterfaceBuilderMixin
    builder = VirtualEthernetInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=VirtualEthernetConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> VirtualEthernetConfigResponse:
    """Get all virtual-ethernet interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.VIRTUAL_ETHERNET)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("virtual-ethernet", {})

        from vyos_mappers.interfaces.virtual_ethernet_versions import get_virtual_ethernet_mapper
        mapper = get_virtual_ethernet_mapper(service.get_version())
        parsed = mapper.parse_interfaces_of_type(raw_config)
        return VirtualEthernetConfigResponse(**parsed)
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """
    Configure a virtual-ethernet interface using batch operations.

    **Multi-parameter operations:** for builder methods that require more than
    the interface name + one value, encode extras in `value` using colon-separated
    components (e.g., `vlan_id:address`, `s_vlan_id:c_vlan_id`, `pd_id:length`).
    """
    await require_write_permission(http_request, FeatureGroup.VIRTUAL_ETHERNET)

    try:
        service = get_session_vyos_service(http_request)
        batch = service.create_virtual_ethernet_batch()

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
