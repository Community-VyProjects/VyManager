"""
IS-IS Protocol Configuration Endpoints

All IS-IS configuration endpoints for VyOS.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

router = APIRouter(prefix="/vyos/protocols/isis", tags=["isis-protocol"])


# ============================================================================
# Response Models
# ============================================================================

class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None
    message: Optional[str] = None


class ISISInterface(BaseModel):
    name: str
    passive: bool = False
    circuit_type: Optional[str] = None
    metric: Optional[int] = None
    priority: Optional[int] = None
    hello_interval: Optional[int] = None
    hello_multiplier: Optional[int] = None
    network: Optional[str] = None
    bfd: bool = False


class ISISRedistribution(BaseModel):
    level: str
    protocol: str
    route_map: Optional[str] = None
    metric: Optional[int] = None


class ISISSPFDelay(BaseModel):
    init_delay: Optional[int] = None
    short_delay: Optional[int] = None
    long_delay: Optional[int] = None
    holddown: Optional[int] = None
    time_to_learn: Optional[int] = None


class ISISConfigResponse(BaseModel):
    configured: bool
    net: List[str] = []
    is_type: Optional[str] = None
    interfaces: List[ISISInterface] = []
    redistributions: List[ISISRedistribution] = []
    dynamic_hostname: bool = False
    metric_style: Optional[str] = None
    lsp_mtu: Optional[int] = None
    lsp_gen_interval: Optional[int] = None
    lsp_refresh_interval: Optional[int] = None
    max_lsp_lifetime: Optional[int] = None
    set_attached_bit: bool = False
    set_overload_bit: bool = False
    purge_originator: bool = False
    spf_delay: Optional[ISISSPFDelay] = None


# ============================================================================
# Request Models
# ============================================================================

class EnableISISRequest(BaseModel):
    net: str = Field(..., description="Network Entity Title (e.g., 49.0001.0000.0000.0001.00)")
    is_type: Optional[str] = Field(None, description="IS type: level-1, level-2, level-1-2")
    dynamic_hostname: bool = False
    metric_style: Optional[str] = Field(None, description="Metric style: narrow, wide, transition")


class AddNETRequest(BaseModel):
    net: str = Field(..., description="Network Entity Title")


class AddInterfaceRequest(BaseModel):
    interface: str
    passive: bool = False
    circuit_type: Optional[str] = Field(None, description="Circuit type: level-1, level-2, level-1-2")
    metric: Optional[int] = Field(None, ge=1, le=16777215)
    priority: Optional[int] = Field(None, ge=0, le=127)
    hello_interval: Optional[int] = Field(None, ge=1, le=600)
    hello_multiplier: Optional[int] = Field(None, ge=2, le=100)
    network: Optional[str] = Field(None, description="Network type: point-to-point")
    bfd: bool = False


class AddRedistributionRequest(BaseModel):
    level: str = Field(..., description="Level: level-1, level-2")
    protocol: str = Field(..., description="Protocol to redistribute: bgp, connected, kernel, ospf, static")
    route_map: Optional[str] = None
    metric: Optional[int] = None


class SetLSPParametersRequest(BaseModel):
    lsp_mtu: Optional[int] = Field(None, ge=128, le=4352)
    lsp_gen_interval: Optional[int] = Field(None, ge=1, le=120)
    lsp_refresh_interval: Optional[int] = Field(None, ge=1, le=65535)
    max_lsp_lifetime: Optional[int] = Field(None, ge=350, le=65535)


class SetSPFDelayRequest(BaseModel):
    init_delay: Optional[int] = Field(None, ge=0, le=60000)
    short_delay: Optional[int] = Field(None, ge=0, le=60000)
    long_delay: Optional[int] = Field(None, ge=0, le=60000)
    holddown: Optional[int] = Field(None, ge=0, le=60000)
    time_to_learn: Optional[int] = Field(None, ge=0, le=60000)


# ============================================================================
# Parser Functions
# ============================================================================

def parse_isis_config(raw_config: Dict[str, Any]) -> Dict[str, Any]:
    """Parse raw IS-IS config from VyOS into structured format."""
    if not raw_config:
        return {
            "configured": False, "net": [], "is_type": None, "interfaces": [],
            "redistributions": [], "dynamic_hostname": False, "metric_style": None,
            "lsp_mtu": None, "lsp_gen_interval": None, "lsp_refresh_interval": None,
            "max_lsp_lifetime": None, "set_attached_bit": False, "set_overload_bit": False,
            "purge_originator": False, "spf_delay": None,
        }

    result = {
        "configured": True,
        "net": list(raw_config.get("net", {}).keys()) if isinstance(raw_config.get("net"), dict) else [],
        "is_type": raw_config.get("is-type"),
        "interfaces": [],
        "redistributions": [],
        "dynamic_hostname": "dynamic-hostname" in raw_config,
        "metric_style": raw_config.get("metric-style"),
        "lsp_mtu": int(raw_config["lsp-mtu"]) if raw_config.get("lsp-mtu") else None,
        "lsp_gen_interval": int(raw_config["lsp-gen-interval"]) if raw_config.get("lsp-gen-interval") else None,
        "lsp_refresh_interval": int(raw_config["lsp-refresh-interval"]) if raw_config.get("lsp-refresh-interval") else None,
        "max_lsp_lifetime": int(raw_config["max-lsp-lifetime"]) if raw_config.get("max-lsp-lifetime") else None,
        "set_attached_bit": "set-attached-bit" in raw_config,
        "set_overload_bit": "set-overload-bit" in raw_config,
        "purge_originator": "purge-originator" in raw_config,
        "spf_delay": None,
    }

    # Parse interfaces
    for iface_name, iface_config in raw_config.get("interface", {}).items():
        iface_config = iface_config or {}
        iface_data = {
            "name": iface_name,
            "passive": "passive" in iface_config,
            "circuit_type": iface_config.get("circuit-type"),
            "metric": int(iface_config["metric"]) if iface_config.get("metric") else None,
            "priority": int(iface_config["priority"]) if iface_config.get("priority") else None,
            "hello_interval": int(iface_config["hello-interval"]) if iface_config.get("hello-interval") else None,
            "hello_multiplier": int(iface_config["hello-multiplier"]) if iface_config.get("hello-multiplier") else None,
            "network": "point-to-point" if "network" in iface_config and "point-to-point" in iface_config.get("network", {}) else None,
            "bfd": "bfd" in iface_config,
        }
        result["interfaces"].append(iface_data)

    # Parse redistributions
    redistribute_raw = raw_config.get("redistribute", {})
    for level_key, level_config in redistribute_raw.items():
        if isinstance(level_config, dict):
            for protocol, redist_config in level_config.items():
                result["redistributions"].append({
                    "level": level_key,
                    "protocol": protocol,
                    "route_map": redist_config.get("route-map") if isinstance(redist_config, dict) else None,
                    "metric": int(redist_config["metric"]) if isinstance(redist_config, dict) and redist_config.get("metric") else None,
                })

    # Parse SPF delay
    spf_delay_raw = raw_config.get("spf-delay-ietf", {})
    if spf_delay_raw:
        init_delay_raw = spf_delay_raw.get("init-delay", {})
        result["spf_delay"] = {
            "init_delay": int(init_delay_raw) if isinstance(init_delay_raw, (int, str)) and str(init_delay_raw).isdigit() else None,
            "short_delay": int(spf_delay_raw["short-delay"]) if spf_delay_raw.get("short-delay") else None,
            "long_delay": int(spf_delay_raw["long-delay"]) if spf_delay_raw.get("long-delay") else None,
            "holddown": int(spf_delay_raw["holddown"]) if spf_delay_raw.get("holddown") else None,
            "time_to_learn": int(spf_delay_raw["time-to-learn"]) if spf_delay_raw.get("time-to-learn") else None,
        }

    return result


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/config")
async def get_isis_config(http_request: Request) -> ISISConfigResponse:
    """Get full IS-IS configuration."""
    await require_read_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("protocols", {}).get("isis", {})
        parsed = parse_isis_config(raw_config)
        return ISISConfigResponse(
            configured=parsed["configured"],
            net=parsed["net"],
            is_type=parsed["is_type"],
            interfaces=[ISISInterface(**i) for i in parsed["interfaces"]],
            redistributions=[ISISRedistribution(**r) for r in parsed["redistributions"]],
            dynamic_hostname=parsed["dynamic_hostname"],
            metric_style=parsed["metric_style"],
            lsp_mtu=parsed["lsp_mtu"],
            lsp_gen_interval=parsed["lsp_gen_interval"],
            lsp_refresh_interval=parsed["lsp_refresh_interval"],
            max_lsp_lifetime=parsed["max_lsp_lifetime"],
            set_attached_bit=parsed["set_attached_bit"],
            set_overload_bit=parsed["set_overload_bit"],
            purge_originator=parsed["purge_originator"],
            spf_delay=ISISSPFDelay(**parsed["spf_delay"]) if parsed["spf_delay"] else None,
        )
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_isis_capabilities(http_request: Request) -> Dict[str, Any]:
    """Get IS-IS capabilities for the connected VyOS version."""
    await require_read_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        return {
            "version": service.get_version(),
            "is_types": [
                {"value": "level-1", "label": "Level 1", "description": "Intra-area routing only"},
                {"value": "level-2", "label": "Level 2", "description": "Inter-area routing only"},
                {"value": "level-1-2", "label": "Level 1-2", "description": "Both intra and inter-area routing"},
            ],
            "metric_styles": [
                {"value": "narrow", "label": "Narrow", "description": "Original 6-bit metric"},
                {"value": "wide", "label": "Wide", "description": "Extended 24-bit metric"},
                {"value": "transition", "label": "Transition", "description": "Both narrow and wide"},
            ],
            "circuit_types": [
                {"value": "level-1", "label": "Level 1"},
                {"value": "level-2", "label": "Level 2"},
                {"value": "level-1-2", "label": "Level 1-2"},
            ],
            "redistribute_protocols": [
                {"value": "bgp", "label": "BGP"},
                {"value": "connected", "label": "Connected"},
                {"value": "kernel", "label": "Kernel"},
                {"value": "ospf", "label": "OSPF"},
                {"value": "static", "label": "Static"},
            ],
        }
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.post("/enable")
async def enable_isis(http_request: Request, request: EnableISISRequest) -> VyOSResponse:
    """Enable IS-IS with basic configuration."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        set_commands = [
            ["protocols", "isis"],
            ["protocols", "isis", "net", request.net],
        ]
        if request.is_type:
            set_commands.append(["protocols", "isis", "is-type", request.is_type])
        if request.dynamic_hostname:
            set_commands.append(["protocols", "isis", "dynamic-hostname"])
        if request.metric_style:
            set_commands.append(["protocols", "isis", "metric-style", request.metric_style])
        response = await run_in_threadpool(service.configure_batch, set_commands=set_commands)
        return VyOSResponse(success=response.status == 200, message="IS-IS enabled")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/disable")
