"""
VPP Interface Configuration Endpoints

All VPP (Vector Packet Processing) interface endpoints for VyOS 1.5+.
VPP supports seven interface types under `interfaces vpp`:
  bonding (vppbondN), bridge (vppbrN), gre (vppgreN), ipip (vppipipN),
  loopback (vpploN), vxlan (vppvxlanN), xconnect (vppxconN)

Multi-parameter builder operations encode extra parameters as colon-separated
values in the `value` field, e.g. "vlan_id:address" for vif address ops.
"""

import logging
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service
from routers.interfaces.interface_batch import (
    BatchRequest,
    VyOSResponse,
    run_interface_batch,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/vpp", tags=["vpp-interface"])


# =============================================================================
# Request / Response Models
# =============================================================================




# ---- Per-type config models -------------------------------------------------


class VifConfig(BaseModel):
    vlan_id: str
    description: Optional[str] = None
    disabled: bool = False
    addresses: List[str] = Field(default_factory=list)
    mtu: Optional[str] = None


class BridgeMember(BaseModel):
    interface: str
    bvi: bool = False


class BondingConfig(BaseModel):
    name: str
    description: Optional[str] = None
    disabled: bool = False
    mode: Optional[str] = None
    hash_policy: Optional[str] = None
    mac: Optional[str] = None
    mtu: Optional[str] = None
    addresses: List[str] = Field(default_factory=list)
    members: List[str] = Field(default_factory=list)
    vif: List[VifConfig] = Field(default_factory=list)


class BridgeConfig(BaseModel):
    name: str
    description: Optional[str] = None
    members: List[BridgeMember] = Field(default_factory=list)


class GreConfig(BaseModel):
    name: str
    description: Optional[str] = None
    disabled: bool = False
    addresses: List[str] = Field(default_factory=list)
    mtu: Optional[str] = None
    remote: Optional[str] = None
    source_address: Optional[str] = None
    tunnel_type: Optional[str] = None
    key: Optional[str] = None


class IpipConfig(BaseModel):
    name: str
    description: Optional[str] = None
    disabled: bool = False
    addresses: List[str] = Field(default_factory=list)
    mtu: Optional[str] = None
    remote: Optional[str] = None
    source_address: Optional[str] = None


class LoopbackConfig(BaseModel):
    name: str
    description: Optional[str] = None
    disabled: bool = False
    addresses: List[str] = Field(default_factory=list)
    mtu: Optional[str] = None
    vif: List[VifConfig] = Field(default_factory=list)


class VxlanConfig(BaseModel):
    name: str
    description: Optional[str] = None
    disabled: bool = False
    addresses: List[str] = Field(default_factory=list)
    mtu: Optional[str] = None
    remote: Optional[str] = None
    source_address: Optional[str] = None
    vni: Optional[str] = None


class XconnectConfig(BaseModel):
    name: str
    description: Optional[str] = None
    disabled: bool = False
    members: List[str] = Field(default_factory=list)


class VppConfigResponse(BaseModel):
    bonding: List[BondingConfig] = Field(default_factory=list)
    bridge: List[BridgeConfig] = Field(default_factory=list)
    gre: List[GreConfig] = Field(default_factory=list)
    ipip: List[IpipConfig] = Field(default_factory=list)
    loopback: List[LoopbackConfig] = Field(default_factory=list)
    vxlan: List[VxlanConfig] = Field(default_factory=list)
    xconnect: List[XconnectConfig] = Field(default_factory=list)
    total: int = 0


# =============================================================================
# Endpoints
# =============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for VPP interfaces."""
    await require_read_permission(request, FeatureGroup.VPP)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.vpp import VppInterfaceBuilderMixin
    builder = VppInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=VppConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> VppConfigResponse:
    """Get all VPP interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.VPP)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("vpp", {})

        from vyos_mappers.interfaces.vpp_versions import get_vpp_mapper
        mapper = get_vpp_mapper(service.get_version())
        parsed = mapper.parse_all_vpp_interfaces(raw_config)
        return VppConfigResponse(**parsed)
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """
    Configure a VPP interface using batch operations.

    Operation names match builder methods exactly, e.g.:
      set_bonding_description, set_gre_remote, delete_vxlan_vni

    Multi-parameter operations use colon-separated `value`:
      set_bonding_vif_address  → value="100:192.0.2.1/24"   (vlan_id:address)
      set_bonding_vif_mtu      → value="100:1500"            (vlan_id:mtu)
      set_loopback_vif_address → value="10:10.0.0.1/24"      (vlan_id:address)
    """
    await require_write_permission(http_request, FeatureGroup.VPP)

    service = get_session_vyos_service(http_request)
    batch = service.create_vpp_batch()
    return run_interface_batch(service, batch, request)
