"""
IS-IS Protocol Router

API endpoints for managing VyOS IS-IS (Intermediate System to Intermediate
System) routing protocol configuration.  Supports version-aware configuration
for VyOS 1.4 and 1.5.

Endpoints:
  GET  /vyos/isis/capabilities  — version-aware feature flags
  GET  /vyos/isis/config        — normalized IS-IS configuration
  POST /vyos/isis/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.isis import IsisBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect

router = APIRouter(prefix="/vyos/isis", tags=["isis"])


# ============================================================================
# Pydantic Models
# ============================================================================


class IsisSpfDelayIetf(BaseModel):
    """SPF IETF delay algorithm parameters."""
    init_delay: Optional[int] = None
    short_delay: Optional[int] = None
    long_delay: Optional[int] = None
    holddown: Optional[int] = None
    time_to_learn: Optional[int] = None


class IsisGlobalConfig(BaseModel):
    """IS-IS global process settings."""
    net: List[str] = []
    level: Optional[str] = None
    metric_style: Optional[str] = None
    dynamic_hostname: bool = False
    purge_originator: bool = False
    advertise_passive_only: bool = False
    advertise_high_metrics: bool = False
    set_attached_bit: bool = False
    set_overload_bit: bool = False
    log_adjacency_changes: bool = False
    topology: Optional[str] = None
    lsp_mtu: Optional[int] = None
    lsp_gen_interval: Optional[int] = None
    lsp_refresh_interval: Optional[int] = None
    max_lsp_lifetime: Optional[int] = None
    spf_interval: Optional[int] = None
    area_password_md5: Optional[str] = None
    area_password_plaintext: Optional[str] = None
    domain_password_md5: Optional[str] = None
    domain_password_plaintext: Optional[str] = None
    ldp_sync_holddown: Optional[int] = None
    spf_delay_ietf: IsisSpfDelayIetf = IsisSpfDelayIetf()


class IsisInterfaceLfa(BaseModel):
    """LFA fast-reroute settings for an interface."""
    level1_enabled: bool = False
    level1_exclude_interfaces: List[str] = []
    level2_enabled: bool = False
    level2_exclude_interfaces: List[str] = []


class IsisInterfaceTiLfa(BaseModel):
    """TI-LFA settings for an interface (VyOS 1.5+)."""
    enabled: bool = False
    level1_enabled: bool = False
    level1_node_protection: bool = False
    level1_link_fallback: bool = False
    level2_enabled: bool = False
    level2_node_protection: bool = False
    level2_link_fallback: bool = False


class IsisInterfaceRemoteLfa(BaseModel):
    """Remote LFA settings for an interface (VyOS 1.5+)."""
    level1_enabled: bool = False
    level1_max_metric: Optional[int] = None
    level1_tunnel_mpls_ldp: bool = False
    level2_enabled: bool = False
    level2_max_metric: Optional[int] = None
    level2_tunnel_mpls_ldp: bool = False


class IsisInterface(BaseModel):
    """IS-IS interface configuration."""
    name: str
    circuit_type: Optional[str] = None
    metric: Optional[int] = None
    hello_interval: Optional[int] = None
    hello_multiplier: Optional[int] = None
    hello_padding: bool = False
    passive: bool = False
    point_to_point: bool = False
    priority: Optional[int] = None
    psnp_interval: Optional[int] = None
    no_three_way_handshake: bool = False
    password_md5: Optional[str] = None
    password_plaintext: Optional[str] = None
    bfd: bool = False
    bfd_profile: Optional[str] = None
    ldp_sync_holddown: Optional[int] = None
    ldp_sync_disable: bool = False
    lfa: IsisInterfaceLfa = IsisInterfaceLfa()
    ti_lfa: IsisInterfaceTiLfa = IsisInterfaceTiLfa()
    remote_lfa: IsisInterfaceRemoteLfa = IsisInterfaceRemoteLfa()


class IsisRedistributeEntry(BaseModel):
    """A single redistribute source (protocol + level)."""
    protocol: str
    level: str
    metric: Optional[int] = None
    route_map: Optional[str] = None


class IsisDefaultInfoEntry(BaseModel):
    """Default-information originate for a single level."""
    level: str
    always: bool = False
    metric: Optional[int] = None
    route_map: Optional[str] = None


class IsisSrPrefix(BaseModel):
    """Segment Routing prefix-SID entry."""
    prefix: str
    index_value: Optional[int] = None
    index_explicit_null: bool = False
    index_no_php: bool = False
    absolute_value: Optional[int] = None
    absolute_explicit_null: bool = False
    absolute_no_php: bool = False


class IsisSegmentRouting(BaseModel):
    """Segment Routing (SR-MPLS) configuration."""
    global_block_low: Optional[int] = None
    global_block_high: Optional[int] = None
    local_block_low: Optional[int] = None
    local_block_high: Optional[int] = None
    maximum_label_depth: Optional[int] = None
    prefixes: List[IsisSrPrefix] = []
    srv6_locator: Optional[str] = None


class IsisTrafficEngineering(BaseModel):
    """Traffic Engineering configuration."""
    enabled: bool = False
    address: Optional[str] = None
    export: bool = False


class IsisFrrGlobal(BaseModel):
    """Global Fast Reroute LFA configuration."""
    lfa_load_sharing_disable_level1: bool = False
    lfa_load_sharing_disable_level2: bool = False


class IsisConfig(BaseModel):
    """Complete IS-IS configuration."""
    enabled: bool = False
    global_config: IsisGlobalConfig = IsisGlobalConfig()
    interfaces: List[IsisInterface] = []
    redistribute_ipv4: List[IsisRedistributeEntry] = []
    default_info_ipv4: List[IsisDefaultInfoEntry] = []
    segment_routing: IsisSegmentRouting = IsisSegmentRouting()
    traffic_engineering: IsisTrafficEngineering = IsisTrafficEngineering()
    fast_reroute: IsisFrrGlobal = IsisFrrGlobal()


class IsisBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Two-arg methods: 'arg1,arg2' (comma-separated). "
            "Compound keys (protocol+level): 'bgp|level-1'."
        ),
    )


class IsisBatchRequest(BaseModel):
    """Batch configuration request."""
    operations: List[IsisBatchOperation]


class VyOSResponse(BaseModel):
    """Standard VyOS operation response."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_isis_capabilities(request: Request):
    """Return IS-IS feature capabilities based on the connected VyOS version."""
    await require_read_permission(request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(request)
        builder = IsisBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=IsisConfig)