async def disable_isis(http_request: Request) -> VyOSResponse:
    """Disable IS-IS completely."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "isis"]])
        return VyOSResponse(success=response.status == 200, message="IS-IS disabled")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# NET Endpoints
# ============================================================================

@router.post("/net")
async def add_net(http_request: Request, request: AddNETRequest) -> VyOSResponse:
    """Add a NET to IS-IS."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, set_commands=[["protocols", "isis", "net", request.net]])
        return VyOSResponse(success=response.status == 200, message=f"NET {request.net} added")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/net/{net:path}")
async def delete_net(http_request: Request, net: str) -> VyOSResponse:
    """Remove a NET from IS-IS."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "isis", "net", net]])
        return VyOSResponse(success=response.status == 200, message=f"NET {net} removed")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Interface Endpoints
# ============================================================================

@router.post("/interface")
async def configure_interface(http_request: Request, request: AddInterfaceRequest) -> VyOSResponse:
    """Configure an interface for IS-IS."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        set_commands = [["protocols", "isis", "interface", request.interface]]
        if request.passive:
            set_commands.append(["protocols", "isis", "interface", request.interface, "passive"])
        if request.circuit_type:
            set_commands.append(["protocols", "isis", "interface", request.interface, "circuit-type", request.circuit_type])
        if request.metric is not None:
            set_commands.append(["protocols", "isis", "interface", request.interface, "metric", str(request.metric)])
        if request.priority is not None:
            set_commands.append(["protocols", "isis", "interface", request.interface, "priority", str(request.priority)])
        if request.hello_interval is not None:
            set_commands.append(["protocols", "isis", "interface", request.interface, "hello-interval", str(request.hello_interval)])
        if request.hello_multiplier is not None:
            set_commands.append(["protocols", "isis", "interface", request.interface, "hello-multiplier", str(request.hello_multiplier)])
        if request.network == "point-to-point":
            set_commands.append(["protocols", "isis", "interface", request.interface, "network", "point-to-point"])
        if request.bfd:
            set_commands.append(["protocols", "isis", "interface", request.interface, "bfd"])
        response = await run_in_threadpool(service.configure_batch, set_commands=set_commands)
        return VyOSResponse(success=response.status == 200, message=f"Interface {request.interface} configured")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/interface/{interface}")
