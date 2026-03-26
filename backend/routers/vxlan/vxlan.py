"""
VXLAN Router

API endpoints for managing VyOS VXLAN interface configuration.

Version differences:
  - VyOS 1.5 adds: ipv6 address interface-identifier, vlan-to-vni description

Config tree:
  interfaces vxlan/<NAME>/
    address, description, disable, gpe, group,
    ip/<settings>, ipv6/<settings>,
    mac, mirror/<ingress|egress>, mtu,
    parameters/<external|ip|ipv6|neighbor-suppress|nolearning|vni-filter>,
    port, redirect, remote, source-address, source-interface,
    vlan-to-vni/<VLAN>/<vni|description>,
    vni, vrf
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.vxlan import VxlanBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/vxlan", tags=["vxlan"])


# ============================================================================
# Pydantic Models
# ============================================================================


class VxlanIpSettings(BaseModel):
    """IPv4 settings for a VXLAN interface."""
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


class VxlanIpv6Address(BaseModel):
    """IPv6 address settings."""
    autoconf: bool = False
    eui64: List[str] = []
    interface_identifier: Optional[str] = None  # VyOS 1.5+ only
    no_default_link_local: bool = False


class VxlanIpv6Settings(BaseModel):
    """IPv6 settings for a VXLAN interface."""
    accept_dad: Optional[str] = None
    address: VxlanIpv6Address = VxlanIpv6Address()
    adjust_mss: Optional[str] = None
    base_reachable_time: Optional[str] = None
    disable_forwarding: bool = False
    dup_addr_detect_transmits: Optional[str] = None
    source_validation: Optional[str] = None


class VxlanMirror(BaseModel):
    """Mirror settings."""
    egress: Optional[str] = None
    ingress: Optional[str] = None


class VxlanParametersIp(BaseModel):
    """VXLAN tunnel IPv4 parameters."""
    df: Optional[str] = None
    tos: Optional[str] = None
    ttl: Optional[str] = None


class VxlanParametersIpv6(BaseModel):
    """VXLAN tunnel IPv6 parameters."""
    flowlabel: Optional[str] = None


class VxlanParameters(BaseModel):
    """VXLAN tunnel parameters."""
    external: bool = False
    ip: VxlanParametersIp = VxlanParametersIp()
    ipv6: VxlanParametersIpv6 = VxlanParametersIpv6()
    neighbor_suppress: bool = False
    nolearning: bool = False
    vni_filter: bool = False


class VxlanVlanToVniEntry(BaseModel):
    """A single VLAN-to-VNI mapping."""
    vlan_id: str
    vni: Optional[str] = None
    description: Optional[str] = None  # VyOS 1.5+ only


class VxlanInterface(BaseModel):
    """Complete VXLAN interface configuration."""
    name: str
    addresses: List[str] = []
    description: Optional[str] = None
    disabled: bool = False
    gpe: bool = False
    group: Optional[str] = None
    ip: VxlanIpSettings = VxlanIpSettings()
    ipv6: VxlanIpv6Settings = VxlanIpv6Settings()
    mac: Optional[str] = None
    mirror: VxlanMirror = VxlanMirror()
    mtu: Optional[str] = None
    parameters: VxlanParameters = VxlanParameters()
    port: Optional[str] = None
    redirect: Optional[str] = None
    remotes: List[str] = []
    source_address: Optional[str] = None
    source_interface: Optional[str] = None
    vlan_to_vni: List[VxlanVlanToVniEntry] = []
    vni: Optional[str] = None
    vrf: Optional[str] = None


class VxlanConfigResponse(BaseModel):
    """Response for VXLAN config endpoint."""
    interfaces: List[VxlanInterface] = []
    total: int = 0


class VxlanBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class VxlanBatchRequest(BaseModel):
    """Batch request scoped to a single VXLAN interface."""
    interface_name: str
    operations: List[VxlanBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_vxlan_capabilities(request: Request):
    """Get VXLAN feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.VXLAN)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = VxlanBatchBuilder(version=version)
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