async def get_isis_config(http_request: Request, refresh: bool = False):
    """Return the full IS-IS configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        isis_raw = full_config.get("protocols", {}).get("isis", {})
        if not isis_raw:
            return IsisConfig(enabled=False)

        return IsisConfig(
            enabled=True,
            global_config=_parse_global(isis_raw),
            interfaces=_parse_interfaces(isis_raw.get("interface", {})),
            redistribute_ipv4=_parse_redistribute_ipv4(isis_raw.get("redistribute", {}).get("ipv4", {})),
            default_info_ipv4=_parse_default_info(isis_raw.get("default-information", {}).get("originate", {}).get("ipv4", {})),
            segment_routing=_parse_segment_routing(isis_raw.get("segment-routing", {})),
            traffic_engineering=_parse_traffic_engineering(isis_raw.get("traffic-engineering", {})),
            fast_reroute=_parse_frr_global(isis_raw.get("fast-reroute", {})),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def isis_batch_configure(http_request: Request, body: IsisBatchRequest):
    """Execute a batch of IS-IS configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.ISIS)
    try:
        service = get_session_vyos_service(http_request)
        builder = IsisBatchBuilder(version=service.get_version())

        for operation in body.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1:
                if operation.value is not None:
                    method(operation.value)
                else:
                    method()
            elif len(params) == 2:
                if operation.value and "," in operation.value:
                    parts = operation.value.split(",", 1)
                    method(parts[0], parts[1])
                elif operation.value:
                    method(operation.value)

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "IS-IS configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Config Parsers
# ============================================================================


def _safe_int(val) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _to_list(val) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, dict):
        return list(val.keys())
    return [str(val)]