async def delete_interface(http_request: Request, interface: str) -> VyOSResponse:
    """Remove interface from IS-IS."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "isis", "interface", interface]])
        return VyOSResponse(success=response.status == 200, message=f"Interface {interface} removed")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Redistribution Endpoints
# ============================================================================

@router.post("/redistribute")
async def add_redistribution(http_request: Request, request: AddRedistributionRequest) -> VyOSResponse:
    """Add protocol redistribution."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        set_commands = [["protocols", "isis", "redistribute", request.level, request.protocol]]
        if request.route_map:
            set_commands.append(["protocols", "isis", "redistribute", request.level, request.protocol, "route-map", request.route_map])
        if request.metric is not None:
            set_commands.append(["protocols", "isis", "redistribute", request.level, request.protocol, "metric", str(request.metric)])
        response = await run_in_threadpool(service.configure_batch, set_commands=set_commands)
        return VyOSResponse(success=response.status == 200, message=f"Redistribution of {request.protocol} to {request.level} added")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/redistribute/{level}/{protocol}")
async def delete_redistribution(http_request: Request, level: str, protocol: str) -> VyOSResponse:
    """Remove protocol redistribution."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "isis", "redistribute", level, protocol]])
        return VyOSResponse(success=response.status == 200, message=f"Redistribution of {protocol} from {level} removed")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# LSP Parameter Endpoints
# ============================================================================

@router.put("/lsp-parameters")
async def set_lsp_parameters(http_request: Request, request: SetLSPParametersRequest) -> VyOSResponse:
    """Set LSP parameters."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        set_commands = []
        if request.lsp_mtu is not None:
            set_commands.append(["protocols", "isis", "lsp-mtu", str(request.lsp_mtu)])
        if request.lsp_gen_interval is not None:
            set_commands.append(["protocols", "isis", "lsp-gen-interval", str(request.lsp_gen_interval)])
        if request.lsp_refresh_interval is not None:
            set_commands.append(["protocols", "isis", "lsp-refresh-interval", str(request.lsp_refresh_interval)])
        if request.max_lsp_lifetime is not None:
            set_commands.append(["protocols", "isis", "max-lsp-lifetime", str(request.max_lsp_lifetime)])
        if not set_commands:
            return VyOSResponse(success=True, message="No parameters to update")
        response = await run_in_threadpool(service.configure_batch, set_commands=set_commands)
        return VyOSResponse(success=response.status == 200, message="LSP parameters updated")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SPF Delay Endpoints
