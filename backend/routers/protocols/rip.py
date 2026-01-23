"""
RIP Protocol Configuration Endpoints

All RIP routing protocol configuration endpoints for VyOS.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

router = APIRouter(prefix="/vyos/protocols/rip", tags=["rip-protocol"])


# ============================================================================
# Response Models
# ============================================================================

class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None
    message: Optional[str] = None


class RIPInterface(BaseModel):
    """RIP interface configuration"""
    name: str
    send: Optional[str] = None
    receive: Optional[str] = None
    split_horizon: Optional[str] = None
    authentication: Optional[Dict[str, Any]] = None


class RIPRedistribution(BaseModel):
    """RIP redistribution configuration"""
    protocol: str
    route_map: Optional[str] = None
    metric: Optional[int] = None


class RIPTimers(BaseModel):
    """RIP timer configuration"""
    update: Optional[int] = None
    timeout: Optional[int] = None
    garbage_collection: Optional[int] = None


class RIPPassiveInterfaces(BaseModel):
    """RIP passive interface configuration"""
    default: bool = False
    interfaces: List[str] = []


class RIPConfigResponse(BaseModel):
    """Full RIP configuration response"""
    configured: bool
    networks: List[str] = []
    interfaces: List[RIPInterface] = []
    passive_interfaces: RIPPassiveInterfaces = RIPPassiveInterfaces()
    neighbors: List[str] = []
    redistributions: List[RIPRedistribution] = []
    version: Optional[str] = None
    default_distance: Optional[int] = None
    default_information_originate: bool = False
    timers: Optional[RIPTimers] = None


# ============================================================================
# Request Models
# ============================================================================

class EnableRIPRequest(BaseModel):
    """Request to enable RIP"""
    version: Optional[str] = Field(None, description="RIP version: 1 or 2")
    default_distance: Optional[int] = Field(None, ge=1, le=255)
    default_information_originate: bool = False


class AddNetworkRequest(BaseModel):
    """Request to add a network"""
    network: str = Field(..., description="Network in CIDR notation")


class AddInterfaceRequest(BaseModel):
    """Request to configure an interface"""
    interface: str
    send: Optional[str] = Field(None, description="Send version: 1 or 2")
    receive: Optional[str] = Field(None, description="Receive version: 1 or 2")
    split_horizon: Optional[str] = Field(None, description="Split horizon: enabled, disabled, poison-reverse")


class AddRedistributionRequest(BaseModel):
    """Request to add redistribution"""
    protocol: str = Field(..., description="Protocol to redistribute: bgp, connected, isis, kernel, ospf, static")
    route_map: Optional[str] = None
    metric: Optional[int] = Field(None, ge=0, le=16)


class AddNeighborRequest(BaseModel):
    """Request to add a neighbor"""
    neighbor: str = Field(..., description="Neighbor IP address")


class SetTimersRequest(BaseModel):
    """Request to set RIP timers"""
    update: Optional[int] = Field(None, ge=5, le=65535)
    timeout: Optional[int] = Field(None, ge=5, le=65535)
    garbage_collection: Optional[int] = Field(None, ge=5, le=65535)


class SetPassiveInterfacesRequest(BaseModel):
    """Request to set passive interfaces"""
    default: bool = False
    interfaces: List[str] = []


# ============================================================================
# Parser Functions
# ============================================================================

def parse_rip_config(raw_config: Dict[str, Any]) -> Dict[str, Any]:
    """Parse raw RIP config from VyOS into structured format."""
    if not raw_config:
        return {
            "configured": False,
            "networks": [],
            "interfaces": [],
            "passive_interfaces": {"default": False, "interfaces": []},
            "neighbors": [],
            "redistributions": [],
            "version": None,
            "default_distance": None,
            "default_information_originate": False,
            "timers": None,
        }

    result = {
        "configured": True,
        "networks": list(raw_config.get("network", {}).keys()) if isinstance(raw_config.get("network"), dict) else [],
        "interfaces": [],
        "passive_interfaces": {"default": False, "interfaces": []},
        "neighbors": list(raw_config.get("neighbor", {}).keys()) if isinstance(raw_config.get("neighbor"), dict) else [],
        "redistributions": [],
        "version": raw_config.get("version"),
        "default_distance": int(raw_config["default-distance"]) if raw_config.get("default-distance") else None,
        "default_information_originate": "default-information" in raw_config and "originate" in raw_config.get("default-information", {}),
        "timers": None,
    }

    # Parse interfaces
    interfaces_raw = raw_config.get("interface", {})
    for iface_name, iface_config in interfaces_raw.items():
        iface_data = {
            "name": iface_name,
            "send": iface_config.get("send"),
            "receive": iface_config.get("receive"),
            "split_horizon": None,
            "authentication": iface_config.get("authentication"),
        }
        if "split-horizon" in iface_config:
            sh_config = iface_config["split-horizon"]
            if sh_config.get("disable"):
                iface_data["split_horizon"] = "disabled"
            elif sh_config.get("poison-reverse"):
                iface_data["split_horizon"] = "poison-reverse"
            else:
                iface_data["split_horizon"] = "enabled"
        result["interfaces"].append(iface_data)

    # Parse passive interfaces
    passive_raw = raw_config.get("passive-interface", {})
    if isinstance(passive_raw, dict):
        result["passive_interfaces"]["default"] = "default" in passive_raw
        result["passive_interfaces"]["interfaces"] = [k for k in passive_raw.keys() if k != "default"]

    # Parse redistribution
    redistribute_raw = raw_config.get("redistribute", {})
    for protocol, redist_config in redistribute_raw.items():
        redist_data = {
            "protocol": protocol,
            "route_map": redist_config.get("route-map") if isinstance(redist_config, dict) else None,
            "metric": int(redist_config["metric"]) if isinstance(redist_config, dict) and redist_config.get("metric") else None,
        }
        result["redistributions"].append(redist_data)

    # Parse timers
    timers_raw = raw_config.get("timers", {})
    if timers_raw:
        result["timers"] = {
            "update": int(timers_raw["update"]) if timers_raw.get("update") else None,
            "timeout": int(timers_raw["timeout"]) if timers_raw.get("timeout") else None,
            "garbage_collection": int(timers_raw["garbage-collection"]) if timers_raw.get("garbage-collection") else None,
        }

    return result


# ============================================================================
# Read Endpoints
# ============================================================================

@router.get("/config")
async def get_rip_config(http_request: Request) -> RIPConfigResponse:
    """Get the current RIP configuration."""
    await require_read_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("protocols", {}).get("rip", {})

        parsed = parse_rip_config(raw_config)

        return RIPConfigResponse(
            configured=parsed["configured"],
            networks=parsed["networks"],
            interfaces=[RIPInterface(**iface) for iface in parsed["interfaces"]],
            passive_interfaces=RIPPassiveInterfaces(**parsed["passive_interfaces"]),
            neighbors=parsed["neighbors"],
            redistributions=[RIPRedistribution(**r) for r in parsed["redistributions"]],
            version=parsed["version"],
            default_distance=parsed["default_distance"],
            default_information_originate=parsed["default_information_originate"],
            timers=RIPTimers(**parsed["timers"]) if parsed["timers"] else None,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_rip_capabilities(http_request: Request) -> Dict[str, Any]:
    """Get RIP capabilities for the connected VyOS version."""
    await require_read_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        return {
            "version": version,
            "rip_versions": [
                {"value": "1", "label": "Version 1", "description": "RIPv1 - Classful routing"},
                {"value": "2", "label": "Version 2", "description": "RIPv2 - Classless routing with VLSM"},
            ],
            "redistribute_protocols": [
                {"value": "bgp", "label": "BGP"},
                {"value": "connected", "label": "Connected"},
                {"value": "isis", "label": "IS-IS"},
                {"value": "kernel", "label": "Kernel"},
                {"value": "ospf", "label": "OSPF"},
                {"value": "static", "label": "Static"},
            ],
            "split_horizon_modes": [
                {"value": "enabled", "label": "Enabled", "description": "Standard split horizon"},
                {"value": "disabled", "label": "Disabled", "description": "No split horizon"},
                {"value": "poison-reverse", "label": "Poison Reverse", "description": "Split horizon with poison reverse"},
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
async def enable_rip(http_request: Request, request: EnableRIPRequest) -> VyOSResponse:
    """Enable RIP with optional configuration."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = [["protocols", "rip"]]

        if request.version:
            set_commands.append(["protocols", "rip", "version", request.version])

        if request.default_distance is not None:
            set_commands.append(["protocols", "rip", "default-distance", str(request.default_distance)])

        if request.default_information_originate:
            set_commands.append(["protocols", "rip", "default-information", "originate"])

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            message="RIP enabled",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/disable")
async def disable_rip(http_request: Request) -> VyOSResponse:
    """Disable RIP completely."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "rip"]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message="RIP disabled",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Network Endpoints
# ============================================================================

@router.post("/network")
async def add_network(http_request: Request, request: AddNetworkRequest) -> VyOSResponse:
    """Add a network to RIP."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=[["protocols", "rip", "network", request.network]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message=f"Network {request.network} added to RIP",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/network/{network:path}")