def _parse_global(raw: dict) -> IsisGlobalConfig:
    spf_delay_raw = raw.get("spf-delay-ietf", {}) or {}

    # Area password
    area_pwd = raw.get("area-password", {}) or {}
    area_md5 = area_pwd.get("md5") if isinstance(area_pwd, dict) else None
    area_plain = area_pwd.get("plaintext-password") if isinstance(area_pwd, dict) else None

    # Domain password
    domain_pwd = raw.get("domain-password", {}) or {}
    domain_md5 = domain_pwd.get("md5") if isinstance(domain_pwd, dict) else None
    domain_plain = domain_pwd.get("plaintext-password") if isinstance(domain_pwd, dict) else None

    # NET: VyOS may store as dict keys or list
    net_raw = raw.get("net", {})
    net = list(net_raw.keys()) if isinstance(net_raw, dict) else _to_list(net_raw)

    # Topology: presence node or value
    topology_raw = raw.get("topology")
    topology = None
    if topology_raw is not None:
        if isinstance(topology_raw, dict):
            topology = list(topology_raw.keys())[0] if topology_raw else None
        elif isinstance(topology_raw, str):
            topology = topology_raw

    return IsisGlobalConfig(
        net=net,
        level=raw.get("level"),
        metric_style=raw.get("metric-style"),
        dynamic_hostname="dynamic-hostname" in raw,
        purge_originator="purge-originator" in raw,
        advertise_passive_only="advertise-passive-only" in raw,
        advertise_high_metrics="advertise-high-metrics" in raw,
        set_attached_bit="set-attached-bit" in raw,
        set_overload_bit="set-overload-bit" in raw,
        log_adjacency_changes="log-adjacency-changes" in raw,
        topology=topology,
        lsp_mtu=_safe_int(raw.get("lsp-mtu")),
        lsp_gen_interval=_safe_int(raw.get("lsp-gen-interval")),
        lsp_refresh_interval=_safe_int(raw.get("lsp-refresh-interval")),
        max_lsp_lifetime=_safe_int(raw.get("max-lsp-lifetime")),
        spf_interval=_safe_int(raw.get("spf-interval")),
        area_password_md5=area_md5,
        area_password_plaintext=area_plain,
        domain_password_md5=domain_md5,
        domain_password_plaintext=domain_plain,
        ldp_sync_holddown=_safe_int((raw.get("ldp-sync", {}) or {}).get("holddown")),
        spf_delay_ietf=IsisSpfDelayIetf(
            init_delay=_safe_int(spf_delay_raw.get("init-delay")),
            short_delay=_safe_int(spf_delay_raw.get("short-delay")),
            long_delay=_safe_int(spf_delay_raw.get("long-delay")),
            holddown=_safe_int(spf_delay_raw.get("holddown")),
            time_to_learn=_safe_int(spf_delay_raw.get("time-to-learn")),
        ),
    )


def _parse_interfaces(raw: dict) -> List[IsisInterface]:
    if not raw:
        return []
    interfaces = []
    for iface_name, cfg in raw.items():
        if cfg is None:
            cfg = {}
        interfaces.append(_parse_one_interface(iface_name, cfg))
    return sorted(interfaces, key=lambda x: x.name)