# ============================================================================

@router.put("/spf-delay")
async def set_spf_delay(http_request: Request, request: SetSPFDelayRequest) -> VyOSResponse:
    """Set SPF delay parameters."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        set_commands = []
        if request.init_delay is not None:
            set_commands.append(["protocols", "isis", "spf-delay-ietf", "init-delay", str(request.init_delay)])
        if request.short_delay is not None:
            set_commands.append(["protocols", "isis", "spf-delay-ietf", "short-delay", str(request.short_delay)])
        if request.long_delay is not None:
            set_commands.append(["protocols", "isis", "spf-delay-ietf", "long-delay", str(request.long_delay)])
        if request.holddown is not None:
            set_commands.append(["protocols", "isis", "spf-delay-ietf", "holddown", str(request.holddown)])
        if request.time_to_learn is not None:
            set_commands.append(["protocols", "isis", "spf-delay-ietf", "time-to-learn", str(request.time_to_learn)])
        if not set_commands:
            return VyOSResponse(success=True, message="No parameters to update")
        response = await run_in_threadpool(service.configure_batch, set_commands=set_commands)
        return VyOSResponse(success=response.status == 200, message="SPF delay parameters updated")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/spf-delay")
async def reset_spf_delay(http_request: Request) -> VyOSResponse:
    """Reset SPF delay to defaults."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "isis", "spf-delay-ietf"]])
        return VyOSResponse(success=response.status == 200, message="SPF delay reset to defaults")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# IS Type Endpoint
