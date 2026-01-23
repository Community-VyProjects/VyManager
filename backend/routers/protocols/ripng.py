"""
RIPng Protocol Configuration Endpoints

All RIPng (RIP for IPv6) configuration endpoints for VyOS.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

router = APIRouter(prefix="/vyos/protocols/ripng", tags=["ripng-protocol"])


# ============================================================================
# Response Models
# ============================================================================

class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None
    message: Optional[str] = None


class RIPngInterface(BaseModel):
    name: str
    split_horizon: Optional[str] = None


class RIPngRedistribution(BaseModel):
    protocol: str
    route_map: Optional[str] = None
    metric: Optional[int] = None


class RIPngConfigResponse(BaseModel):
    configured: bool
    networks: List[str] = []
    interfaces: List[RIPngInterface] = []
    passive_interfaces: List[str] = []
    redistributions: List[RIPngRedistribution] = []
    default_information_originate: bool = False
    default_metric: Optional[int] = None
    aggregate_addresses: List[str] = []


# ============================================================================
# Request Models
# ============================================================================

class EnableRIPngRequest(BaseModel):
    default_information_originate: bool = False
    default_metric: Optional[int] = Field(None, ge=1, le=16)


class AddNetworkRequest(BaseModel):
    network: str = Field(..., description="IPv6 network in CIDR notation")


class AddInterfaceRequest(BaseModel):
    interface: str
    split_horizon: Optional[str] = Field(None, description="Split horizon: enabled, disabled, poison-reverse")


class AddRedistributionRequest(BaseModel):
    protocol: str = Field(..., description="Protocol: bgp, connected, kernel, ospfv3, static")
    route_map: Optional[str] = None
    metric: Optional[int] = Field(None, ge=1, le=16)


# ============================================================================
# Parser Functions
# ============================================================================

def parse_ripng_config(raw_config: Dict[str, Any]) -> Dict[str, Any]:
    if not raw_config:
        return {
            "configured": False, "networks": [], "interfaces": [],
            "passive_interfaces": [], "redistributions": [],
            "default_information_originate": False, "default_metric": None,
            "aggregate_addresses": [],
        }

    result = {
        "configured": True,
        "networks": list(raw_config.get("network", {}).keys()) if isinstance(raw_config.get("network"), dict) else [],
        "interfaces": [],
        "passive_interfaces": list(raw_config.get("passive-interface", {}).keys()) if isinstance(raw_config.get("passive-interface"), dict) else [],
        "redistributions": [],
        "default_information_originate": "default-information" in raw_config and "originate" in raw_config.get("default-information", {}),
        "default_metric": int(raw_config["default-metric"]) if raw_config.get("default-metric") else None,
        "aggregate_addresses": list(raw_config.get("aggregate-address", {}).keys()) if isinstance(raw_config.get("aggregate-address"), dict) else [],
    }

    for iface_name, iface_config in raw_config.get("interface", {}).items():
        iface_data = {"name": iface_name, "split_horizon": None}
        if "split-horizon" in (iface_config or {}):
            sh = iface_config["split-horizon"]
            if sh.get("disable"): iface_data["split_horizon"] = "disabled"
            elif sh.get("poison-reverse"): iface_data["split_horizon"] = "poison-reverse"
            else: iface_data["split_horizon"] = "enabled"
        result["interfaces"].append(iface_data)

    for protocol, redist_config in raw_config.get("redistribute", {}).items():
        result["redistributions"].append({
            "protocol": protocol,
            "route_map": redist_config.get("route-map") if isinstance(redist_config, dict) else None,
            "metric": int(redist_config["metric"]) if isinstance(redist_config, dict) and redist_config.get("metric") else None,
        })

    return result


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/config")
async def get_ripng_config(http_request: Request) -> RIPngConfigResponse:
    await require_read_permission(http_request, FeatureGroup.RIPNG)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("protocols", {}).get("ripng", {})
        parsed = parse_ripng_config(raw_config)
        return RIPngConfigResponse(
            configured=parsed["configured"],
            networks=parsed["networks"],
            interfaces=[RIPngInterface(**i) for i in parsed["interfaces"]],
            passive_interfaces=parsed["passive_interfaces"],
            redistributions=[RIPngRedistribution(**r) for r in parsed["redistributions"]],
            default_information_originate=parsed["default_information_originate"],
            default_metric=parsed["default_metric"],
            aggregate_addresses=parsed["aggregate_addresses"],
        )
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_ripng_capabilities(http_request: Request) -> Dict[str, Any]:
    await require_read_permission(http_request, FeatureGroup.RIPNG)
    try:
        service = get_session_vyos_service(http_request)
        return {
            "version": service.get_version(),
            "redistribute_protocols": [
                {"value": "bgp", "label": "BGP"},
                {"value": "connected", "label": "Connected"},
                {"value": "kernel", "label": "Kernel"},
                {"value": "ospfv3", "label": "OSPFv3"},
                {"value": "static", "label": "Static"},
            ],
        }
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.post("/enable")
async def enable_ripng(http_request: Request, request: EnableRIPngRequest) -> VyOSResponse:
    await require_write_permission(http_request, FeatureGroup.RIPNG)
    try:
        service = get_session_vyos_service(http_request)
        set_commands = [["protocols", "ripng"]]
        if request.default_information_originate:
            set_commands.append(["protocols", "ripng", "default-information", "originate"])
        if request.default_metric is not None:
            set_commands.append(["protocols", "ripng", "default-metric", str(request.default_metric)])
        response = await run_in_threadpool(service.configure_batch, set_commands=set_commands)
        return VyOSResponse(success=response.status == 200, message="RIPng enabled")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/disable")
async def disable_ripng(http_request: Request) -> VyOSResponse:
    await require_write_permission(http_request, FeatureGroup.RIPNG)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "ripng"]])
        return VyOSResponse(success=response.status == 200, message="RIPng disabled")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.post("/network")
async def add_network(http_request: Request, request: AddNetworkRequest) -> VyOSResponse:
    await require_write_permission(http_request, FeatureGroup.RIPNG)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, set_commands=[["protocols", "ripng", "network", request.network]])
        return VyOSResponse(success=response.status == 200, message=f"Network {request.network} added")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/network/{network:path}")
async def delete_network(http_request: Request, network: str) -> VyOSResponse:
    await require_write_permission(http_request, FeatureGroup.RIPNG)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "ripng", "network", network]])
        return VyOSResponse(success=response.status == 200, message=f"Network {network} removed")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.post("/interface")
async def configure_interface(http_request: Request, request: AddInterfaceRequest) -> VyOSResponse:
    await require_write_permission(http_request, FeatureGroup.RIPNG)
    try:
        service = get_session_vyos_service(http_request)
        set_commands = [["protocols", "ripng", "interface", request.interface]]
        if request.split_horizon == "disabled":
            set_commands.append(["protocols", "ripng", "interface", request.interface, "split-horizon", "disable"])
        elif request.split_horizon == "poison-reverse":
            set_commands.append(["protocols", "ripng", "interface", request.interface, "split-horizon", "poison-reverse"])
        response = await run_in_threadpool(service.configure_batch, set_commands=set_commands)
        return VyOSResponse(success=response.status == 200, message=f"Interface {request.interface} configured")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/interface/{interface}")
async def delete_interface(http_request: Request, interface: str) -> VyOSResponse:
    await require_write_permission(http_request, FeatureGroup.RIPNG)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "ripng", "interface", interface]])
        return VyOSResponse(success=response.status == 200, message=f"Interface {interface} removed")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.post("/redistribute")
async def add_redistribution(http_request: Request, request: AddRedistributionRequest) -> VyOSResponse:
    await require_write_permission(http_request, FeatureGroup.RIPNG)
    try:
        service = get_session_vyos_service(http_request)
        set_commands = [["protocols", "ripng", "redistribute", request.protocol]]
        if request.route_map:
            set_commands.append(["protocols", "ripng", "redistribute", request.protocol, "route-map", request.route_map])
        if request.metric is not None:
            set_commands.append(["protocols", "ripng", "redistribute", request.protocol, "metric", str(request.metric)])
        response = await run_in_threadpool(service.configure_batch, set_commands=set_commands)
        return VyOSResponse(success=response.status == 200, message=f"Redistribution of {request.protocol} added")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/redistribute/{protocol}")
async def delete_redistribution(http_request: Request, protocol: str) -> VyOSResponse:
    await require_write_permission(http_request, FeatureGroup.RIPNG)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "ripng", "redistribute", protocol]])
        return VyOSResponse(success=response.status == 200, message=f"Redistribution of {protocol} removed")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.post("/passive-interface/{interface}")
async def add_passive_interface(http_request: Request, interface: str) -> VyOSResponse:
    await require_write_permission(http_request, FeatureGroup.RIPNG)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, set_commands=[["protocols", "ripng", "passive-interface", interface]])
        return VyOSResponse(success=response.status == 200, message=f"Passive interface {interface} added")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/passive-interface/{interface}")
async def delete_passive_interface(http_request: Request, interface: str) -> VyOSResponse:
    await require_write_permission(http_request, FeatureGroup.RIPNG)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "ripng", "passive-interface", interface]])
        return VyOSResponse(success=response.status == 200, message=f"Passive interface {interface} removed")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.post("/default-information/originate")
async def enable_default_info(http_request: Request) -> VyOSResponse:
    await require_write_permission(http_request, FeatureGroup.RIPNG)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, set_commands=[["protocols", "ripng", "default-information", "originate"]])
        return VyOSResponse(success=response.status == 200, message="Default information originate enabled")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/default-information/originate")
async def disable_default_info(http_request: Request) -> VyOSResponse:
    await require_write_permission(http_request, FeatureGroup.RIPNG)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "ripng", "default-information", "originate"]])
        return VyOSResponse(success=response.status == 200, message="Default information originate disabled")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
