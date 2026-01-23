"""
OSPFv3 Protocol Configuration Endpoints

All OSPFv3 (OSPF for IPv6) configuration endpoints for VyOS.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

router = APIRouter(prefix="/vyos/protocols/ospfv3", tags=["ospfv3-protocol"])


# ============================================================================
# Response Models
# ============================================================================

class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None
    message: Optional[str] = None


class OSPFv3Range(BaseModel):
    """OSPFv3 area range configuration"""
    prefix: str
    advertise: bool = True
    not_advertise: bool = False


class OSPFv3Area(BaseModel):
    """OSPFv3 area configuration"""
    id: str
    type: str = "normal"
    ranges: List[OSPFv3Range] = []
    export_list: Optional[str] = None
    import_list: Optional[str] = None


class OSPFv3Interface(BaseModel):
    """OSPFv3 interface configuration"""
    name: str
    area: Optional[str] = None
    cost: Optional[int] = None
    priority: Optional[int] = None
    hello_interval: Optional[int] = None
    dead_interval: Optional[int] = None
    retransmit_interval: Optional[int] = None
    transmit_delay: Optional[int] = None
    network: Optional[str] = None
    passive: bool = False
    mtu_ignore: bool = False
    bfd: bool = False
    instance_id: Optional[int] = None
    ifmtu: Optional[int] = None


class OSPFv3Redistribution(BaseModel):
    """OSPFv3 redistribution configuration"""
    protocol: str
    route_map: Optional[str] = None


class OSPFv3DefaultInfo(BaseModel):
    """OSPFv3 default information configuration"""
    originate: bool
    always: bool = False
    metric: Optional[int] = None
    metric_type: Optional[int] = None
    route_map: Optional[str] = None


class OSPFv3Distance(BaseModel):
    """OSPFv3 distance configuration"""
    global_distance: Optional[int] = Field(None, alias="global")
    external: Optional[int] = None
    inter_area: Optional[int] = None
    intra_area: Optional[int] = None


class OSPFv3ConfigResponse(BaseModel):
    """Full OSPFv3 configuration response"""
    configured: bool
    router_id: Optional[str] = None
    areas: List[OSPFv3Area] = []
    interfaces: List[OSPFv3Interface] = []
    redistributions: List[OSPFv3Redistribution] = []
    default_information: Optional[OSPFv3DefaultInfo] = None
    distance: Optional[OSPFv3Distance] = None
    graceful_restart: bool = False


# ============================================================================
# Request Models
# ============================================================================

class EnableOSPFv3Request(BaseModel):
    """Request to enable OSPFv3"""
    router_id: Optional[str] = Field(None, description="Router ID (IPv4 format)")


class AddAreaRequest(BaseModel):
    """Request to add an area"""
    area: str = Field(..., description="Area ID (e.g., 0.0.0.0 or 0)")
    area_type: Optional[str] = Field(None, description="Area type: stub, nssa, normal")
    no_summary: bool = False


class AddAreaRangeRequest(BaseModel):
    """Request to add an area range"""
    area: str
    prefix: str = Field(..., description="IPv6 prefix for summarization")
    not_advertise: bool = False


class AddInterfaceRequest(BaseModel):
    """Request to configure an interface"""
    interface: str
    area: str = Field(..., description="Area to assign interface to")
    cost: Optional[int] = Field(None, ge=1, le=65535)
    priority: Optional[int] = Field(None, ge=0, le=255)
    hello_interval: Optional[int] = Field(None, ge=1, le=65535)
    dead_interval: Optional[int] = Field(None, ge=1, le=65535)
    network: Optional[str] = Field(None, description="Network type: broadcast, point-to-point")
    passive: bool = False
    mtu_ignore: bool = False
    bfd: bool = False
    instance_id: Optional[int] = Field(None, ge=0, le=255)


class AddRedistributionRequest(BaseModel):
    """Request to add redistribution"""
    protocol: str = Field(..., description="Protocol to redistribute: bgp, connected, kernel, ripng, static")
    route_map: Optional[str] = None


class SetDefaultInfoRequest(BaseModel):
    """Request to set default information originate"""
    always: bool = False
    metric: Optional[int] = Field(None, ge=0, le=16777214)
    metric_type: Optional[int] = Field(None, ge=1, le=2)
    route_map: Optional[str] = None


class SetDistanceRequest(BaseModel):
    """Request to set distance"""
    global_distance: Optional[int] = Field(None, ge=1, le=255, alias="global")
    external: Optional[int] = Field(None, ge=1, le=255)
    inter_area: Optional[int] = Field(None, ge=1, le=255)
    intra_area: Optional[int] = Field(None, ge=1, le=255)


# ============================================================================
# Parser Functions
# ============================================================================

def parse_ospfv3_config(raw_config: Dict[str, Any]) -> Dict[str, Any]:
    """Parse raw OSPFv3 config from VyOS into structured format."""
    if not raw_config:
        return {
            "configured": False,
            "router_id": None,
            "areas": [],
            "interfaces": [],
            "redistributions": [],
            "default_information": None,
            "distance": None,
            "graceful_restart": False,
        }

    result = {
        "configured": True,
        "router_id": raw_config.get("parameters", {}).get("router-id"),
        "areas": [],
        "interfaces": [],
        "redistributions": [],
        "default_information": None,
        "distance": None,
        "graceful_restart": "graceful-restart" in raw_config,
    }

    # Parse areas
    areas_raw = raw_config.get("area", {})
    for area_id, area_config in areas_raw.items():
        area_data = {
            "id": area_id,
            "type": "normal",
            "ranges": [],
            "export_list": area_config.get("export-list"),
            "import_list": area_config.get("import-list"),
        }

        if "area-type" in area_config:
            area_type = area_config["area-type"]
            if "stub" in area_type:
                if area_type.get("stub", {}).get("no-summary") is not None:
                    area_data["type"] = "totally-stubby"
                else:
                    area_data["type"] = "stub"
            elif "nssa" in area_type:
                if area_type.get("nssa", {}).get("no-summary") is not None:
                    area_data["type"] = "nssa-totally-stubby"
                else:
                    area_data["type"] = "nssa"

        # Parse ranges
        ranges_raw = area_config.get("range", {})
        for prefix, range_config in ranges_raw.items():
            range_data = {
                "prefix": prefix,
                "advertise": "not-advertise" not in (range_config or {}),
                "not_advertise": "not-advertise" in (range_config or {}),
            }
            area_data["ranges"].append(range_data)

        result["areas"].append(area_data)

    # Parse interfaces
    interfaces_raw = raw_config.get("interface", {})
    for iface_name, iface_config in interfaces_raw.items():
        iface_data = {
            "name": iface_name,
            "area": iface_config.get("area"),
            "cost": int(iface_config["cost"]) if iface_config.get("cost") else None,
            "priority": int(iface_config["priority"]) if iface_config.get("priority") else None,
            "hello_interval": int(iface_config["hello-interval"]) if iface_config.get("hello-interval") else None,
            "dead_interval": int(iface_config["dead-interval"]) if iface_config.get("dead-interval") else None,
            "retransmit_interval": int(iface_config["retransmit-interval"]) if iface_config.get("retransmit-interval") else None,
            "transmit_delay": int(iface_config["transmit-delay"]) if iface_config.get("transmit-delay") else None,
            "network": iface_config.get("network"),
            "passive": "passive" in iface_config,
            "mtu_ignore": "mtu-ignore" in iface_config,
            "bfd": "bfd" in iface_config,
            "instance_id": int(iface_config["instance-id"]) if iface_config.get("instance-id") else None,
            "ifmtu": int(iface_config["ifmtu"]) if iface_config.get("ifmtu") else None,
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

    # Parse default information
    default_info = raw_config.get("default-information", {})
    if "originate" in default_info:
        orig_config = default_info["originate"]
        result["default_information"] = {
            "originate": True,
            "always": "always" in (orig_config or {}),
            "metric": int(orig_config["metric"]) if isinstance(orig_config, dict) and orig_config.get("metric") else None,
            "metric_type": int(orig_config["metric-type"]) if isinstance(orig_config, dict) and orig_config.get("metric-type") else None,
            "route_map": orig_config.get("route-map") if isinstance(orig_config, dict) else None,
        }

    # Parse distance
    distance_raw = raw_config.get("distance", {})
    if distance_raw:
        result["distance"] = {
            "global": int(distance_raw["global"]) if distance_raw.get("global") else None,
            "external": int(distance_raw["ospfv3"]["external"]) if distance_raw.get("ospfv3", {}).get("external") else None,
            "inter_area": int(distance_raw["ospfv3"]["inter-area"]) if distance_raw.get("ospfv3", {}).get("inter-area") else None,
            "intra_area": int(distance_raw["ospfv3"]["intra-area"]) if distance_raw.get("ospfv3", {}).get("intra-area") else None,
        }

    return result


# ============================================================================
# Read Endpoints
# ============================================================================

@router.get("/config")
async def get_ospfv3_config(http_request: Request) -> OSPFv3ConfigResponse:
    """
    Get the current OSPFv3 configuration.

    Returns the full OSPFv3 configuration including areas, interfaces,
    redistribution, and other settings.
    """
    await require_read_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("protocols", {}).get("ospfv3", {})

        parsed = parse_ospfv3_config(raw_config)

        return OSPFv3ConfigResponse(
            configured=parsed["configured"],
            router_id=parsed["router_id"],
            areas=[OSPFv3Area(**area) for area in parsed["areas"]],
            interfaces=[OSPFv3Interface(**iface) for iface in parsed["interfaces"]],
            redistributions=[OSPFv3Redistribution(**r) for r in parsed["redistributions"]],
            default_information=OSPFv3DefaultInfo(**parsed["default_information"]) if parsed["default_information"] else None,
            distance=OSPFv3Distance(**parsed["distance"]) if parsed["distance"] else None,
            graceful_restart=parsed["graceful_restart"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_ospfv3_capabilities(http_request: Request) -> Dict[str, Any]:
    """Get OSPFv3 capabilities for the connected VyOS version."""
    await require_read_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        return {
            "version": version,
            "area_types": [
                {"value": "normal", "label": "Normal", "description": "Standard OSPF area"},
                {"value": "stub", "label": "Stub", "description": "No external routes"},
                {"value": "nssa", "label": "NSSA", "description": "Not-so-stubby area"},
            ],
            "network_types": [
                {"value": "broadcast", "label": "Broadcast", "description": "Multi-access broadcast network"},
                {"value": "point-to-point", "label": "Point-to-Point", "description": "Point-to-point link"},
            ],
            "redistribute_protocols": [
                {"value": "bgp", "label": "BGP"},
                {"value": "connected", "label": "Connected"},
                {"value": "kernel", "label": "Kernel"},
                {"value": "ripng", "label": "RIPng"},
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
async def enable_ospfv3(http_request: Request, request: EnableOSPFv3Request) -> VyOSResponse:
    """Enable OSPFv3 with optional router ID."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = [["protocols", "ospfv3"]]

        if request.router_id:
            set_commands.append(["protocols", "ospfv3", "parameters", "router-id", request.router_id])

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            message="OSPFv3 enabled",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/disable")
async def disable_ospfv3(http_request: Request) -> VyOSResponse:
    """Disable OSPFv3 completely."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "ospfv3"]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message="OSPFv3 disabled",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Router ID Endpoints
# ============================================================================

@router.put("/router-id/{router_id}")
async def set_router_id(http_request: Request, router_id: str) -> VyOSResponse:
    """Set OSPFv3 router ID."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=[["protocols", "ospfv3", "parameters", "router-id", router_id]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message=f"Router ID set to {router_id}",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/router-id")