def _parse_one_interface(name: str, cfg: dict) -> IsisInterface:
    # Password
    pwd_raw = cfg.get("password", {}) or {}
    pwd_md5 = pwd_raw.get("md5") if isinstance(pwd_raw, dict) else None
    pwd_plain = pwd_raw.get("plaintext-password") if isinstance(pwd_raw, dict) else None

    # BFD
    bfd_raw = cfg.get("bfd")
    bfd_enabled = bfd_raw is not None
    bfd_profile = None
    if isinstance(bfd_raw, dict):
        bfd_profile = bfd_raw.get("profile")

    # LDP sync
    ldp_raw = cfg.get("ldp-sync", {}) or {}
    ldp_holddown = _safe_int(ldp_raw.get("holddown")) if isinstance(ldp_raw, dict) else None
    ldp_disable = "disable" in ldp_raw if isinstance(ldp_raw, dict) else False

    # LFA fast-reroute
    frr_raw = cfg.get("fast-reroute", {}) or {}
    lfa_raw = (frr_raw.get("lfa", {}) or {}) if isinstance(frr_raw, dict) else {}

    def _parse_lfa_level(level_raw) -> tuple:
        if not isinstance(level_raw, dict):
            return False, []
        enabled = "enable" in level_raw
        excl_raw = (level_raw.get("exclude", {}) or {}).get("interface", {}) or {}
        excl = list(excl_raw.keys()) if isinstance(excl_raw, dict) else _to_list(excl_raw)
        return enabled, excl

    lfa_l1_en, lfa_l1_excl = _parse_lfa_level(lfa_raw.get("level-1"))
    lfa_l2_en, lfa_l2_excl = _parse_lfa_level(lfa_raw.get("level-2"))

    # TI-LFA (v1.5+)
    ti_lfa_raw = frr_raw.get("ti-lfa", {}) or {} if isinstance(frr_raw, dict) else {}
    ti_lfa = IsisInterfaceTiLfa(
        enabled=bool(ti_lfa_raw),
        level1_enabled="level-1" in ti_lfa_raw,
        level1_node_protection=isinstance(ti_lfa_raw.get("level-1"), dict)
            and "node-protection" in ti_lfa_raw.get("level-1", {}),
        level1_link_fallback=isinstance(ti_lfa_raw.get("level-1"), dict)
            and isinstance(ti_lfa_raw["level-1"].get("node-protection"), dict)
            and "link-fallback" in ti_lfa_raw["level-1"]["node-protection"],
        level2_enabled="level-2" in ti_lfa_raw,
        level2_node_protection=isinstance(ti_lfa_raw.get("level-2"), dict)
            and "node-protection" in ti_lfa_raw.get("level-2", {}),
        level2_link_fallback=isinstance(ti_lfa_raw.get("level-2"), dict)
            and isinstance(ti_lfa_raw["level-2"].get("node-protection"), dict)
            and "link-fallback" in ti_lfa_raw["level-2"]["node-protection"],
    )

    # Remote LFA (v1.5+)
    rlfa_raw = frr_raw.get("remote-lfa", {}) or {} if isinstance(frr_raw, dict) else {}

    def _parse_rlfa_level(lraw) -> tuple:
        if not isinstance(lraw, dict):
            return False, None, False
        enabled = True
        max_metric = _safe_int(lraw.get("maximum-metric"))
        tunnel_ldp = isinstance(lraw.get("tunnel"), dict) and "mpls-ldp" in lraw["tunnel"]
        return enabled, max_metric, tunnel_ldp

    rl1_en, rl1_mm, rl1_ldp = _parse_rlfa_level(rlfa_raw.get("level-1"))
    rl2_en, rl2_mm, rl2_ldp = _parse_rlfa_level(rlfa_raw.get("level-2"))

    return IsisInterface(
        name=name,
        circuit_type=cfg.get("circuit-type"),
        metric=_safe_int(cfg.get("metric")),
        hello_interval=_safe_int(cfg.get("hello-interval")),
        hello_multiplier=_safe_int(cfg.get("hello-multiplier")),
        hello_padding="hello-padding" in cfg,
        passive="passive" in cfg,
        point_to_point=isinstance(cfg.get("network"), dict) and "point-to-point" in cfg["network"],
        priority=_safe_int(cfg.get("priority")),
        psnp_interval=_safe_int(cfg.get("psnp-interval")),
        no_three_way_handshake="no-three-way-handshake" in cfg,
        password_md5=pwd_md5,
        password_plaintext=pwd_plain,
        bfd=bfd_enabled,
        bfd_profile=bfd_profile,
        ldp_sync_holddown=ldp_holddown,
        ldp_sync_disable=ldp_disable,
        lfa=IsisInterfaceLfa(
            level1_enabled=lfa_l1_en,
            level1_exclude_interfaces=lfa_l1_excl,
            level2_enabled=lfa_l2_en,
            level2_exclude_interfaces=lfa_l2_excl,
        ),
        ti_lfa=ti_lfa,
        remote_lfa=IsisInterfaceRemoteLfa(
            level1_enabled=rl1_en,
            level1_max_metric=rl1_mm,
            level1_tunnel_mpls_ldp=rl1_ldp,
            level2_enabled=rl2_en,
            level2_max_metric=rl2_mm,
            level2_tunnel_mpls_ldp=rl2_ldp,
        ),
    )


