"""
PPPoE Interface Configuration Endpoints

All PPPoE interface endpoints for VyOS configuration.
PPPoE dials up to an upstream access concentrator (typical consumer ISP uplink)
over a source Ethernet interface and obtains IPv4 and/or IPv6 addresses.
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

router = APIRouter(prefix="/vyos/pppoe", tags=["pppoe-interface"])


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
    interface: str = Field(..., description="Interface name (e.g., pppoe0)")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class PppoeAuthentication(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class PppoeDhcpv6PdInterface(BaseModel):
    name: str
    address: Optional[str] = None
    sla_id: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class PppoeDhcpv6PdInstance(BaseModel):
    instance: str
    length: Optional[str] = None
    interfaces: List[PppoeDhcpv6PdInterface] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class PppoeDhcpv6Options(BaseModel):
    duid: Optional[str] = None
    no_release: bool = False
    no_request_dns: bool = False
    no_request_domain_name: bool = False
    parameters_only: bool = False
    rapid_commit: bool = False
    temporary: bool = False
    pd: List[PppoeDhcpv6PdInstance] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class PppoeIpConfig(BaseModel):
    adjust_mss: Optional[str] = None
    disable_forwarding: bool = False
    source_validation: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class PppoeIpv6Config(BaseModel):
    adjust_mss: Optional[str] = None
    disable_forwarding: bool = False
    address_autoconf: bool = False
    address_interface_identifier: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class PppoeInterfaceConfig(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    disabled: bool = False
    access_concentrator: Optional[str] = None
    service_name: Optional[str] = None
    source_interface: Optional[str] = None
    vrf: Optional[str] = None
    redirect: Optional[str] = None
    connect_on_demand: bool = False
    default_route_distance: Optional[str] = None
    no_default_route: bool = False
    no_peer_dns: bool = False
    holdoff: Optional[str] = None
    idle_timeout: Optional[str] = None
    host_uniq: Optional[str] = None
    mtu: Optional[str] = None
    mru: Optional[str] = None
    local_address: Optional[str] = None
    remote_address: Optional[str] = None
    addresses: List[str] = Field(default_factory=list)
    authentication: Optional[PppoeAuthentication] = None
    dhcpv6_options: Optional[PppoeDhcpv6Options] = None
    ip: Optional[PppoeIpConfig] = None
    ipv6: Optional[PppoeIpv6Config] = None
    mirror_ingress: Optional[str] = None
    mirror_egress: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class PppoeInterfacesConfigResponse(BaseModel):
    interfaces: List[PppoeInterfaceConfig] = Field(default_factory=list)
    total: int = 0


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for PPPoE interfaces."""
    await require_read_permission(request, FeatureGroup.PPPOE)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.pppoe import PppoeInterfaceBuilderMixin
    builder = PppoeInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=PppoeInterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> PppoeInterfacesConfigResponse:
    """Get all PPPoE interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.PPPOE)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("pppoe", {})

        from vyos_mappers.interfaces.pppoe_versions import get_pppoe_mapper
        mapper = get_pppoe_mapper(service.get_version())
        parsed = mapper.parse_interfaces_of_type(raw_config)
        return PppoeInterfacesConfigResponse(**parsed)
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """
    Configure a PPPoE interface using batch operations.

    **Multi-parameter operations:** for builder methods that require more than
    the interface name + one value, encode extras in `value` using colon-separated
    components (e.g., `instance:length`, `instance:delegated_iface`,
    `instance:delegated_iface:address`, `instance:delegated_iface:sla_id`).
    """
    await require_write_permission(http_request, FeatureGroup.PPPOE)

    try:
        service = get_session_vyos_service(http_request)
        batch = service.create_pppoe_batch()

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
