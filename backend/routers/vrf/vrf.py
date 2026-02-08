"""
VRF Router

API endpoints for managing VyOS VRF (Virtual Routing and Forwarding) configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import VrfBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect

router = APIRouter(prefix="/vyos/vrf", tags=["vrf"])


# ============================================================================
# Pydantic Models
# ============================================================================


class VrfIpProtocolRouteMap(BaseModel):
    """Per-protocol route-map assignment."""
    protocol: str
    route_map: str


class VrfIpSettings(BaseModel):
    """IP/IPv6 settings for a VRF instance."""
    disable_forwarding: bool = False
    nht_no_resolve_via_default: bool = False
    protocol_route_maps: List[VrfIpProtocolRouteMap] = []


class VrfInstance(BaseModel):
    """VRF instance configuration."""
    name: str
    description: Optional[str] = None
    disabled: bool = False
    table: Optional[int] = None
    vni: Optional[int] = None
    ip: VrfIpSettings = VrfIpSettings()
    ipv6: VrfIpSettings = VrfIpSettings()
    protocols: List[str] = []  # list of configured protocol names (informational)


class VrfConfig(BaseModel):
    """Complete VRF configuration."""
    bind_to_all: bool = False
    instances: List[VrfInstance] = []


class VrfBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class VrfBatchRequest(BaseModel):
    """Model for batch configuration."""
    operations: List[VrfBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_vrf_capabilities(request: Request):
    """Get VRF feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.VRF)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = VrfBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=VrfConfig)
async def get_vrf_config(http_request: Request, refresh: bool = False):
    """Get all VRF configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.VRF)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        vrf_config = full_config.get("vrf", {})

        if not vrf_config:
            return VrfConfig()

        bind_to_all = "bind-to-all" in vrf_config
        instances = parse_vrf_instances(vrf_config.get("name", {}))

        return VrfConfig(bind_to_all=bind_to_all, instances=instances)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Config Parsers
# ============================================================================


def parse_ip_settings(config: dict, family: str) -> VrfIpSettings:
    """Parse IP or IPv6 settings from VRF config."""
    family_config = config.get(family, {})
    if not family_config:
        return VrfIpSettings()

    disable_forwarding = "disable-forwarding" in family_config
    nht_no_resolve = "no-resolve-via-default" in family_config.get("nht", {})

    protocol_route_maps = []
    protocol_config = family_config.get("protocol", {})
    for proto_name, proto_settings in protocol_config.items():
        if proto_settings and isinstance(proto_settings, dict):
            route_map = proto_settings.get("route-map")
            if route_map:
                protocol_route_maps.append(VrfIpProtocolRouteMap(
                    protocol=proto_name,
                    route_map=route_map,
                ))

    return VrfIpSettings(
        disable_forwarding=disable_forwarding,
        nht_no_resolve_via_default=nht_no_resolve,
        protocol_route_maps=protocol_route_maps,
    )


def parse_vrf_instances(names_raw: dict) -> List[VrfInstance]:
    """Parse VRF instance configurations."""
    instances = []

    for vrf_name, vrf_config in names_raw.items():
        if vrf_config is None:
            vrf_config = {}

        # Detect which protocol subtrees are configured (informational)
        protocols = []
        protocols_config = vrf_config.get("protocols", {})
        if isinstance(protocols_config, dict):
            protocols = list(protocols_config.keys())

        instances.append(VrfInstance(
            name=vrf_name,
            description=vrf_config.get("description"),
            disabled="disable" in vrf_config,
            table=int(vrf_config["table"]) if vrf_config.get("table") else None,
            vni=int(vrf_config["vni"]) if vrf_config.get("vni") else None,
            ip=parse_ip_settings(vrf_config, "ip"),
            ipv6=parse_ip_settings(vrf_config, "ipv6"),
            protocols=protocols,
        ))

    return instances


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def vrf_batch_configure(http_request: Request, body: VrfBatchRequest):
    """Execute a batch of VRF configuration operations."""
    await require_write_permission(http_request, FeatureGroup.VRF)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = VrfBatchBuilder(version=version)

        for operation in body.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1 and operation.value:
                method(operation.value)
            elif len(params) == 2 and operation.value:
                values = operation.value.split(",", 1)
                if len(values) == 2:
                    method(values[0], values[1])
                else:
                    method(operation.value)

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "VRF configuration updated"},
            error=response.error if response.error else None
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
