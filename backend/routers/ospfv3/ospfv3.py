"""
OSPFv3 Protocol Router

API endpoints for managing VyOS OSPFv3 (IPv6 OSPF) configuration.
OSPFv3 is identical between VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import Ospfv3BatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/ospfv3", tags=["ospfv3"])


# ============================================================================
# Pydantic Models
# ============================================================================


class Ospfv3Parameters(BaseModel):
    """OSPFv3 global parameters."""
    router_id: Optional[str] = None


class Ospfv3AreaRange(BaseModel):
    """OSPFv3 area range configuration."""
    prefix: str
    advertise: bool = False
    not_advertise: bool = False


class Ospfv3Area(BaseModel):
    """OSPFv3 area configuration."""
    area_id: str
    area_type: Optional[str] = None
    area_type_no_summary: bool = False
    area_type_default_cost: Optional[int] = None
    nssa_default_information_originate: bool = False
    ranges: List[Ospfv3AreaRange] = []
    export_list: Optional[str] = None
    import_list: Optional[str] = None


class Ospfv3Interface(BaseModel):
    """OSPFv3 interface configuration."""
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
    bfd: bool = False
    bfd_profile: Optional[str] = None
    mtu_ignore: bool = False
    ifmtu: Optional[int] = None
    instance_id: Optional[int] = None


class Ospfv3Redistribute(BaseModel):
    """OSPFv3 redistribute entry."""
    protocol: str
    metric: Optional[str] = None
    metric_type: Optional[str] = None
    route_map: Optional[str] = None


class Ospfv3DefaultInformation(BaseModel):
    """OSPFv3 default-information originate settings."""
    enabled: bool = False
    always: bool = False
    metric: Optional[int] = None
    metric_type: Optional[int] = None
    route_map: Optional[str] = None


class Ospfv3DistanceOspfv3(BaseModel):
    """OSPFv3 distance per-type settings."""
    external: Optional[int] = None
    inter_area: Optional[int] = None
    intra_area: Optional[int] = None


class Ospfv3Distance(BaseModel):
    """OSPFv3 distance settings."""
    global_value: Optional[int] = None
    ospfv3: Ospfv3DistanceOspfv3 = Ospfv3DistanceOspfv3()


class Ospfv3GracefulRestartHelper(BaseModel):
    """OSPFv3 graceful restart helper settings."""
    enable: bool = False
    router_ids: List[str] = []
    lsa_check_disable: bool = False
    planned_only: bool = False
    supported_grace_time: Optional[int] = None


class Ospfv3GracefulRestart(BaseModel):
    """OSPFv3 graceful restart settings."""
    enabled: bool = False
    grace_period: Optional[int] = None
    helper: Ospfv3GracefulRestartHelper = Ospfv3GracefulRestartHelper()


class Ospfv3Config(BaseModel):
    """Complete OSPFv3 configuration."""
    parameters: Ospfv3Parameters = Ospfv3Parameters()
    areas: List[Ospfv3Area] = []
    interfaces: List[Ospfv3Interface] = []
    redistribute: List[Ospfv3Redistribute] = []
    default_information: Ospfv3DefaultInformation = Ospfv3DefaultInformation()
    distance: Ospfv3Distance = Ospfv3Distance()
    graceful_restart: Ospfv3GracefulRestart = Ospfv3GracefulRestart()
    auto_cost_reference_bandwidth: Optional[int] = None
    log_adjacency_changes: Optional[bool] = None
    log_adjacency_changes_detail: bool = False


class Ospfv3BatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class Ospfv3BatchRequest(BaseModel):
    """Model for batch configuration."""
    operations: List[Ospfv3BatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_ospfv3_capabilities(request: Request):
    """Get OSPFv3 feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = Ospfv3BatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=Ospfv3Config)
