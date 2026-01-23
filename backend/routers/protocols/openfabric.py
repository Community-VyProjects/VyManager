"""
OpenFabric Protocol Configuration Endpoints

All OpenFabric routing protocol configuration endpoints for VyOS.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

router = APIRouter(prefix="/vyos/protocols/openfabric", tags=["openfabric-protocol"])


# ============================================================================
# Response Models
# ============================================================================

class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None
    message: Optional[str] = None


class OpenFabricInterface(BaseModel):
    name: str
    passive: bool = False
    metric: Optional[int] = None
    hello_interval: Optional[int] = None
    hello_multiplier: Optional[int] = None
    csnp_interval: Optional[int] = None
    psnp_interval: Optional[int] = None
    password: bool = False


class OpenFabricRedistribution(BaseModel):
    level: str
    protocol: str
    route_map: Optional[str] = None
    metric: Optional[int] = None


class OpenFabricSRPrefix(BaseModel):
    prefix: str
    index: Optional[int] = None


class OpenFabricSegmentRouting(BaseModel):
    enabled: bool = False
    global_block_low: Optional[int] = None
    global_block_high: Optional[int] = None
    prefixes: List[OpenFabricSRPrefix] = []


class OpenFabricFabric(BaseModel):
    name: str
    net: List[str] = []
    interfaces: List[OpenFabricInterface] = []
    redistributions: List[OpenFabricRedistribution] = []
    log_adjacency_changes: bool = False
    set_overload_bit: bool = False
    lsp_gen_interval: Optional[int] = None
    lsp_refresh_interval: Optional[int] = None
    max_lsp_lifetime: Optional[int] = None
    spf_interval: Optional[int] = None
    domain_password: bool = False
    segment_routing: Optional[OpenFabricSegmentRouting] = None


class OpenFabricConfigResponse(BaseModel):
    configured: bool
    fabrics: List[OpenFabricFabric] = []


# ============================================================================
# Request Models
# ============================================================================

class CreateFabricRequest(BaseModel):
    name: str = Field(..., description="Fabric name")
    net: str = Field(..., description="Network Entity Title (e.g., 49.0001.0000.0000.0001.00)")
    log_adjacency_changes: bool = False
    set_overload_bit: bool = False


class AddNETRequest(BaseModel):
    fabric: str
    net: str = Field(..., description="Network Entity Title")


class AddInterfaceRequest(BaseModel):
    fabric: str
    interface: str
    passive: bool = False
    metric: Optional[int] = Field(None, ge=0, le=16777215)
    hello_interval: Optional[int] = Field(None, ge=1, le=600)
    hello_multiplier: Optional[int] = Field(None, ge=2, le=100)


class AddRedistributionRequest(BaseModel):
    fabric: str
    level: str = Field(..., description="Level: level-1, level-2")
    protocol: str = Field(..., description="Protocol to redistribute: bgp, connected, kernel, static")
    route_map: Optional[str] = None
    metric: Optional[int] = None


class SetTimersRequest(BaseModel):
    fabric: str
    lsp_gen_interval: Optional[int] = Field(None, ge=1, le=120)
    lsp_refresh_interval: Optional[int] = Field(None, ge=1, le=65535)
    max_lsp_lifetime: Optional[int] = Field(None, ge=350, le=65535)
    spf_interval: Optional[int] = Field(None, ge=1, le=120)


# ============================================================================
# Parser Functions
# ============================================================================

def parse_openfabric_config(raw_config: Dict[str, Any]) -> Dict[str, Any]:
    """Parse raw OpenFabric config from VyOS into structured format."""
    if not raw_config:
        return {"configured": False, "fabrics": []}

    fabrics = []
    for fabric_name, fabric_config in raw_config.items():
        if not isinstance(fabric_config, dict):
            continue

        fabric = {
            "name": fabric_name,
            "net": list(fabric_config.get("net", {}).keys()) if isinstance(fabric_config.get("net"), dict) else [],
            "interfaces": [],
            "redistributions": [],
            "log_adjacency_changes": "log-adjacency-changes" in fabric_config,
            "set_overload_bit": "set-overload-bit" in fabric_config,
            "lsp_gen_interval": int(fabric_config["lsp-gen-interval"]) if fabric_config.get("lsp-gen-interval") else None,
            "lsp_refresh_interval": int(fabric_config["lsp-refresh-interval"]) if fabric_config.get("lsp-refresh-interval") else None,
            "max_lsp_lifetime": int(fabric_config["max-lsp-lifetime"]) if fabric_config.get("max-lsp-lifetime") else None,
            "spf_interval": int(fabric_config["spf-interval"]) if fabric_config.get("spf-interval") else None,
            "domain_password": "domain-password" in fabric_config,
            "segment_routing": None,
        }

        # Parse interfaces
        for iface_name, iface_config in fabric_config.get("interface", {}).items():
            iface_config = iface_config or {}
            iface_data = {
                "name": iface_name,
                "passive": "passive" in iface_config,
                "metric": int(iface_config["metric"]) if iface_config.get("metric") else None,
                "hello_interval": int(iface_config["hello-interval"]) if iface_config.get("hello-interval") else None,
                "hello_multiplier": int(iface_config["hello-multiplier"]) if iface_config.get("hello-multiplier") else None,
                "csnp_interval": int(iface_config["csnp-interval"]) if iface_config.get("csnp-interval") else None,
                "psnp_interval": int(iface_config["psnp-interval"]) if iface_config.get("psnp-interval") else None,
                "password": "password" in iface_config,
            }
            fabric["interfaces"].append(iface_data)

        # Parse redistributions
        redistribute_raw = fabric_config.get("redistribute", {})
        for level_key, level_config in redistribute_raw.items():
            if isinstance(level_config, dict):
                for protocol, redist_config in level_config.items():
                    fabric["redistributions"].append({
                        "level": level_key,
                        "protocol": protocol,
                        "route_map": redist_config.get("route-map") if isinstance(redist_config, dict) else None,
                        "metric": int(redist_config["metric"]) if isinstance(redist_config, dict) and redist_config.get("metric") else None,
                    })

        # Parse segment routing
        sr_raw = fabric_config.get("segment-routing", {})
        if sr_raw:
            global_block = sr_raw.get("global-block", {})
            prefixes = []
            for prefix, prefix_config in sr_raw.get("prefix", {}).items():
                prefixes.append({
                    "prefix": prefix,
                    "index": int(prefix_config.get("index")) if isinstance(prefix_config, dict) and prefix_config.get("index") else None,
                })
            fabric["segment_routing"] = {
                "enabled": True,
                "global_block_low": int(global_block.get("low-label-value")) if global_block.get("low-label-value") else None,
                "global_block_high": int(global_block.get("high-label-value")) if global_block.get("high-label-value") else None,
                "prefixes": prefixes,
            }

        fabrics.append(fabric)

    return {"configured": bool(fabrics), "fabrics": fabrics}


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/config")
async def get_openfabric_config(http_request: Request) -> OpenFabricConfigResponse:
    """Get full OpenFabric configuration."""
    await require_read_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("protocols", {}).get("openfabric", {})
        parsed = parse_openfabric_config(raw_config)

        fabrics = []
        for fabric in parsed["fabrics"]:
            fabrics.append(OpenFabricFabric(
                name=fabric["name"],
                net=fabric["net"],
                interfaces=[OpenFabricInterface(**i) for i in fabric["interfaces"]],
                redistributions=[OpenFabricRedistribution(**r) for r in fabric["redistributions"]],
                log_adjacency_changes=fabric["log_adjacency_changes"],
                set_overload_bit=fabric["set_overload_bit"],
                lsp_gen_interval=fabric["lsp_gen_interval"],
                lsp_refresh_interval=fabric["lsp_refresh_interval"],
                max_lsp_lifetime=fabric["max_lsp_lifetime"],
                spf_interval=fabric["spf_interval"],
                domain_password=fabric["domain_password"],
                segment_routing=OpenFabricSegmentRouting(**fabric["segment_routing"]) if fabric["segment_routing"] else None,
            ))

        return OpenFabricConfigResponse(configured=parsed["configured"], fabrics=fabrics)
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_openfabric_capabilities(http_request: Request) -> Dict[str, Any]:
    """Get OpenFabric capabilities for the connected VyOS version."""
    await require_read_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        return {
            "version": service.get_version(),
            "redistribute_protocols": [
                {"value": "bgp", "label": "BGP"},
                {"value": "connected", "label": "Connected"},
                {"value": "kernel", "label": "Kernel"},
                {"value": "static", "label": "Static"},
            ],
            "levels": [
                {"value": "level-1", "label": "Level 1"},
                {"value": "level-2", "label": "Level 2"},
            ],
        }
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Fabric Endpoints
# ============================================================================

@router.post("/fabric")
async def create_fabric(http_request: Request, request: CreateFabricRequest) -> VyOSResponse:
    """Create a new OpenFabric instance."""
    await require_write_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        set_commands = [
            ["protocols", "openfabric", request.name],
            ["protocols", "openfabric", request.name, "net", request.net],
        ]
        if request.log_adjacency_changes:
            set_commands.append(["protocols", "openfabric", request.name, "log-adjacency-changes"])
        if request.set_overload_bit:
            set_commands.append(["protocols", "openfabric", request.name, "set-overload-bit"])
        response = await run_in_threadpool(service.configure_batch, set_commands=set_commands)
        return VyOSResponse(success=response.status == 200, message=f"OpenFabric '{request.name}' created")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/fabric/{name}")
async def delete_fabric(http_request: Request, name: str) -> VyOSResponse:
    """Delete an OpenFabric instance."""
    await require_write_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "openfabric", name]])
        return VyOSResponse(success=response.status == 200, message=f"OpenFabric '{name}' deleted")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# NET Endpoints
# ============================================================================

@router.post("/net")
async def add_net(http_request: Request, request: AddNETRequest) -> VyOSResponse:
    """Add a NET to a fabric."""
    await require_write_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, set_commands=[["protocols", "openfabric", request.fabric, "net", request.net]])
        return VyOSResponse(success=response.status == 200, message=f"NET {request.net} added to '{request.fabric}'")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/fabric/{fabric}/net/{net:path}")
async def delete_net(http_request: Request, fabric: str, net: str) -> VyOSResponse:
    """Remove a NET from a fabric."""
    await require_write_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "openfabric", fabric, "net", net]])
        return VyOSResponse(success=response.status == 200, message=f"NET {net} removed from '{fabric}'")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Interface Endpoints
# ============================================================================

@router.post("/interface")
async def configure_interface(http_request: Request, request: AddInterfaceRequest) -> VyOSResponse:
    """Configure an interface for OpenFabric."""
    await require_write_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        set_commands = [["protocols", "openfabric", request.fabric, "interface", request.interface]]
        if request.passive:
            set_commands.append(["protocols", "openfabric", request.fabric, "interface", request.interface, "passive"])
        if request.metric is not None:
            set_commands.append(["protocols", "openfabric", request.fabric, "interface", request.interface, "metric", str(request.metric)])
        if request.hello_interval is not None:
            set_commands.append(["protocols", "openfabric", request.fabric, "interface", request.interface, "hello-interval", str(request.hello_interval)])
        if request.hello_multiplier is not None:
            set_commands.append(["protocols", "openfabric", request.fabric, "interface", request.interface, "hello-multiplier", str(request.hello_multiplier)])
        response = await run_in_threadpool(service.configure_batch, set_commands=set_commands)
        return VyOSResponse(success=response.status == 200, message=f"Interface {request.interface} configured in '{request.fabric}'")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/fabric/{fabric}/interface/{interface}")
async def delete_interface(http_request: Request, fabric: str, interface: str) -> VyOSResponse:
    """Remove interface from OpenFabric."""
    await require_write_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "openfabric", fabric, "interface", interface]])
        return VyOSResponse(success=response.status == 200, message=f"Interface {interface} removed from '{fabric}'")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Redistribution Endpoints
# ============================================================================

@router.post("/redistribute")
async def add_redistribution(http_request: Request, request: AddRedistributionRequest) -> VyOSResponse:
    """Add protocol redistribution."""
    await require_write_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        set_commands = [["protocols", "openfabric", request.fabric, "redistribute", request.level, request.protocol]]
        if request.route_map:
            set_commands.append(["protocols", "openfabric", request.fabric, "redistribute", request.level, request.protocol, "route-map", request.route_map])
        if request.metric is not None:
            set_commands.append(["protocols", "openfabric", request.fabric, "redistribute", request.level, request.protocol, "metric", str(request.metric)])
        response = await run_in_threadpool(service.configure_batch, set_commands=set_commands)
        return VyOSResponse(success=response.status == 200, message=f"Redistribution of {request.protocol} added to '{request.fabric}' {request.level}")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/fabric/{fabric}/redistribute/{level}/{protocol}")
async def delete_redistribution(http_request: Request, fabric: str, level: str, protocol: str) -> VyOSResponse:
    """Remove protocol redistribution."""
    await require_write_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "openfabric", fabric, "redistribute", level, protocol]])
        return VyOSResponse(success=response.status == 200, message=f"Redistribution of {protocol} removed from '{fabric}' {level}")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Timer Endpoints
# ============================================================================

@router.put("/timers")
async def set_timers(http_request: Request, request: SetTimersRequest) -> VyOSResponse:
    """Set timer values."""
    await require_write_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        set_commands = []
        if request.lsp_gen_interval is not None:
            set_commands.append(["protocols", "openfabric", request.fabric, "lsp-gen-interval", str(request.lsp_gen_interval)])
        if request.lsp_refresh_interval is not None:
            set_commands.append(["protocols", "openfabric", request.fabric, "lsp-refresh-interval", str(request.lsp_refresh_interval)])
        if request.max_lsp_lifetime is not None:
            set_commands.append(["protocols", "openfabric", request.fabric, "max-lsp-lifetime", str(request.max_lsp_lifetime)])
        if request.spf_interval is not None:
            set_commands.append(["protocols", "openfabric", request.fabric, "spf-interval", str(request.spf_interval)])
        if not set_commands:
            return VyOSResponse(success=True, message="No timers to update")
        response = await run_in_threadpool(service.configure_batch, set_commands=set_commands)
        return VyOSResponse(success=response.status == 200, message=f"Timers updated for '{request.fabric}'")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Feature Toggle Endpoints
# ============================================================================

@router.post("/fabric/{fabric}/log-adjacency-changes")
async def enable_log_adjacency_changes(http_request: Request, fabric: str) -> VyOSResponse:
    """Enable logging adjacency changes."""
    await require_write_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, set_commands=[["protocols", "openfabric", fabric, "log-adjacency-changes"]])
        return VyOSResponse(success=response.status == 200, message=f"Adjacency logging enabled for '{fabric}'")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/fabric/{fabric}/log-adjacency-changes")
async def disable_log_adjacency_changes(http_request: Request, fabric: str) -> VyOSResponse:
    """Disable logging adjacency changes."""
    await require_write_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "openfabric", fabric, "log-adjacency-changes"]])
        return VyOSResponse(success=response.status == 200, message=f"Adjacency logging disabled for '{fabric}'")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.post("/fabric/{fabric}/set-overload-bit")
async def enable_overload_bit(http_request: Request, fabric: str) -> VyOSResponse:
    """Enable overload bit."""
    await require_write_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, set_commands=[["protocols", "openfabric", fabric, "set-overload-bit"]])
        return VyOSResponse(success=response.status == 200, message=f"Overload bit enabled for '{fabric}'")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/fabric/{fabric}/set-overload-bit")
async def disable_overload_bit(http_request: Request, fabric: str) -> VyOSResponse:
    """Disable overload bit."""
    await require_write_permission(http_request, FeatureGroup.OPENFABRIC)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "openfabric", fabric, "set-overload-bit"]])
        return VyOSResponse(success=response.status == 200, message=f"Overload bit disabled for '{fabric}'")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
