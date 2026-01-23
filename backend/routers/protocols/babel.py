"""
Babel Protocol Configuration Endpoints

All Babel routing protocol configuration endpoints for VyOS.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

router = APIRouter(prefix="/vyos/protocols/babel", tags=["babel-protocol"])


# ============================================================================
# Response Models
# ============================================================================

class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None
    message: Optional[str] = None


class BabelInterface(BaseModel):
    """Babel interface configuration"""
    name: str
    type: Optional[str] = None  # wired, wireless, tunnel
    channel: Optional[str] = None  # interfering, non-interfering
    rxcost: Optional[int] = None
    hello_interval: Optional[int] = None
    update_interval: Optional[int] = None
    rtt_decay: Optional[int] = None
    rtt_min: Optional[int] = None
    rtt_max: Optional[int] = None
    max_rtt_penalty: Optional[int] = None
    enable_timestamps: bool = False
    split_horizon: bool = True


class BabelRedistribution(BaseModel):
    """Babel redistribution configuration"""
    protocol: str
    route_map: Optional[str] = None


class BabelParameters(BaseModel):
    """Babel parameters configuration"""
    diversity: bool = False
    diversity_factor: Optional[int] = None
    resend_delay: Optional[int] = None
    smoothing_half_life: Optional[int] = None


class BabelConfigResponse(BaseModel):
    """Full Babel configuration response"""
    configured: bool
    interfaces: List[BabelInterface] = []
    redistributions: List[BabelRedistribution] = []
    parameters: Optional[BabelParameters] = None


# ============================================================================
# Request Models
# ============================================================================

class EnableBabelRequest(BaseModel):
    """Request to enable Babel"""
    diversity: bool = False
    diversity_factor: Optional[int] = Field(None, ge=1, le=256)
    resend_delay: Optional[int] = Field(None, ge=20, le=655340)


class AddInterfaceRequest(BaseModel):
    """Request to configure an interface"""
    interface: str
    type: Optional[str] = Field(None, description="Interface type: wired, wireless, tunnel")
    channel: Optional[str] = Field(None, description="Channel: interfering, non-interfering")
    rxcost: Optional[int] = Field(None, ge=1, le=65534)
    hello_interval: Optional[int] = Field(None, ge=20, le=655340)
    update_interval: Optional[int] = Field(None, ge=20, le=655340)
    enable_timestamps: bool = False
    split_horizon: bool = True


class AddRedistributionRequest(BaseModel):
    """Request to add redistribution"""
    protocol: str = Field(..., description="Protocol to redistribute: bgp, connected, eigrp, isis, kernel, nhrp, ospf, rip, static")
    route_map: Optional[str] = None


class SetParametersRequest(BaseModel):
    """Request to set Babel parameters"""
    diversity: bool = False
    diversity_factor: Optional[int] = Field(None, ge=1, le=256)
    resend_delay: Optional[int] = Field(None, ge=20, le=655340)
    smoothing_half_life: Optional[int] = Field(None, ge=0, le=65534)


# ============================================================================
# Parser Functions
# ============================================================================

def parse_babel_config(raw_config: Dict[str, Any]) -> Dict[str, Any]:
    """Parse raw Babel config from VyOS into structured format."""
    if not raw_config:
        return {
            "configured": False,
            "interfaces": [],
            "redistributions": [],
            "parameters": None,
        }

    result = {
        "configured": True,
        "interfaces": [],
        "redistributions": [],
        "parameters": None,
    }

    # Parse interfaces
    interfaces_raw = raw_config.get("interface", {})
    for iface_name, iface_config in interfaces_raw.items():
        iface_data = {
            "name": iface_name,
            "type": iface_config.get("type"),
            "channel": iface_config.get("channel"),
            "rxcost": int(iface_config["rxcost"]) if iface_config.get("rxcost") else None,
            "hello_interval": int(iface_config["hello-interval"]) if iface_config.get("hello-interval") else None,
            "update_interval": int(iface_config["update-interval"]) if iface_config.get("update-interval") else None,
            "rtt_decay": int(iface_config["rtt-decay"]) if iface_config.get("rtt-decay") else None,
            "rtt_min": int(iface_config["rtt-min"]) if iface_config.get("rtt-min") else None,
            "rtt_max": int(iface_config["rtt-max"]) if iface_config.get("rtt-max") else None,
            "max_rtt_penalty": int(iface_config["max-rtt-penalty"]) if iface_config.get("max-rtt-penalty") else None,
            "enable_timestamps": "enable-timestamps" in iface_config,
            "split_horizon": iface_config.get("split-horizon", {}).get("disable") is None,
        }
        result["interfaces"].append(iface_data)

    # Parse redistribution
    redistribute_raw = raw_config.get("redistribute", {})
    for protocol, redist_config in redistribute_raw.items():
        redist_data = {
            "protocol": protocol,
            "route_map": redist_config.get("route-map") if isinstance(redist_config, dict) else None,
        }
        result["redistributions"].append(redist_data)

    # Parse parameters
    params_raw = raw_config.get("parameters", {})
    if params_raw:
        result["parameters"] = {
            "diversity": "diversity" in params_raw,
            "diversity_factor": int(params_raw["diversity-factor"]) if params_raw.get("diversity-factor") else None,
            "resend_delay": int(params_raw["resend-delay"]) if params_raw.get("resend-delay") else None,
            "smoothing_half_life": int(params_raw["smoothing-half-life"]) if params_raw.get("smoothing-half-life") else None,
        }

    return result


# ============================================================================
# Read Endpoints
# ============================================================================

@router.get("/config")
async def get_babel_config(http_request: Request) -> BabelConfigResponse:
    """Get the current Babel configuration."""
    await require_read_permission(http_request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("protocols", {}).get("babel", {})

        parsed = parse_babel_config(raw_config)

        return BabelConfigResponse(
            configured=parsed["configured"],
            interfaces=[BabelInterface(**iface) for iface in parsed["interfaces"]],
            redistributions=[BabelRedistribution(**r) for r in parsed["redistributions"]],
            parameters=BabelParameters(**parsed["parameters"]) if parsed["parameters"] else None,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_babel_capabilities(http_request: Request) -> Dict[str, Any]:
    """Get Babel capabilities for the connected VyOS version."""
    await require_read_permission(http_request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        return {
            "version": version,
            "interface_types": [
                {"value": "wired", "label": "Wired", "description": "Wired network interface"},
                {"value": "wireless", "label": "Wireless", "description": "Wireless network interface"},
                {"value": "tunnel", "label": "Tunnel", "description": "Tunnel interface"},
            ],
            "channel_types": [
                {"value": "interfering", "label": "Interfering", "description": "Interfering channel"},
                {"value": "non-interfering", "label": "Non-interfering", "description": "Non-interfering channel"},
            ],
            "redistribute_protocols": [
                {"value": "bgp", "label": "BGP"},
                {"value": "connected", "label": "Connected"},
                {"value": "isis", "label": "IS-IS"},
                {"value": "kernel", "label": "Kernel"},
                {"value": "ospf", "label": "OSPF"},
                {"value": "rip", "label": "RIP"},
                {"value": "static", "label": "Static"},
            ],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Write Endpoints - Enable/Disable
# ============================================================================

@router.post("/enable")
async def enable_babel(http_request: Request, request: EnableBabelRequest) -> VyOSResponse:
    """Enable Babel with optional parameters."""
    await require_write_permission(http_request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = [["protocols", "babel"]]

        if request.diversity:
            set_commands.append(["protocols", "babel", "parameters", "diversity"])

        if request.diversity_factor is not None:
            set_commands.append(["protocols", "babel", "parameters", "diversity-factor", str(request.diversity_factor)])

        if request.resend_delay is not None:
            set_commands.append(["protocols", "babel", "parameters", "resend-delay", str(request.resend_delay)])

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            message="Babel enabled",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/disable")
async def disable_babel(http_request: Request) -> VyOSResponse:
    """Disable Babel completely."""
    await require_write_permission(http_request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "babel"]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message="Babel disabled",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Interface Endpoints
# ============================================================================

@router.post("/interface")
async def configure_interface(http_request: Request, request: AddInterfaceRequest) -> VyOSResponse:
    """Configure an interface for Babel."""
    await require_write_permission(http_request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = [["protocols", "babel", "interface", request.interface]]

        if request.type:
            set_commands.append(["protocols", "babel", "interface", request.interface, "type", request.type])

        if request.channel:
            set_commands.append(["protocols", "babel", "interface", request.interface, "channel", request.channel])

        if request.rxcost is not None:
            set_commands.append(["protocols", "babel", "interface", request.interface, "rxcost", str(request.rxcost)])

        if request.hello_interval is not None:
            set_commands.append(["protocols", "babel", "interface", request.interface, "hello-interval", str(request.hello_interval)])

        if request.update_interval is not None:
            set_commands.append(["protocols", "babel", "interface", request.interface, "update-interval", str(request.update_interval)])

        if request.enable_timestamps:
            set_commands.append(["protocols", "babel", "interface", request.interface, "enable-timestamps"])

        if not request.split_horizon:
            set_commands.append(["protocols", "babel", "interface", request.interface, "split-horizon", "disable"])

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            message=f"Interface {request.interface} configured",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/interface/{interface}")
async def delete_interface(http_request: Request, interface: str) -> VyOSResponse:
    """Remove an interface from Babel."""
    await require_write_permission(http_request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "babel", "interface", interface]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message=f"Interface {interface} removed",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Redistribution Endpoints
# ============================================================================

@router.post("/redistribute")
async def add_redistribution(http_request: Request, request: AddRedistributionRequest) -> VyOSResponse:
    """Add protocol redistribution into Babel."""
    await require_write_permission(http_request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = [["protocols", "babel", "redistribute", request.protocol]]

        if request.route_map:
            set_commands.append(["protocols", "babel", "redistribute", request.protocol, "route-map", request.route_map])

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            message=f"Redistribution of {request.protocol} added",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/redistribute/{protocol}")
async def delete_redistribution(http_request: Request, protocol: str) -> VyOSResponse:
    """Remove protocol redistribution from Babel."""
    await require_write_permission(http_request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "babel", "redistribute", protocol]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message=f"Redistribution of {protocol} removed",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Parameters Endpoints
# ============================================================================

@router.put("/parameters")
async def set_parameters(http_request: Request, request: SetParametersRequest) -> VyOSResponse:
    """Set Babel parameters."""
    await require_write_permission(http_request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = []

        if request.diversity:
            set_commands.append(["protocols", "babel", "parameters", "diversity"])

        if request.diversity_factor is not None:
            set_commands.append(["protocols", "babel", "parameters", "diversity-factor", str(request.diversity_factor)])

        if request.resend_delay is not None:
            set_commands.append(["protocols", "babel", "parameters", "resend-delay", str(request.resend_delay)])

        if request.smoothing_half_life is not None:
            set_commands.append(["protocols", "babel", "parameters", "smoothing-half-life", str(request.smoothing_half_life)])

        if not set_commands:
            return VyOSResponse(success=True, message="No parameters to update")

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            message="Babel parameters updated",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/parameters")
async def reset_parameters(http_request: Request) -> VyOSResponse:
    """Reset Babel parameters to defaults."""
    await require_write_permission(http_request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "babel", "parameters"]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message="Babel parameters reset to defaults",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