async def get_ospfv3_config(http_request: Request, refresh: bool = False):
    """Get all OSPFv3 configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        ospfv3_config = full_config.get("protocols", {}).get("ospfv3", {})

        if not ospfv3_config:
            return Ospfv3Config()

        areas = parse_areas(ospfv3_config.get("area", {}))
        interfaces = parse_interfaces(ospfv3_config.get("interface", {}))

        # Interface-based area assignment (`set protocols ospfv3 interface <name> area <id>`)
        # does not create a `protocols ospfv3 area <id>` node. Surface those areas so
        # they still appear in the Areas tab even with no explicit area block.
        known_area_ids = {area.area_id for area in areas}
        for iface in interfaces:
            if iface.area and iface.area not in known_area_ids:
                areas.append(Ospfv3Area(area_id=iface.area))
                known_area_ids.add(iface.area)

        return Ospfv3Config(
            parameters=parse_parameters(ospfv3_config.get("parameters", {})),
            areas=areas,
            interfaces=interfaces,
            redistribute=parse_redistribute(ospfv3_config.get("redistribute", {})),
            default_information=parse_default_information(ospfv3_config.get("default-information", {})),
            distance=parse_distance(ospfv3_config),
            graceful_restart=parse_graceful_restart(ospfv3_config.get("graceful-restart", {})),
            auto_cost_reference_bandwidth=_safe_int(_deep_get(ospfv3_config, "auto-cost", "reference-bandwidth")),
            log_adjacency_changes="log-adjacency-changes" in ospfv3_config if ospfv3_config else None,
            log_adjacency_changes_detail="detail" in (ospfv3_config.get("log-adjacency-changes", {}) or {}) if isinstance(ospfv3_config.get("log-adjacency-changes"), dict) else False,
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def _deep_get(d: dict, *keys):
    """Safely traverse nested dicts."""
    for key in keys:
        if not isinstance(d, dict):
            return None
        d = d.get(key)
        if d is None:
            return None
    return d


def _safe_int(value) -> Optional[int]:
    """Safely convert to int."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _to_list(value) -> List[str]:
    """Convert VyOS config value to list (handles string or list)."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value]
    return []


def parse_parameters(raw: dict) -> Ospfv3Parameters:
    if not raw:
        return Ospfv3Parameters()
    return Ospfv3Parameters(
        router_id=raw.get("router-id"),
    )


def parse_areas(raw: dict) -> List[Ospfv3Area]:
    if not raw:
        return []

    areas = []
    for area_id, config in raw.items():
        if config is None:
            config = {}

        # Parse area type
        area_type_raw = config.get("area-type", {}) or {}
        area_type = None
        area_type_no_summary = False
        area_type_default_cost = None
        nssa_default_information_originate = False

        if "stub" in area_type_raw:
            area_type = "stub"
            stub_config = area_type_raw.get("stub", {}) or {}
            if isinstance(stub_config, dict):
                area_type_no_summary = "no-summary" in stub_config
                area_type_default_cost = _safe_int(stub_config.get("default-cost"))
        elif "nssa" in area_type_raw:
            area_type = "nssa"
            nssa_config = area_type_raw.get("nssa", {}) or {}
            if isinstance(nssa_config, dict):
                area_type_no_summary = "no-summary" in nssa_config
                area_type_default_cost = _safe_int(nssa_config.get("default-cost"))
                nssa_default_information_originate = "default-information-originate" in nssa_config
        elif "normal" in area_type_raw:
            area_type = "normal"

        # Parse ranges
        ranges = []
        for prefix, range_config in (config.get("range", {}) or {}).items():
            if range_config is None:
                range_config = {}
            ranges.append(Ospfv3AreaRange(
                prefix=prefix,
                advertise="advertise" in range_config,
                not_advertise="not-advertise" in range_config,
            ))

        areas.append(Ospfv3Area(
            area_id=area_id,
            area_type=area_type,
            area_type_no_summary=area_type_no_summary,
            area_type_default_cost=area_type_default_cost,
            nssa_default_information_originate=nssa_default_information_originate,
            ranges=ranges,
            export_list=config.get("export-list"),
            import_list=config.get("import-list"),
        ))

    return areas


def parse_interfaces(raw: dict) -> List[Ospfv3Interface]:
    if not raw:
        return []

    interfaces = []
    for iface_name, config in raw.items():
        if config is None:
            config = {}

        # Parse BFD
        bfd_raw = config.get("bfd")
        bfd = False
        bfd_profile = None
        if bfd_raw is not None:
            bfd = True
            if isinstance(bfd_raw, dict):
                bfd_profile = bfd_raw.get("profile")

        interfaces.append(Ospfv3Interface(
            name=iface_name,
            area=config.get("area"),
            cost=_safe_int(config.get("cost")),
            priority=_safe_int(config.get("priority")),
            hello_interval=_safe_int(config.get("hello-interval")),
            dead_interval=_safe_int(config.get("dead-interval")),
            retransmit_interval=_safe_int(config.get("retransmit-interval")),
            transmit_delay=_safe_int(config.get("transmit-delay")),
            network=config.get("network"),
            passive="passive" in config,
            bfd=bfd,
            bfd_profile=bfd_profile,
            mtu_ignore="mtu-ignore" in config,
            ifmtu=_safe_int(config.get("ifmtu")),
            instance_id=_safe_int(config.get("instance-id")),
        ))

    return interfaces


def parse_redistribute(raw: dict) -> List[Ospfv3Redistribute]:
    if not raw:
        return []

    redistribute = []
    for protocol, config in raw.items():
        if config is None:
            config = {}

        redistribute.append(Ospfv3Redistribute(
            protocol=protocol,
            metric=config.get("metric") if isinstance(config, dict) else None,
            metric_type=config.get("metric-type") if isinstance(config, dict) else None,
            route_map=config.get("route-map") if isinstance(config, dict) else None,
        ))

    return redistribute


def parse_default_information(raw: dict) -> Ospfv3DefaultInformation:
    if not raw:
        return Ospfv3DefaultInformation()

    originate = raw.get("originate", {})
    if not originate:
        return Ospfv3DefaultInformation()

    if not isinstance(originate, dict):
        return Ospfv3DefaultInformation(enabled=True)

    return Ospfv3DefaultInformation(
        enabled=True,
        always="always" in originate,
        metric=_safe_int(originate.get("metric")),
        metric_type=_safe_int(originate.get("metric-type")),
        route_map=originate.get("route-map"),
    )


def parse_distance(ospfv3_config: dict) -> Ospfv3Distance:
    distance_raw = ospfv3_config.get("distance", {}) or {}
    if not distance_raw:
        return Ospfv3Distance()

    ospfv3_distance = distance_raw.get("ospfv3", {}) or {}
    return Ospfv3Distance(
        global_value=_safe_int(distance_raw.get("global")),
        ospfv3=Ospfv3DistanceOspfv3(
            external=_safe_int(ospfv3_distance.get("external")),
            inter_area=_safe_int(ospfv3_distance.get("inter-area")),
            intra_area=_safe_int(ospfv3_distance.get("intra-area")),
        ),
    )


def parse_graceful_restart(raw: dict) -> Ospfv3GracefulRestart:
    if not raw:
        return Ospfv3GracefulRestart()

    helper_raw = raw.get("helper", {}) or {}

    # Parse helper enable - can be a flag or have router-id sub-keys
    enable_raw = helper_raw.get("enable", {})
    helper_enable = False
    router_ids = []
    if enable_raw is not None:
        helper_enable = True
        if isinstance(enable_raw, dict):
            rid_raw = enable_raw.get("router-id", {})
            if isinstance(rid_raw, dict):
                router_ids = list(rid_raw.keys())
            elif isinstance(rid_raw, str):
                router_ids = [rid_raw]

    return Ospfv3GracefulRestart(
        enabled=bool(raw),
        grace_period=_safe_int(raw.get("grace-period")),
        helper=Ospfv3GracefulRestartHelper(
            enable=helper_enable,
            router_ids=router_ids,
            lsa_check_disable="lsa-check-disable" in helper_raw,
            planned_only="planned-only" in helper_raw,
            supported_grace_time=_safe_int(helper_raw.get("supported-grace-time")),
        ),
    )


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def ospfv3_batch_configure(http_request: Request, body: Ospfv3BatchRequest):
    """Execute a batch of OSPFv3 configuration operations."""
    await require_write_permission(http_request, FeatureGroup.OSPFV3)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = Ospfv3BatchBuilder(version=version)

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
            elif len(params) == 3 and operation.value:
                values = operation.value.split(",", 2)
                if len(values) == 3:
                    method(values[0], values[1], values[2])
                elif len(values) == 2:
                    method(values[0], values[1])

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "OSPFv3 configuration updated"},
            error=response.error if response.error else None
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
