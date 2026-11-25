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
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_builders.vxlan import VxlanBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import logging
from batch_dispatch import call_item_batch_op
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.vxlan import VxlanMapper

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
    mirror_configured: bool = False
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
    """Single operation in a batch request.

    The value fills the op's parameters after the interface name; an op with
    two of them (a VLAN-to-VNI vni or description) takes ``vlan_id|value``.
    """
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class VxlanBatchRequest(BaseModel):
    """Batch request scoped to a single VXLAN interface."""
    interface_name: str
    operations: List[VxlanBatchOperation]

    @field_validator("interface_name")
    @classmethod
    def _interface_name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("interface_name must not be blank")
        return value


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
        builder = VxlanBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except HTTPException:
        raise
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
        mapper = cast(VxlanMapper, CommandMapperRegistry.get_mapper("vxlan", service.get_version()))
        return VxlanConfigResponse(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


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
        builder = VxlanBatchBuilder(version=service.get_version())

        # Every op takes the interface name first; the value fills the rest,
        # split on "|" so a description keeps any "|" in its last part.
        try:
            for operation in body.operations:
                call_item_batch_op(builder, operation.op, body.interface_name, operation.value)
        except ValueError as e:
            # The mapper rejects a leaf this device version does not have.
            raise HTTPException(status_code=400, detail=str(e))

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = await run_in_threadpool(service.execute_batch, builder)
        ok = response.status == 200 and not response.error

        return VyOSResponse(
            success=ok,
            data={"message": "VXLAN configuration updated"} if ok else None,
            error=None if ok else response.error,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
