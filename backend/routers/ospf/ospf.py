"""
OSPF Protocol Router

API endpoints for managing VyOS OSPF (Open Shortest Path First) configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import OspfBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect

router = APIRouter(prefix="/vyos/ospf", tags=["ospf"])


# ============================================================================
# Pydantic Models
# ============================================================================


class OspfParameters(BaseModel):
    """OSPF global parameters."""
    router_id: Optional[str] = None
    abr_type: Optional[str] = None
    opaque_lsa: bool = False
    rfc1583_compatibility: bool = False


class OspfAreaRange(BaseModel):
    """OSPF area range configuration."""
    prefix: str
    cost: Optional[int] = None
    not_advertise: bool = False
    substitute: Optional[str] = None


class OspfVirtualLink(BaseModel):
    """OSPF area virtual-link configuration."""
    address: str
    dead_interval: Optional[int] = None
    hello_interval: Optional[int] = None
    retransmit_interval: Optional[int] = None
    transmit_delay: Optional[int] = None


class OspfArea(BaseModel):
    """OSPF area configuration."""
    area_id: str
    area_type: Optional[str] = None
    area_type_no_summary: bool = False
    area_type_default_cost: Optional[int] = None
    networks: List[str] = []
    ranges: List[OspfAreaRange] = []
    authentication: Optional[str] = None
    shortcut: Optional[str] = None
    export_list: Optional[str] = None
    import_list: Optional[str] = None
    virtual_links: List[OspfVirtualLink] = []


class OspfInterfaceAuthentication(BaseModel):
    """OSPF interface authentication settings."""
    md5_key_ids: Dict[str, str] = {}
    plaintext_password: Optional[str] = None


class OspfInterface(BaseModel):
    """OSPF interface configuration."""
    name: str
    area: Optional[str] = None
    cost: Optional[int] = None
    priority: Optional[int] = None
    hello_interval: Optional[int] = None
    dead_interval: Optional[int] = None
    retransmit_interval: Optional[int] = None
    transmit_delay: Optional[int] = None
    network: Optional[str] = None
    passive: Optional[bool] = None
    passive_disable: bool = False
    bfd: bool = False
    mtu_ignore: bool = False
    bandwidth: Optional[int] = None
    hello_multiplier: Optional[int] = None
    authentication: OspfInterfaceAuthentication = OspfInterfaceAuthentication()
    ldp_sync: bool = False


class OspfRedistribute(BaseModel):
    """OSPF redistribute entry."""
    protocol: str
    metric: Optional[str] = None
    metric_type: Optional[str] = None
    route_map: Optional[str] = None
    table: Optional[str] = None


class OspfDefaultInformation(BaseModel):
    """OSPF default-information originate settings."""
    enabled: bool = False
    always: bool = False
    metric: Optional[int] = None
    metric_type: Optional[int] = None
    route_map: Optional[str] = None


class OspfDistanceOspf(BaseModel):
    """OSPF distance per-type settings."""
    external: Optional[int] = None
    inter_area: Optional[int] = None
    intra_area: Optional[int] = None


class OspfDistance(BaseModel):
    """OSPF distance settings."""
    global_value: Optional[int] = None
    ospf: OspfDistanceOspf = OspfDistanceOspf()


class OspfTimersThrottleSpf(BaseModel):
    """OSPF SPF throttle timers."""
    delay: Optional[int] = None
    initial_holdtime: Optional[int] = None
    max_holdtime: Optional[int] = None


class OspfMaxMetricRouterLsa(BaseModel):
    """OSPF max-metric router-lsa settings."""
    administrative: bool = False
    on_shutdown: Optional[int] = None
    on_startup: Optional[int] = None


class OspfGracefulRestartHelper(BaseModel):
    """OSPF graceful restart helper settings."""
    enable: bool = False
    no_strict_lsa_checking: bool = False
    planned_only: bool = False
    supported_grace_time: Optional[int] = None


class OspfGracefulRestart(BaseModel):
    """OSPF graceful restart settings."""
    enabled: bool = False
    grace_period: Optional[int] = None
    helper: OspfGracefulRestartHelper = OspfGracefulRestartHelper()


class OspfNeighbor(BaseModel):
    """OSPF neighbor configuration."""
    address: str
    poll_interval: Optional[int] = None
    priority: Optional[int] = None


class OspfMplsTe(BaseModel):
    """OSPF MPLS-TE settings."""
    enable: bool = False
    router_address: Optional[str] = None


class OspfSummaryAddress(BaseModel):
    """OSPF summary address."""
    prefix: str
    no_advertise: bool = False
    tag: Optional[int] = None


class OspfSegmentRouting(BaseModel):
    """OSPF segment routing settings."""
    global_block_low: Optional[int] = None
    global_block_high: Optional[int] = None
    local_block_low: Optional[int] = None
    local_block_high: Optional[int] = None
    maximum_label_depth: Optional[int] = None


class OspfConfig(BaseModel):
    """Complete OSPF configuration."""
    parameters: OspfParameters = OspfParameters()
    areas: List[OspfArea] = []
    interfaces: List[OspfInterface] = []
    redistribute: List[OspfRedistribute] = []
    default_information: OspfDefaultInformation = OspfDefaultInformation()
    distance: OspfDistance = OspfDistance()
    timers_throttle_spf: OspfTimersThrottleSpf = OspfTimersThrottleSpf()
    max_metric_router_lsa: OspfMaxMetricRouterLsa = OspfMaxMetricRouterLsa()
    graceful_restart: OspfGracefulRestart = OspfGracefulRestart()
    neighbors: List[OspfNeighbor] = []
    mpls_te: OspfMplsTe = OspfMplsTe()
    summary_addresses: List[OspfSummaryAddress] = []
    segment_routing: OspfSegmentRouting = OspfSegmentRouting()
    auto_cost_reference_bandwidth: Optional[int] = None
    log_adjacency_changes: Optional[bool] = None
    log_adjacency_changes_detail: bool = False
    passive_interface_default: bool = False
    maximum_paths: Optional[int] = None
    ldp_sync_holddown: Optional[int] = None
    refresh_timers: Optional[int] = None
    aggregation_timer: Optional[int] = None
    capability_opaque: bool = False


class OspfBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class OspfBatchRequest(BaseModel):
    """Model for batch configuration."""
    operations: List[OspfBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_ospf_capabilities(request: Request):
    """Get OSPF feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.OSPF)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = OspfBatchBuilder(version=version)
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