# ============================================================================

@router.put("/is-type/{is_type}")
async def set_is_type(http_request: Request, is_type: str) -> VyOSResponse:
    """Set IS type."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    if is_type not in ["level-1", "level-2", "level-1-2"]:
        return VyOSResponse(success=False, message="Invalid IS type", error="IS type must be level-1, level-2, or level-1-2")
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, set_commands=[["protocols", "isis", "is-type", is_type]])
        return VyOSResponse(success=response.status == 200, message=f"IS type set to {is_type}")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Feature Toggle Endpoints
# ============================================================================

@router.post("/dynamic-hostname")
async def enable_dynamic_hostname(http_request: Request) -> VyOSResponse:
    """Enable dynamic hostname."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, set_commands=[["protocols", "isis", "dynamic-hostname"]])
        return VyOSResponse(success=response.status == 200, message="Dynamic hostname enabled")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/dynamic-hostname")
async def disable_dynamic_hostname(http_request: Request) -> VyOSResponse:
    """Disable dynamic hostname."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "isis", "dynamic-hostname"]])
        return VyOSResponse(success=response.status == 200, message="Dynamic hostname disabled")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.put("/metric-style/{style}")
async def set_metric_style(http_request: Request, style: str) -> VyOSResponse:
    """Set metric style."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    if style not in ["narrow", "wide", "transition"]:
        return VyOSResponse(success=False, message="Invalid metric style", error="Metric style must be narrow, wide, or transition")
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, set_commands=[["protocols", "isis", "metric-style", style]])
        return VyOSResponse(success=response.status == 200, message=f"Metric style set to {style}")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.post("/set-overload-bit")
async def enable_overload_bit(http_request: Request) -> VyOSResponse:
    """Enable overload bit."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, set_commands=[["protocols", "isis", "set-overload-bit"]])
        return VyOSResponse(success=response.status == 200, message="Overload bit enabled")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/set-overload-bit")
async def disable_overload_bit(http_request: Request) -> VyOSResponse:
    """Disable overload bit."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "isis", "set-overload-bit"]])
        return VyOSResponse(success=response.status == 200, message="Overload bit disabled")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.post("/set-attached-bit")
async def enable_attached_bit(http_request: Request) -> VyOSResponse:
    """Enable attached bit."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, set_commands=[["protocols", "isis", "set-attached-bit"]])
        return VyOSResponse(success=response.status == 200, message="Attached bit enabled")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/set-attached-bit")
async def disable_attached_bit(http_request: Request) -> VyOSResponse:
    """Disable attached bit."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "isis", "set-attached-bit"]])
        return VyOSResponse(success=response.status == 200, message="Attached bit disabled")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.post("/purge-originator")
async def enable_purge_originator(http_request: Request) -> VyOSResponse:
    """Enable purge originator."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, set_commands=[["protocols", "isis", "purge-originator"]])
        return VyOSResponse(success=response.status == 200, message="Purge originator enabled")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


@router.delete("/purge-originator")
async def disable_purge_originator(http_request: Request) -> VyOSResponse:
    """Disable purge originator."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.configure_batch, delete_commands=[["protocols", "isis", "purge-originator"]])
        return VyOSResponse(success=response.status == 200, message="Purge originator disabled")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