@router.get("/config", response_model=VxlanConfigResponse)
async def get_vxlan_config(http_request: Request, refresh: bool = False):
    """Get all VXLAN interface configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.VXLAN)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        vxlan_config = full_config.get("interfaces", {}).get("vxlan", {})

        if not vxlan_config:
            return VxlanConfigResponse()

        interfaces = []
        for iface_name, iface_data in vxlan_config.items():
            if iface_data is None:
                iface_data = {}
            interfaces.append(_parse_vxlan_interface(iface_name, iface_data))

        return VxlanConfigResponse(interfaces=interfaces, total=len(interfaces))
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


def _parse_vxlan_interface(name: str, data: dict) -> VxlanInterface:
    """Parse a single VXLAN interface configuration."""
    ip_data = data.get("ip", {}) or {}
    ipv6_data = data.get("ipv6", {}) or {}
    ipv6_addr_data = ipv6_data.get("address", {}) or {}
    mirror_data = data.get("mirror", {}) or {}
    params_data = data.get("parameters", {}) or {}
    params_ip_data = params_data.get("ip", {}) or {}
    params_ipv6_data = params_data.get("ipv6", {}) or {}

    return VxlanInterface(
        name=name,
        addresses=_ensure_list(data.get("address")),
        description=data.get("description"),
        disabled="disable" in data,
        gpe="gpe" in data,
        group=data.get("group"),
        ip=VxlanIpSettings(
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
        ipv6=VxlanIpv6Settings(
            accept_dad=ipv6_data.get("accept-dad"),
            address=VxlanIpv6Address(
                autoconf="autoconf" in ipv6_addr_data,
                eui64=_ensure_list(ipv6_addr_data.get("eui64")),
                interface_identifier=ipv6_addr_data.get("interface-identifier"),
                no_default_link_local="no-default-link-local" in ipv6_addr_data,
            ),
            adjust_mss=ipv6_data.get("adjust-mss"),
            base_reachable_time=ipv6_data.get("base-reachable-time"),
            disable_forwarding="disable-forwarding" in ipv6_data,
            dup_addr_detect_transmits=ipv6_data.get("dup-addr-detect-transmits"),
            source_validation=ipv6_data.get("source-validation"),
        ),
        mac=data.get("mac"),
        mirror=VxlanMirror(
            egress=mirror_data.get("egress"),
            ingress=mirror_data.get("ingress"),
        ),
        mtu=data.get("mtu"),
        parameters=VxlanParameters(
            external="external" in params_data,
            ip=VxlanParametersIp(
                df=params_ip_data.get("df"),
                tos=params_ip_data.get("tos"),
                ttl=params_ip_data.get("ttl"),
            ),
            ipv6=VxlanParametersIpv6(
                flowlabel=params_ipv6_data.get("flowlabel"),
            ),
            neighbor_suppress="neighbor-suppress" in params_data,
            nolearning="nolearning" in params_data,
            vni_filter="vni-filter" in params_data,
        ),
        port=data.get("port"),
        redirect=data.get("redirect"),
        remotes=_ensure_list(data.get("remote")),
        source_address=data.get("source-address"),
        source_interface=data.get("source-interface"),
        vlan_to_vni=_parse_vlan_to_vni(data.get("vlan-to-vni", {})),
        vni=data.get("vni"),
        vrf=data.get("vrf"),
    )


def _parse_vlan_to_vni(vlan_to_vni_data: dict) -> List[VxlanVlanToVniEntry]:
    """Parse VLAN-to-VNI mappings."""
    if not vlan_to_vni_data:
        return []

    entries = []
    for vlan_id, mapping in vlan_to_vni_data.items():
        if mapping is None:
            mapping = {}
        entries.append(VxlanVlanToVniEntry(
            vlan_id=str(vlan_id),
            vni=mapping.get("vni"),
            description=mapping.get("description"),
        ))
    return entries


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def vxlan_batch_configure(http_request: Request, body: VxlanBatchRequest):
    """Execute a batch of VXLAN configuration operations.

    All operations are scoped to a single VXLAN interface and committed atomically.
    """
    await require_write_permission(http_request, FeatureGroup.VXLAN)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = VxlanBatchBuilder(version=version)

        for operation in body.operations:
            if operation.op in VxlanBatchBuilder._INTERNAL_BUILDER_METHODS:
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
            data={"message": "VXLAN configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
