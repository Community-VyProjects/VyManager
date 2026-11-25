"""
MACsec Interface Configuration Endpoints

All MACsec interface endpoints for VyOS configuration.
MACsec (Media Access Control Security) provides layer-2 encryption
over Ethernet links using IEEE 802.1AE.
"""

import logging
from typing import Dict, List, Optional, Any, cast

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from starlette.concurrency import run_in_threadpool

from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service
from vyos_builders.interfaces.macsec import MacsecInterfaceBuilderMixin
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.interfaces.macsec import MacsecInterfaceMapper
from routers.interfaces.interface_batch import (
    BatchRequest,
    VyOSResponse,
    run_interface_batch,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/macsec", tags=["macsec-interface"])


# ============================================================================
# Request / Response Models
# ============================================================================


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
    address_eui64: List[str] = Field(default_factory=list)
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
    reject: List[str] = Field(default_factory=list)
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
    pd: Dict[str, MacsecDhcpv6Pd] = Field(default_factory=dict)

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
    await require_read_permission(request, FeatureGroup.MACSEC)
    service = get_session_vyos_service(request)
    builder = MacsecInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=MacsecInterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> MacsecInterfacesConfigResponse:
    """Get all MACsec interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.MACSEC)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("macsec", {})

        mapper = cast(
            MacsecInterfaceMapper,
            CommandMapperRegistry.get_mapper("interface_macsec", service.get_version()),
        )
        parsed = mapper.parse_interfaces_of_type(raw_config)
        return MacsecInterfacesConfigResponse(**parsed)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """Configure a MACsec interface using batch operations.

    Each op is a ``MacsecInterfaceBuilderMixin`` method; extra parameters after
    the interface are sent colon-separated in ``value``.
    """
    await require_write_permission(http_request, FeatureGroup.MACSEC)

    service = get_session_vyos_service(http_request)
    batch = MacsecInterfaceBuilderMixin(version=service.get_version())
    return await run_in_threadpool(run_interface_batch, service, batch, request)