async def delete_network(http_request: Request, network: str) -> VyOSResponse:
    """Remove a network from RIP."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "rip", "network", network]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message=f"Network {network} removed from RIP",
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
    """Configure an interface for RIP."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = [["protocols", "rip", "interface", request.interface]]

        if request.send:
            set_commands.append(["protocols", "rip", "interface", request.interface, "send", request.send])

        if request.receive:
            set_commands.append(["protocols", "rip", "interface", request.interface, "receive", request.receive])

        if request.split_horizon:
            if request.split_horizon == "disabled":
                set_commands.append(["protocols", "rip", "interface", request.interface, "split-horizon", "disable"])
            elif request.split_horizon == "poison-reverse":
                set_commands.append(["protocols", "rip", "interface", request.interface, "split-horizon", "poison-reverse"])

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
    """Remove an interface from RIP."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "rip", "interface", interface]]
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
# Passive Interface Endpoints
# ============================================================================

@router.put("/passive-interface")
async def set_passive_interfaces(http_request: Request, request: SetPassiveInterfacesRequest) -> VyOSResponse:
    """Set passive interfaces for RIP."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        # First delete all passive interfaces, then set new ones
        delete_commands = [["protocols", "rip", "passive-interface"]]
        set_commands = []

        if request.default:
            set_commands.append(["protocols", "rip", "passive-interface", "default"])

        for iface in request.interfaces:
            set_commands.append(["protocols", "rip", "passive-interface", iface])

        # Execute delete first, then set
        await run_in_threadpool(service.configure_batch, delete_commands=delete_commands)

        if set_commands:
            response = await run_in_threadpool(service.configure_batch, set_commands=set_commands)
        else:
            response = type('obj', (object,), {'status': 200, 'error': None})()

        return VyOSResponse(
            success=response.status == 200,
            message="Passive interfaces updated",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Neighbor Endpoints
# ============================================================================

@router.post("/neighbor")
async def add_neighbor(http_request: Request, request: AddNeighborRequest) -> VyOSResponse:
    """Add a neighbor (for non-broadcast networks)."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=[["protocols", "rip", "neighbor", request.neighbor]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message=f"Neighbor {request.neighbor} added",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/neighbor/{neighbor}")
async def delete_neighbor(http_request: Request, neighbor: str) -> VyOSResponse:
    """Remove a neighbor."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "rip", "neighbor", neighbor]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message=f"Neighbor {neighbor} removed",
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
    """Add protocol redistribution into RIP."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = [["protocols", "rip", "redistribute", request.protocol]]

        if request.route_map:
            set_commands.append(["protocols", "rip", "redistribute", request.protocol, "route-map", request.route_map])

        if request.metric is not None:
            set_commands.append(["protocols", "rip", "redistribute", request.protocol, "metric", str(request.metric)])

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
    """Remove protocol redistribution from RIP."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "rip", "redistribute", protocol]]
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
# Timer Endpoints
# ============================================================================

@router.put("/timers")
async def set_timers(http_request: Request, request: SetTimersRequest) -> VyOSResponse:
    """Set RIP timers."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = []

        if request.update is not None:
            set_commands.append(["protocols", "rip", "timers", "update", str(request.update)])

        if request.timeout is not None:
            set_commands.append(["protocols", "rip", "timers", "timeout", str(request.timeout)])

        if request.garbage_collection is not None:
            set_commands.append(["protocols", "rip", "timers", "garbage-collection", str(request.garbage_collection)])

        if not set_commands:
            return VyOSResponse(success=True, message="No timers to update")

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            message="RIP timers updated",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/timers")
async def reset_timers(http_request: Request) -> VyOSResponse:
    """Reset RIP timers to defaults."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "rip", "timers"]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message="RIP timers reset to defaults",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Version Endpoints
# ============================================================================

@router.put("/version/{version}")
async def set_version(http_request: Request, version: str) -> VyOSResponse:
    """Set RIP version (1 or 2)."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    if version not in ["1", "2"]:
        raise HTTPException(status_code=400, detail="Version must be 1 or 2")

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=[["protocols", "rip", "version", version]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message=f"RIP version set to {version}",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/version")
async def reset_version(http_request: Request) -> VyOSResponse:
    """Reset RIP version to default."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "rip", "version"]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message="RIP version reset to default",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Default Information Endpoints
# ============================================================================

@router.post("/default-information/originate")
async def enable_default_information_originate(http_request: Request) -> VyOSResponse:
    """Enable default information originate."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=[["protocols", "rip", "default-information", "originate"]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message="Default information originate enabled",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/default-information/originate")
async def disable_default_information_originate(http_request: Request) -> VyOSResponse:
    """Disable default information originate."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "rip", "default-information", "originate"]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message="Default information originate disabled",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