def _parse_redistribute_ipv4(raw: dict) -> List[IsisRedistributeEntry]:
    """Parse redistribute/ipv4/{protocol}/{level} entries."""
    if not raw:
        return []
    entries = []
    for protocol, levels in raw.items():
        if not isinstance(levels, dict):
            continue
        for level, level_cfg in levels.items():
            if level_cfg is None:
                level_cfg = {}
            entries.append(IsisRedistributeEntry(
                protocol=protocol,
                level=level,
                metric=_safe_int(level_cfg.get("metric")),
                route_map=level_cfg.get("route-map"),
            ))
    return sorted(entries, key=lambda x: (x.protocol, x.level))


def _parse_default_info(raw: dict) -> List[IsisDefaultInfoEntry]:
    """Parse default-information/originate/ipv4/{level} entries."""
    if not raw:
        return []
    entries = []
    for level, cfg in raw.items():
        if cfg is None:
            cfg = {}
        entries.append(IsisDefaultInfoEntry(
            level=level,
            always="always" in cfg,
            metric=_safe_int(cfg.get("metric")),
            route_map=cfg.get("route-map"),
        ))
    return sorted(entries, key=lambda x: x.level)


def _parse_segment_routing(raw: dict) -> IsisSegmentRouting:
    if not raw:
        return IsisSegmentRouting()

    gb = raw.get("global-block", {}) or {}
    lb = raw.get("local-block", {}) or {}

    # SRv6 locator (v1.5+)
    srv6_locator = None
    srv6_raw = raw.get("srv6", {}) or {}
    if isinstance(srv6_raw, dict):
        locator_raw = srv6_raw.get("locator", {})
        if isinstance(locator_raw, dict) and locator_raw:
            srv6_locator = list(locator_raw.keys())[0]
        elif isinstance(locator_raw, str):
            srv6_locator = locator_raw

    # Prefixes
    prefixes = []
    for prefix, pcfg in (raw.get("prefix", {}) or {}).items():
        if pcfg is None:
            pcfg = {}
        index_raw = pcfg.get("index", {}) or {}
        absolute_raw = pcfg.get("absolute", {}) or {}

        prefixes.append(IsisSrPrefix(
            prefix=prefix,
            index_value=_safe_int(index_raw.get("value")),
            index_explicit_null="explicit-null" in index_raw,
            index_no_php="no-php-flag" in index_raw,
            absolute_value=_safe_int(absolute_raw.get("value")),
            absolute_explicit_null="explicit-null" in absolute_raw,
            absolute_no_php="no-php-flag" in absolute_raw,
        ))

    return IsisSegmentRouting(
        global_block_low=_safe_int(gb.get("low-label-value")),
        global_block_high=_safe_int(gb.get("high-label-value")),
        local_block_low=_safe_int(lb.get("low-label-value")),
        local_block_high=_safe_int(lb.get("high-label-value")),
        maximum_label_depth=_safe_int(raw.get("maximum-label-depth")),
        prefixes=sorted(prefixes, key=lambda x: x.prefix),
        srv6_locator=srv6_locator,
    )


def _parse_traffic_engineering(raw: dict) -> IsisTrafficEngineering:
    if not raw:
        return IsisTrafficEngineering()
    return IsisTrafficEngineering(
        enabled="enable" in raw,
        address=raw.get("address"),
        export="export" in raw,
    )


def _parse_frr_global(raw: dict) -> IsisFrrGlobal:
    if not raw:
        return IsisFrrGlobal()
    lfa_raw = (raw.get("lfa", {}) or {})
    local_raw = (lfa_raw.get("local", {}) or {}) if isinstance(lfa_raw, dict) else {}
    ls_raw = (local_raw.get("load-sharing", {}) or {}) if isinstance(local_raw, dict) else {}
    disable_raw = (ls_raw.get("disable", {}) or {}) if isinstance(ls_raw, dict) else {}
    return IsisFrrGlobal(
        lfa_load_sharing_disable_level1="level-1" in disable_raw if isinstance(disable_raw, dict) else False,
        lfa_load_sharing_disable_level2="level-2" in disable_raw if isinstance(disable_raw, dict) else False,
    )