async def delete_router_id(http_request: Request) -> VyOSResponse:
    """Remove OSPFv3 router ID."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "ospfv3", "parameters", "router-id"]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message="Router ID removed",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Area Endpoints
# ============================================================================

@router.post("/area")
async def add_area(http_request: Request, request: AddAreaRequest) -> VyOSResponse:
    """Add or configure an OSPFv3 area."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = [["protocols", "ospfv3", "area", request.area]]

        if request.area_type == "stub":
            if request.no_summary:
                set_commands.append(["protocols", "ospfv3", "area", request.area, "area-type", "stub", "no-summary"])
            else:
                set_commands.append(["protocols", "ospfv3", "area", request.area, "area-type", "stub"])
        elif request.area_type == "nssa":
            if request.no_summary:
                set_commands.append(["protocols", "ospfv3", "area", request.area, "area-type", "nssa", "no-summary"])
            else:
                set_commands.append(["protocols", "ospfv3", "area", request.area, "area-type", "nssa"])

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            message=f"Area {request.area} configured",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/area/{area}")
async def delete_area(http_request: Request, area: str) -> VyOSResponse:
    """Delete an OSPFv3 area."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "ospfv3", "area", area]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message=f"Area {area} removed",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Area Range Endpoints
# ============================================================================

@router.post("/area/range")
async def add_area_range(http_request: Request, request: AddAreaRangeRequest) -> VyOSResponse:
    """Add a range to an OSPFv3 area."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = [["protocols", "ospfv3", "area", request.area, "range", request.prefix]]

        if request.not_advertise:
            set_commands.append(["protocols", "ospfv3", "area", request.area, "range", request.prefix, "not-advertise"])

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            message=f"Range {request.prefix} added to area {request.area}",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/area/{area}/range/{prefix:path}")
async def delete_area_range(http_request: Request, area: str, prefix: str) -> VyOSResponse:
    """Remove a range from an OSPFv3 area."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "ospfv3", "area", area, "range", prefix]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message=f"Range {prefix} removed from area {area}",
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
    """Configure an interface for OSPFv3."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = [
            ["protocols", "ospfv3", "interface", request.interface],
            ["protocols", "ospfv3", "interface", request.interface, "area", request.area],
        ]

        if request.cost is not None:
            set_commands.append(["protocols", "ospfv3", "interface", request.interface, "cost", str(request.cost)])

        if request.priority is not None:
            set_commands.append(["protocols", "ospfv3", "interface", request.interface, "priority", str(request.priority)])

        if request.hello_interval is not None:
            set_commands.append(["protocols", "ospfv3", "interface", request.interface, "hello-interval", str(request.hello_interval)])

        if request.dead_interval is not None:
            set_commands.append(["protocols", "ospfv3", "interface", request.interface, "dead-interval", str(request.dead_interval)])

        if request.network:
            set_commands.append(["protocols", "ospfv3", "interface", request.interface, "network", request.network])

        if request.passive:
            set_commands.append(["protocols", "ospfv3", "interface", request.interface, "passive"])

        if request.mtu_ignore:
            set_commands.append(["protocols", "ospfv3", "interface", request.interface, "mtu-ignore"])

        if request.bfd:
            set_commands.append(["protocols", "ospfv3", "interface", request.interface, "bfd"])

        if request.instance_id is not None:
            set_commands.append(["protocols", "ospfv3", "interface", request.interface, "instance-id", str(request.instance_id)])

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
    """Remove an interface from OSPFv3."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "ospfv3", "interface", interface]]
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
    """Add protocol redistribution into OSPFv3."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = [["protocols", "ospfv3", "redistribute", request.protocol]]

        if request.route_map:
            set_commands.append(["protocols", "ospfv3", "redistribute", request.protocol, "route-map", request.route_map])

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
    """Remove protocol redistribution from OSPFv3."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "ospfv3", "redistribute", protocol]]
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
# Default Information Endpoints
# ============================================================================

@router.post("/default-information/originate")
async def set_default_information(http_request: Request, request: SetDefaultInfoRequest) -> VyOSResponse:
    """Configure default information originate."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = [["protocols", "ospfv3", "default-information", "originate"]]

        if request.always:
            set_commands.append(["protocols", "ospfv3", "default-information", "originate", "always"])

        if request.metric is not None:
            set_commands.append(["protocols", "ospfv3", "default-information", "originate", "metric", str(request.metric)])

        if request.metric_type is not None:
            set_commands.append(["protocols", "ospfv3", "default-information", "originate", "metric-type", str(request.metric_type)])

        if request.route_map:
            set_commands.append(["protocols", "ospfv3", "default-information", "originate", "route-map", request.route_map])

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            message="Default information originate configured",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/default-information/originate")
async def delete_default_information(http_request: Request) -> VyOSResponse:
    """Remove default information originate."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "ospfv3", "default-information", "originate"]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message="Default information originate removed",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Distance Endpoints
# ============================================================================

@router.put("/distance")
async def set_distance(http_request: Request, request: SetDistanceRequest) -> VyOSResponse:
    """Set OSPFv3 distance values."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        set_commands = []

        if request.global_distance is not None:
            set_commands.append(["protocols", "ospfv3", "distance", "global", str(request.global_distance)])

        if request.external is not None:
            set_commands.append(["protocols", "ospfv3", "distance", "ospfv3", "external", str(request.external)])

        if request.inter_area is not None:
            set_commands.append(["protocols", "ospfv3", "distance", "ospfv3", "inter-area", str(request.inter_area)])

        if request.intra_area is not None:
            set_commands.append(["protocols", "ospfv3", "distance", "ospfv3", "intra-area", str(request.intra_area)])

        if not set_commands:
            return VyOSResponse(success=True, message="No distance values to update")

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            message="Distance values updated",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/distance")
async def reset_distance(http_request: Request) -> VyOSResponse:
    """Reset OSPFv3 distance to defaults."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "ospfv3", "distance"]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message="Distance reset to defaults",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Graceful Restart Endpoints
# ============================================================================

@router.post("/graceful-restart")
async def enable_graceful_restart(http_request: Request) -> VyOSResponse:
    """Enable OSPFv3 graceful restart."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=[
                ["protocols", "ospfv3", "graceful-restart"],
                ["protocols", "ospfv3", "graceful-restart", "helper", "enable"],
            ]
        )

        return VyOSResponse(
            success=response.status == 200,
            message="Graceful restart enabled",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/graceful-restart")
async def disable_graceful_restart(http_request: Request) -> VyOSResponse:
    """Disable OSPFv3 graceful restart."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.configure_batch,
            delete_commands=[["protocols", "ospfv3", "graceful-restart"]]
        )

        return VyOSResponse(
            success=response.status == 200,
            message="Graceful restart disabled",
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