@router.get("/config", response_model=OspfConfig)
async def get_ospf_config(http_request: Request, refresh: bool = False):
    """Get all OSPF configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.OSPF)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        ospf_config = full_config.get("protocols", {}).get("ospf", {})

        if not ospf_config:
            return OspfConfig()

        return OspfConfig(
            parameters=parse_parameters(ospf_config.get("parameters", {})),
            areas=parse_areas(ospf_config.get("area", {})),
            interfaces=parse_interfaces(ospf_config.get("interface", {})),
            redistribute=parse_redistribute(ospf_config.get("redistribute", {})),
            default_information=parse_default_information(ospf_config.get("default-information", {})),
            distance=parse_distance(ospf_config),
            timers_throttle_spf=parse_timers_throttle_spf(ospf_config),
            max_metric_router_lsa=parse_max_metric(ospf_config),
            graceful_restart=parse_graceful_restart(ospf_config.get("graceful-restart", {})),
            neighbors=parse_neighbors(ospf_config.get("neighbor", {})),
            mpls_te=parse_mpls_te(ospf_config.get("mpls-te", {})),
            summary_addresses=parse_summary_addresses(ospf_config.get("summary-address", {})),
            segment_routing=parse_segment_routing(ospf_config.get("segment-routing", {})),
            auto_cost_reference_bandwidth=_safe_int(_deep_get(ospf_config, "auto-cost", "reference-bandwidth")),
            log_adjacency_changes="log-adjacency-changes" in ospf_config if ospf_config else None,
            log_adjacency_changes_detail="detail" in (ospf_config.get("log-adjacency-changes", {}) or {}) if isinstance(ospf_config.get("log-adjacency-changes"), dict) else False,
            passive_interface_default="default" in (ospf_config.get("passive-interface", {}) or {}) if isinstance(ospf_config.get("passive-interface"), dict) else False,
            maximum_paths=_safe_int(ospf_config.get("maximum-paths")),
            ldp_sync_holddown=_safe_int(_deep_get(ospf_config, "ldp-sync", "holddown")),
            refresh_timers=_safe_int(_deep_get(ospf_config, "refresh", "timers")),
            aggregation_timer=_safe_int(_deep_get(ospf_config, "aggregation", "timer")),
            capability_opaque="opaque" in (ospf_config.get("capability", {}) or {}) if isinstance(ospf_config.get("capability"), dict) else False,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


def parse_parameters(raw: dict) -> OspfParameters:
    if not raw:
        return OspfParameters()
    return OspfParameters(
        router_id=raw.get("router-id"),
        abr_type=raw.get("abr-type"),
        opaque_lsa="opaque-lsa" in raw,
        rfc1583_compatibility="rfc1583-compatibility" in raw,
    )


def parse_areas(raw: dict) -> List[OspfArea]:
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
        elif "normal" in area_type_raw:
            area_type = "normal"

        # Parse networks
        networks_raw = config.get("network", {}) or {}
        networks = list(networks_raw.keys()) if isinstance(networks_raw, dict) else _to_list(networks_raw)

        # Parse ranges
        ranges = []
        for prefix, range_config in (config.get("range", {}) or {}).items():
            if range_config is None:
                range_config = {}
            ranges.append(OspfAreaRange(
                prefix=prefix,
                cost=_safe_int(range_config.get("cost")),
                not_advertise="not-advertise" in range_config,
                substitute=range_config.get("substitute"),
            ))

        # Parse virtual-links
        virtual_links = []
        for addr, vl_config in (config.get("virtual-link", {}) or {}).items():
            if vl_config is None:
                vl_config = {}
            virtual_links.append(OspfVirtualLink(
                address=addr,
                dead_interval=_safe_int(vl_config.get("dead-interval")),
                hello_interval=_safe_int(vl_config.get("hello-interval")),
                retransmit_interval=_safe_int(vl_config.get("retransmit-interval")),
                transmit_delay=_safe_int(vl_config.get("transmit-delay")),
            ))

        areas.append(OspfArea(
            area_id=area_id,
            area_type=area_type,
            area_type_no_summary=area_type_no_summary,
            area_type_default_cost=area_type_default_cost,
            networks=networks,
            ranges=ranges,
            authentication=config.get("authentication"),
            shortcut=config.get("shortcut"),
            export_list=config.get("export-list"),
            import_list=config.get("import-list"),
            virtual_links=virtual_links,
        ))

    return areas


def parse_interfaces(raw: dict) -> List[OspfInterface]:
    if not raw:
        return []

    interfaces = []
    for iface_name, config in raw.items():
        if config is None:
            config = {}

        # Parse authentication
        auth_raw = config.get("authentication", {}) or {}
        md5_raw = _deep_get(auth_raw, "md5", "key-id") or {}
        md5_key_ids = {}
        if isinstance(md5_raw, dict):
            for key_id, key_config in md5_raw.items():
                if isinstance(key_config, dict):
                    md5_key_ids[str(key_id)] = key_config.get("md5-key", "")

        # Passive can be a flag or have a "disable" sub-key
        passive_raw = config.get("passive")
        passive = None
        passive_disable = False
        if passive_raw is not None:
            if isinstance(passive_raw, dict):
                passive_disable = "disable" in passive_raw
                passive = not passive_disable
            else:
                passive = True

        interfaces.append(OspfInterface(
            name=iface_name,
            area=config.get("area"),
            cost=_safe_int(config.get("cost")),
            priority=_safe_int(config.get("priority")),
            hello_interval=_safe_int(config.get("hello-interval")),
            dead_interval=_safe_int(config.get("dead-interval")),
            retransmit_interval=_safe_int(config.get("retransmit-interval")),
            transmit_delay=_safe_int(config.get("transmit-delay")),
            network=config.get("network"),
            passive=passive,
            passive_disable=passive_disable,
            bfd="bfd" in config,
            mtu_ignore="mtu-ignore" in config,
            bandwidth=_safe_int(config.get("bandwidth")),
            hello_multiplier=_safe_int(config.get("hello-multiplier")),
            authentication=OspfInterfaceAuthentication(
                md5_key_ids=md5_key_ids,
                plaintext_password=auth_raw.get("plaintext-password") if isinstance(auth_raw, dict) else None,
            ),
            ldp_sync="ldp-sync" in config,
        ))

    return interfaces


def parse_redistribute(raw: dict) -> List[OspfRedistribute]:
    if not raw:
        return []

    redistribute = []
    for protocol, config in raw.items():
        if config is None:
            config = {}

        if protocol == "table":
            for table_id, table_config in (config if isinstance(config, dict) else {}).items():
                if table_config is None:
                    table_config = {}
                redistribute.append(OspfRedistribute(
                    protocol="table",
                    metric=table_config.get("metric") if isinstance(table_config, dict) else None,
                    metric_type=table_config.get("metric-type") if isinstance(table_config, dict) else None,
                    route_map=table_config.get("route-map") if isinstance(table_config, dict) else None,
                    table=str(table_id),
                ))
        else:
            redistribute.append(OspfRedistribute(
                protocol=protocol,
                metric=config.get("metric") if isinstance(config, dict) else None,
                metric_type=config.get("metric-type") if isinstance(config, dict) else None,
                route_map=config.get("route-map") if isinstance(config, dict) else None,
            ))

    return redistribute


def parse_default_information(raw: dict) -> OspfDefaultInformation:
    if not raw:
        return OspfDefaultInformation()

    originate = raw.get("originate", {})
    if not originate:
        return OspfDefaultInformation()

    if not isinstance(originate, dict):
        return OspfDefaultInformation(enabled=True)

    return OspfDefaultInformation(
        enabled=True,
        always="always" in originate,
        metric=_safe_int(originate.get("metric")),
        metric_type=_safe_int(originate.get("metric-type")),
        route_map=originate.get("route-map"),
    )


def parse_distance(ospf_config: dict) -> OspfDistance:
    distance_raw = ospf_config.get("distance", {}) or {}
    if not distance_raw:
        return OspfDistance()

    ospf_distance = distance_raw.get("ospf", {}) or {}
    return OspfDistance(
        global_value=_safe_int(distance_raw.get("global")),
        ospf=OspfDistanceOspf(
            external=_safe_int(ospf_distance.get("external")),
            inter_area=_safe_int(ospf_distance.get("inter-area")),
            intra_area=_safe_int(ospf_distance.get("intra-area")),
        ),
    )


def parse_timers_throttle_spf(ospf_config: dict) -> OspfTimersThrottleSpf:
    spf_raw = _deep_get(ospf_config, "timers", "throttle", "spf") or {}
    if not spf_raw:
        return OspfTimersThrottleSpf()
    return OspfTimersThrottleSpf(
        delay=_safe_int(spf_raw.get("delay")),
        initial_holdtime=_safe_int(spf_raw.get("initial-holdtime")),
        max_holdtime=_safe_int(spf_raw.get("max-holdtime")),
    )


def parse_max_metric(ospf_config: dict) -> OspfMaxMetricRouterLsa:
    router_lsa = _deep_get(ospf_config, "max-metric", "router-lsa") or {}
    if not router_lsa:
        return OspfMaxMetricRouterLsa()
    return OspfMaxMetricRouterLsa(
        administrative="administrative" in router_lsa,
        on_shutdown=_safe_int(router_lsa.get("on-shutdown")),
        on_startup=_safe_int(router_lsa.get("on-startup")),
    )


def parse_graceful_restart(raw: dict) -> OspfGracefulRestart:
    if not raw:
        return OspfGracefulRestart()

    helper_raw = raw.get("helper", {}) or {}
    return OspfGracefulRestart(
        enabled=bool(raw),
        grace_period=_safe_int(raw.get("grace-period")),
        helper=OspfGracefulRestartHelper(
            enable="enable" in helper_raw,
            no_strict_lsa_checking="no-strict-lsa-checking" in helper_raw,
            planned_only="planned-only" in helper_raw,
            supported_grace_time=_safe_int(helper_raw.get("supported-grace-time")),
        ),
    )


def parse_neighbors(raw: dict) -> List[OspfNeighbor]:
    if not raw:
        return []

    neighbors = []
    for addr, config in raw.items():
        if config is None:
            config = {}
        neighbors.append(OspfNeighbor(
            address=addr,
            poll_interval=_safe_int(config.get("poll-interval")),
            priority=_safe_int(config.get("priority")),
        ))

    return neighbors


def parse_mpls_te(raw: dict) -> OspfMplsTe:
    if not raw:
        return OspfMplsTe()
    return OspfMplsTe(
        enable="enable" in raw,
        router_address=raw.get("router-address"),
    )


def parse_summary_addresses(raw: dict) -> List[OspfSummaryAddress]:
    if not raw:
        return []

    addresses = []
    for prefix, config in raw.items():
        if config is None:
            config = {}
        addresses.append(OspfSummaryAddress(
            prefix=prefix,
            no_advertise="no-advertise" in config,
            tag=_safe_int(config.get("tag")),
        ))
    return addresses


def parse_segment_routing(raw: dict) -> OspfSegmentRouting:
    if not raw:
        return OspfSegmentRouting()

    global_block = raw.get("global-block", {}) or {}
    local_block = raw.get("local-block", {}) or {}

    return OspfSegmentRouting(
        global_block_low=_safe_int(global_block.get("low-label-value")),
        global_block_high=_safe_int(global_block.get("high-label-value")),
        local_block_low=_safe_int(local_block.get("low-label-value")),
        local_block_high=_safe_int(local_block.get("high-label-value")),
        maximum_label_depth=_safe_int(raw.get("maximum-label-depth")),
    )


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def ospf_batch_configure(http_request: Request, body: OspfBatchRequest):
    """Execute a batch of OSPF configuration operations."""
    await require_write_permission(http_request, FeatureGroup.OSPF)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = OspfBatchBuilder(version=version)

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
            data={"message": "OSPF configuration updated"},
            error=response.error if response.error else None
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
