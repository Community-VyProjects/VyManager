"""QoS (Quality of Service) Router.

API endpoints for managing VyOS QoS configuration (config tree root: ``qos``).

Version differences (surfaced via capabilities):
  - ``traffic-match-group`` and per-class ``match-group`` are 1.5 only.
  - ``shaper-hfsc`` exists on both 1.4 and 1.5.

Endpoints:
  GET  /vyos/qos/capabilities  — version-aware feature flags + shared enums
  GET  /vyos/qos/config        — normalized QoS configuration
  POST /vyos/qos/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.qos import QoSBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from graphql_show import gql_show_batch
import inspect
import logging
import re

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/qos", tags=["qos"])


# ============================================================================
# Pydantic Models
# ============================================================================


class QoSMatchAddr(BaseModel):
    """IP/IPv6 match fields (identical shape for ip and ipv6)."""
    destination_address: Optional[str] = None
    destination_port: Optional[str] = None
    source_address: Optional[str] = None
    source_port: Optional[str] = None
    dscp: Optional[str] = None
    max_length: Optional[str] = None
    protocol: Optional[str] = None
    tcp_ack: bool = False
    tcp_syn: bool = False


class QoSMatchEther(BaseModel):
    destination: Optional[str] = None
    source: Optional[str] = None
    protocol: Optional[str] = None


class QoSMatchRule(BaseModel):
    name: str
    description: Optional[str] = None
    interface: Optional[str] = None
    mark: Optional[str] = None
    vif: Optional[str] = None
    ether: Optional[QoSMatchEther] = None
    ip: Optional[QoSMatchAddr] = None
    ipv6: Optional[QoSMatchAddr] = None


class QoSServiceCurve(BaseModel):
    """HFSC service curve (linkshare / realtime / upperlimit)."""
    d: Optional[str] = None
    m1: Optional[str] = None
    m2: Optional[str] = None


class QoSClass(BaseModel):
    """A class (or the default node when class_id == 'default').

    Carries the union of all class fields across policy types; only the
    relevant ones are populated for a given type.
    """
    class_id: str
    description: Optional[str] = None
    average_packet: Optional[str] = None
    bandwidth: Optional[str] = None
    burst: Optional[str] = None
    ceiling: Optional[str] = None
    codel_quantum: Optional[str] = None
    exceed: Optional[str] = None
    flows: Optional[str] = None
    interval: Optional[str] = None
    mark_probability: Optional[str] = None
    maximum_threshold: Optional[str] = None
    minimum_threshold: Optional[str] = None
    mtu: Optional[str] = None
    not_exceed: Optional[str] = None
    priority: Optional[str] = None
    quantum: Optional[str] = None
    queue_limit: Optional[str] = None
    queue_type: Optional[str] = None
    set_dscp: Optional[str] = None
    target: Optional[str] = None
    linkshare: Optional[QoSServiceCurve] = None
    realtime: Optional[QoSServiceCurve] = None
    upperlimit: Optional[QoSServiceCurve] = None
    match_groups: List[str] = []
    matches: List[QoSMatchRule] = []


class QoSPrecedence(BaseModel):
    """random-detect precedence entry."""
    precedence: str
    average_packet: Optional[str] = None
    mark_probability: Optional[str] = None
    maximum_threshold: Optional[str] = None
    minimum_threshold: Optional[str] = None
    queue_limit: Optional[str] = None


class QoSPolicy(BaseModel):
    """A named QoS policy of a given type."""
    type: str
    name: str
    description: Optional[str] = None
    # Direct scalar fields (subset relevant per type)
    bandwidth: Optional[str] = None
    rtt: Optional[str] = None
    queue_limit: Optional[str] = None
    hash_interval: Optional[str] = None
    codel_quantum: Optional[str] = None
    flows: Optional[str] = None
    interval: Optional[str] = None
    target: Optional[str] = None
    corruption: Optional[str] = None
    delay: Optional[str] = None
    duplicate: Optional[str] = None
    loss: Optional[str] = None
    reordering: Optional[str] = None
    burst: Optional[str] = None
    latency: Optional[str] = None
    # cake flow isolation
    flow_isolation: Optional[str] = None
    flow_isolation_nat: bool = False
    # class-based
    classes: List[QoSClass] = []
    default: Optional[QoSClass] = None
    # random-detect
    precedences: List[QoSPrecedence] = []


class QoSInterface(BaseModel):
    name: str
    ingress: Optional[str] = None
    egress: Optional[str] = None


class QoSTrafficMatchGroup(BaseModel):
    name: str
    description: Optional[str] = None
    match_groups: List[str] = []
    matches: List[QoSMatchRule] = []


class QoSConfig(BaseModel):
    interfaces: List[QoSInterface] = []
    policies: List[QoSPolicy] = []
    traffic_match_groups: List[QoSTrafficMatchGroup] = []


class QoSBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description="Comma-separated argument(s); the trailing value absorbs extra commas.",
    )


class QoSBatchRequest(BaseModel):
    operations: List[QoSBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ----- Live statistics (parsed from `show qos shaper detail`) -----


class QoSClassStats(BaseModel):
    """Per-class shaper counters for one traffic class on one interface."""
    class_name: str                     # "root", "default", or a class id like "10"
    queue_type: Optional[str] = None    # htb, fq_codel, sfq, ...
    direction: Optional[str] = None     # egress / ingress
    bandwidth: Optional[int] = None     # configured rate, bits/s
    ceiling: Optional[int] = None       # max bandwidth (ceil), bits/s
    bytes: int = 0
    packets: int = 0
    drops: int = 0
    queued: int = 0
    overlimits: int = 0
    requeues: int = 0
    lended: int = 0
    borrowed: int = 0
    giants: int = 0


class QoSInterfaceStats(BaseModel):
    interface: str
    policy_name: Optional[str] = None
    classes: List[QoSClassStats] = []


# ----- CAKE statistics (parsed from `show qos cake interface <if>`) -----
#
# CAKE is a single qdisc (no per-config-class breakdown); its "classes" are
# diffserv tins (e.g. Bulk / Best Effort / Voice). The API returns the raw
# `tc -s qdisc show dev <if>` text dump, which we parse below.


class QoSCakeTin(BaseModel):
    """One CAKE diffserv tin's counters."""
    name: str                            # "Bulk", "Best Effort", "Voice", "Tin 0", ...
    threshold_rate: Optional[int] = None # tin shaper threshold, bits/s
    sent_bytes: int = 0
    sent_packets: int = 0
    drops: int = 0
    marks: int = 0                       # ECN marks
    backlog_bytes: int = 0


class QoSCakeStats(BaseModel):
    interface: str
    policy_name: Optional[str] = None
    bandwidth: Optional[int] = None         # configured shaper rate, bits/s (None = unlimited)
    diffserv: Optional[str] = None          # diffserv3 / diffserv4 / besteffort / ...
    flow_mode: Optional[str] = None         # flows / triple-isolate / dual-srchost / ...
    capacity_estimate: Optional[int] = None # bits/s
    memory_used: Optional[int] = None       # bytes
    memory_limit: Optional[int] = None      # bytes
    # Aggregate qdisc counters (from the "Sent ... (dropped ...)" line):
    bytes: int = 0
    packets: int = 0
    drops: int = 0
    overlimits: int = 0
    requeues: int = 0
    backlog: int = 0
    tins: List[QoSCakeTin] = []


class QoSStatsResponse(BaseModel):
    # False when no QoS (shaper or cake) is applied to any interface.
    applied: bool = True
    interfaces: List[QoSInterfaceStats] = []   # shaper / shaper-hfsc policies
    cake: List[QoSCakeStats] = []              # cake policies


# ============================================================================
# Internal builder method denylist
# ============================================================================

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty",
    "get_capabilities", "mappers", "version", "_operations", "m",
})

# vyos-key -> model field for class/default scalar attributes
_CLASS_SCALAR_FIELDS = {
    "average-packet": "average_packet",
    "bandwidth": "bandwidth",
    "burst": "burst",
    "ceiling": "ceiling",
    "codel-quantum": "codel_quantum",
    "description": "description",
    "exceed": "exceed",
    "flows": "flows",
    "interval": "interval",
    "mark-probability": "mark_probability",
    "maximum-threshold": "maximum_threshold",
    "minimum-threshold": "minimum_threshold",
    "mtu": "mtu",
    "not-exceed": "not_exceed",
    "priority": "priority",
    "quantum": "quantum",
    "queue-limit": "queue_limit",
    "queue-type": "queue_type",
    "set-dscp": "set_dscp",
    "target": "target",
}

FLOW_ISOLATION_MODES = [
    "blind", "dst-host", "dual-dst-host", "dual-src-host", "flow", "host",
    "src-host", "triple-isolate",
]


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_qos_capabilities(request: Request):
    """Return QoS feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.QOS)
    try:
        service = get_session_vyos_service(request)
        builder = QoSBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_qos_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=QoSConfig)
async def get_qos_config(http_request: Request, refresh: bool = False):
    """Return the full QoS configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.QOS)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        qos_raw = full_config.get("qos", {})
        if not qos_raw or not isinstance(qos_raw, dict):
            return QoSConfig()

        return QoSConfig(
            interfaces=_parse_interfaces(qos_raw),
            policies=_parse_policies(qos_raw),
            traffic_match_groups=_parse_traffic_match_groups(qos_raw),
        )
    except Exception:
        logger.exception("Unhandled error in get_qos_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def qos_batch_configure(http_request: Request, body: QoSBatchRequest):
    """Execute a batch of QoS configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.QOS)
    try:
        service = get_session_vyos_service(http_request)
        builder = QoSBatchBuilder(version=service.get_version())

        for operation in body.operations:
            if operation.op in _INTERNAL_BUILDER_METHODS or operation.op.startswith("_"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation not allowed: {operation.op}",
                )

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
            elif len(params) >= 2:
                if operation.value and "," in operation.value:
                    parts = operation.value.split(",", len(params) - 1)
                    method(*parts)
                elif operation.value:
                    method(operation.value)

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "QoS configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in qos_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 4: Live statistics
# ============================================================================


# Pipe-form key (in `show qos shaper detail`) -> QoSClassStats integer field.
_STATS_INT_FIELDS = {
    "Bandwidth": "bandwidth",
    "Max. BW": "ceiling",
    "Bytes": "bytes",
    "Packets": "packets",
    "Drops": "drops",
    "Queued": "queued",
    "Overlimit": "overlimits",
    "Requeue": "requeues",
    "Lended": "lended",
    "Borrowed": "borrowed",
    "Giants": "giants",
}


def parse_qos_shaper_detail(output: str) -> QoSStatsResponse:
    """Parse ``show qos shaper detail`` text into per-interface/per-class stats.

    The VyOS HTTP API returns this op-mode command as plain text (the structured
    ``--raw`` JSON is not reachable over the API). The detail output is a series
    of blank-line-separated blocks; each class block is a list of ``key | value``
    lines::

         Interface   | eth3
         Policy Name | VYMGR_PROBE
         Direction   | egress
         Class       | 10
         Type        | fq_codel
         Bandwidth   | 30000000
         Bytes       | 12345
         ...

    Decorative ``-----`` rules and colon-form headers (``Interface: eth3``) are
    ignored; every value is read from the pipe-form lines, so each class is
    attributed to its own interface regardless of surrounding headers.
    """
    text = output or ""
    if "not applied" in text.lower():
        return QoSStatsResponse(applied=False, interfaces=[])

    by_iface: Dict[str, QoSInterfaceStats] = {}
    order: List[str] = []

    for block in re.split(r"\n\s*\n", text):
        fields: Dict[str, str] = {}
        for line in block.splitlines():
            if "|" not in line:
                continue
            key, _, val = line.partition("|")
            key, val = key.strip(), val.strip()
            if key:
                fields[key] = val

        # Only class blocks carry a "Class" key; skip headers / blank blocks.
        if "Class" not in fields:
            continue
        iface = fields.get("Interface")
        if not iface:
            continue

        def _to_int(name: str) -> int:
            try:
                return int(fields.get(name, "0"))
            except (TypeError, ValueError):
                return 0

        stats = QoSClassStats(
            class_name=fields["Class"],
            queue_type=fields.get("Type") or None,
            direction=fields.get("Direction") or None,
            bandwidth=_to_int("Bandwidth") if "Bandwidth" in fields else None,
            ceiling=_to_int("Max. BW") if "Max. BW" in fields else None,
            **{field: _to_int(key) for key, field in _STATS_INT_FIELDS.items()
               if field not in ("bandwidth", "ceiling")},
        )

        if iface not in by_iface:
            by_iface[iface] = QoSInterfaceStats(
                interface=iface,
                policy_name=fields.get("Policy Name") or None,
                classes=[],
            )
            order.append(iface)
        by_iface[iface].classes.append(stats)

    interfaces = [by_iface[name] for name in order]
    return QoSStatsResponse(applied=bool(interfaces), interfaces=interfaces)


# Row labels in CAKE's per-tin table (`tc -s qdisc show`).
_CAKE_TIN_ROWS = {
    "thresh", "target", "interval", "pk_delay", "av_delay", "sp_delay",
    "backlog", "pkts", "bytes", "way_inds", "way_miss", "way_cols",
    "drops", "marks", "ack_drop", "sp_flows", "bk_flows", "un_flows",
    "max_len", "quantum",
}

# CAKE flow-isolation modes, longest-first so compound names win.
_CAKE_FLOW_MODES = [
    "triple-isolate", "dual-srchost", "dual-dsthost",
    "flowblind", "srchost", "dsthost", "hosts", "flows",
]


def _parse_rate_to_bps(s: Optional[str]) -> Optional[int]:
    """Parse a tc rate like '50Mbit' / '3125Kbit' / '1Gbit' into bits/s."""
    if not s:
        return None
    m = re.match(r"^([\d.]+)([KMGT]?)bit$", s.strip(), re.IGNORECASE)
    if not m:
        return None
    mult = {"": 1, "K": 1e3, "M": 1e6, "G": 1e9, "T": 1e12}[m.group(2).upper()]
    return int(float(m.group(1)) * mult)


def _parse_size_to_bytes(s: Optional[str]) -> Optional[int]:
    """Parse a tc size like '0b' / '4Mb' / '65535b' into bytes (1024-based)."""
    if not s:
        return None
    m = re.match(r"^([\d.]+)([KMGT]?)i?b$", s.strip(), re.IGNORECASE)
    if not m:
        return None
    mult = {"": 1, "K": 1 << 10, "M": 1 << 20, "G": 1 << 30, "T": 1 << 40}[m.group(2).upper()]
    return int(float(m.group(1)) * mult)


def parse_qos_cake(output: str, interface: str, policy_name: Optional[str] = None) -> Optional[QoSCakeStats]:
    """Parse ``show qos cake interface <if>`` text into CAKE stats, or None.

    The API returns the raw ``tc -s qdisc show dev <if>`` dump: a qdisc line,
    an aggregate ``Sent N bytes N pkt (dropped .. overlimits .. requeues ..)``
    summary, then a per-tin column table (diffserv tins, e.g. Bulk / Best
    Effort / Voice). Returns None when the interface's root qdisc isn't cake.
    """
    text = output or ""
    lines = text.splitlines()

    qdisc_line = next((ln for ln in lines if "qdisc cake" in ln), None)
    if not qdisc_line:
        return None

    stats = QoSCakeStats(interface=interface, policy_name=policy_name)

    m = re.search(r"bandwidth\s+(\S+)", qdisc_line)
    if m:
        stats.bandwidth = _parse_rate_to_bps(m.group(1))
    m = re.search(r"\b(diffserv\d|besteffort|diffserv-llt)\b", qdisc_line)
    if m:
        stats.diffserv = m.group(1)
    for mode in _CAKE_FLOW_MODES:
        if re.search(rf"\b{re.escape(mode)}\b", qdisc_line):
            stats.flow_mode = mode
            break

    m = re.search(
        r"Sent\s+(\d+)\s+bytes\s+(\d+)\s+pkt\s+\(dropped\s+(\d+),\s+overlimits\s+(\d+)\s+requeues\s+(\d+)\)",
        text,
    )
    if m:
        stats.bytes, stats.packets = int(m.group(1)), int(m.group(2))
        stats.drops, stats.overlimits, stats.requeues = int(m.group(3)), int(m.group(4)), int(m.group(5))

    m = re.search(r"backlog\s+(\d+)b\s+\d+p", text)
    if m:
        stats.backlog = int(m.group(1))

    m = re.search(r"memory used:\s+(\S+)\s+of\s+(\S+)", text)
    if m:
        stats.memory_used = _parse_size_to_bytes(m.group(1))
        stats.memory_limit = _parse_size_to_bytes(m.group(2))

    m = re.search(r"capacity estimate:\s+(\S+)", text)
    if m:
        stats.capacity_estimate = _parse_rate_to_bps(m.group(1))

    # Per-tin table: header line of tin names (just above "thresh"), then rows.
    rows: Dict[str, List[str]] = {}
    tin_names: List[str] = []
    for i, ln in enumerate(lines):
        stripped = ln.strip()
        parts = stripped.split()
        if parts and parts[0] in _CAKE_TIN_ROWS and len(parts) > 1:
            rows[parts[0]] = parts[1:]
            if parts[0] == "thresh" and not tin_names:
                for j in range(i - 1, -1, -1):
                    if lines[j].strip():
                        # Columns are separated by 2+ spaces; multi-word tin
                        # names (e.g. "Best Effort") keep their single space.
                        tin_names = re.split(r"\s{2,}", lines[j].strip())
                        break

    if not tin_names and "bytes" in rows:
        tin_names = [f"Tin {i}" for i in range(len(rows["bytes"]))]

    def _cell(label: str, idx: int) -> Optional[str]:
        vals = rows.get(label)
        return vals[idx] if vals and idx < len(vals) else None

    def _cell_int(label: str, idx: int) -> int:
        try:
            return int(_cell(label, idx) or 0)
        except (TypeError, ValueError):
            return 0

    for idx, name in enumerate(tin_names):
        stats.tins.append(QoSCakeTin(
            name=name,
            threshold_rate=_parse_rate_to_bps(_cell("thresh", idx)),
            sent_bytes=_cell_int("bytes", idx),
            sent_packets=_cell_int("pkts", idx),
            drops=_cell_int("drops", idx),
            marks=_cell_int("marks", idx),
            backlog_bytes=_parse_size_to_bytes(_cell("backlog", idx)) or 0,
        ))

    return stats


def _config_single(value):
    """VyOS config values may be a scalar or a single-element list."""
    if isinstance(value, list):
        return value[0] if value else None
    return value


def _find_cake_targets(full_config) -> List[tuple]:
    """Return ``[(interface, policy)]`` for interfaces bound to a cake policy."""
    qos = (full_config or {}).get("qos", {}) or {}
    cake_policies = set(((qos.get("policy", {}) or {}).get("cake", {}) or {}).keys())

    seen: set = set()
    targets: List[tuple] = []
    for ifname, binding in (qos.get("interface", {}) or {}).items():
        if not isinstance(binding, dict) or ifname in seen:
            continue
        for direction in ("egress", "ingress"):
            policy = _config_single(binding.get(direction))
            if policy and policy in cake_policies:
                seen.add(ifname)
                targets.append((ifname, policy))
                break
    return targets


@router.get("/stats", response_model=QoSStatsResponse)
async def get_qos_stats(http_request: Request):
    """Return live QoS statistics for shaper and CAKE policies.

    Both shaper detail (one command, all interfaces) and each CAKE interface's
    ``show qos cake interface <if>`` are fetched in a SINGLE batched GraphQL
    request via aliases, rather than one REST call per command. The API returns
    them as text; real-time bandwidth is derived client-side from byte deltas.
    The CAKE interface list comes from the in-process config cache, so the
    steady-state poll costs just one network round-trip.
    """
    await require_read_permission(http_request, FeatureGroup.QOS)
    try:
        service = get_session_vyos_service(http_request)

        # Cached config (no round-trip in steady state) to enumerate cake interfaces.
        full_config = await run_in_threadpool(service.get_full_config, refresh=False)
        cake_targets = _find_cake_targets(full_config)

        # One batched GraphQL POST: shaper detail + each cake interface.
        # Interface names can contain '.', so use index-based aliases.
        alias_paths: Dict[str, List[str]] = {"Shaper": ["qos", "shaper", "detail"]}
        for idx, (ifname, _policy) in enumerate(cake_targets):
            alias_paths[f"Cake_{idx}"] = ["qos", "cake", "interface", ifname]
        results = await gql_show_batch(service, alias_paths)

        response = parse_qos_shaper_detail(results.get("Shaper", "") or "")

        cake_stats: List[QoSCakeStats] = []
        for idx, (ifname, policy) in enumerate(cake_targets):
            text = results.get(f"Cake_{idx}")
            if not text:
                continue
            parsed = parse_qos_cake(text, ifname, policy)
            if parsed:
                cake_stats.append(parsed)

        response.cake = cake_stats
        response.applied = bool(response.interfaces) or bool(cake_stats)
        return response
    except Exception:
        logger.exception("Unhandled error in get_qos_stats")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config parsers
# ============================================================================


def _as_dict(raw) -> dict:
    return raw if isinstance(raw, dict) else {}


def _parse_multi_value(raw) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return sorted(str(v) for v in raw)
    if isinstance(raw, dict):
        return sorted(raw.keys())
    return [str(raw)]


def _parse_interfaces(qos_raw: dict) -> List[QoSInterface]:
    iface_raw = _as_dict(qos_raw.get("interface"))
    result = []
    for name, cfg in iface_raw.items():
        cfg = _as_dict(cfg)
        result.append(QoSInterface(
            name=name,
            ingress=cfg.get("ingress"),
            egress=cfg.get("egress"),
        ))
    result.sort(key=lambda i: i.name)
    return result


def _parse_match_addr(raw) -> Optional[QoSMatchAddr]:
    raw = _as_dict(raw)
    if not raw:
        return None
    dest = _as_dict(raw.get("destination"))
    src = _as_dict(raw.get("source"))
    tcp = _as_dict(raw.get("tcp"))
    return QoSMatchAddr(
        destination_address=dest.get("address"),
        destination_port=dest.get("port"),
        source_address=src.get("address"),
        source_port=src.get("port"),
        dscp=raw.get("dscp"),
        max_length=raw.get("max-length"),
        protocol=raw.get("protocol"),
        tcp_ack="ack" in tcp,
        tcp_syn="syn" in tcp,
    )


def _parse_match_rule(name: str, raw) -> QoSMatchRule:
    raw = _as_dict(raw)
    ether_raw = _as_dict(raw.get("ether"))
    ether = None
    if ether_raw:
        ether = QoSMatchEther(
            destination=ether_raw.get("destination"),
            source=ether_raw.get("source"),
            protocol=ether_raw.get("protocol"),
        )
    return QoSMatchRule(
        name=name,
        description=raw.get("description"),
        interface=raw.get("interface"),
        mark=raw.get("mark"),
        vif=raw.get("vif"),
        ether=ether,
        ip=_parse_match_addr(raw.get("ip")),
        ipv6=_parse_match_addr(raw.get("ipv6")),
    )


def _parse_matches(raw) -> List[QoSMatchRule]:
    matches_raw = _as_dict(raw)
    result = [_parse_match_rule(name, cfg) for name, cfg in matches_raw.items()]
    result.sort(key=lambda m: m.name)
    return result


def _parse_service_curve(raw) -> Optional[QoSServiceCurve]:
    raw = _as_dict(raw)
    if not raw:
        return None
    return QoSServiceCurve(d=raw.get("d"), m1=raw.get("m1"), m2=raw.get("m2"))


def _parse_class(class_id: str, raw) -> QoSClass:
    raw = _as_dict(raw)
    data: Dict[str, Any] = {"class_id": class_id}
    for vyos_key, field in _CLASS_SCALAR_FIELDS.items():
        if vyos_key in raw:
            data[field] = raw.get(vyos_key)
    cls = QoSClass(**data)
    cls.linkshare = _parse_service_curve(raw.get("linkshare"))
    cls.realtime = _parse_service_curve(raw.get("realtime"))
    cls.upperlimit = _parse_service_curve(raw.get("upperlimit"))
    cls.match_groups = _parse_multi_value(raw.get("match-group"))
    cls.matches = _parse_matches(raw.get("match"))
    return cls


def _parse_precedences(raw) -> List[QoSPrecedence]:
    prec_raw = _as_dict(raw)
    result = []
    for prec, cfg in prec_raw.items():
        cfg = _as_dict(cfg)
        result.append(QoSPrecedence(
            precedence=prec,
            average_packet=cfg.get("average-packet"),
            mark_probability=cfg.get("mark-probability"),
            maximum_threshold=cfg.get("maximum-threshold"),
            minimum_threshold=cfg.get("minimum-threshold"),
            queue_limit=cfg.get("queue-limit"),
        ))
    result.sort(key=lambda p: p.precedence)
    return result


def _parse_policy(ptype: str, name: str, raw) -> QoSPolicy:
    raw = _as_dict(raw)
    policy = QoSPolicy(type=ptype, name=name)
    policy.description = raw.get("description")
    policy.bandwidth = raw.get("bandwidth")
    policy.rtt = raw.get("rtt")
    policy.queue_limit = raw.get("queue-limit")
    policy.hash_interval = raw.get("hash-interval")
    policy.codel_quantum = raw.get("codel-quantum")
    policy.flows = raw.get("flows")
    policy.interval = raw.get("interval")
    policy.target = raw.get("target")
    policy.corruption = raw.get("corruption")
    policy.delay = raw.get("delay")
    policy.duplicate = raw.get("duplicate")
    policy.loss = raw.get("loss")
    policy.reordering = raw.get("reordering")
    policy.burst = raw.get("burst")
    policy.latency = raw.get("latency")

    # `flow-isolation` is a leaf node holding a single mode value (e.g.
    # "src-host"); `flow-isolation-nat` is a separate valueless sibling.
    fi = raw.get("flow-isolation")
    policy.flow_isolation = fi if isinstance(fi, str) and fi in FLOW_ISOLATION_MODES else None
    policy.flow_isolation_nat = "flow-isolation-nat" in raw

    classes_raw = _as_dict(raw.get("class"))
    policy.classes = sorted(
        (_parse_class(cid, cfg) for cid, cfg in classes_raw.items()),
        key=lambda c: c.class_id,
    )

    if "default" in raw:
        policy.default = _parse_class("default", raw.get("default"))

    policy.precedences = _parse_precedences(raw.get("precedence"))
    return policy


def _parse_policies(qos_raw: dict) -> List[QoSPolicy]:
    policy_raw = _as_dict(qos_raw.get("policy"))
    result = []
    for ptype, named in policy_raw.items():
        for name, cfg in _as_dict(named).items():
            result.append(_parse_policy(ptype, name, cfg))
    result.sort(key=lambda p: (p.type, p.name))
    return result


def _parse_traffic_match_groups(qos_raw: dict) -> List[QoSTrafficMatchGroup]:
    tmg_raw = _as_dict(qos_raw.get("traffic-match-group"))
    result = []
    for name, cfg in tmg_raw.items():
        cfg = _as_dict(cfg)
        result.append(QoSTrafficMatchGroup(
            name=name,
            description=cfg.get("description"),
            match_groups=_parse_multi_value(cfg.get("match-group")),
            matches=_parse_matches(cfg.get("match")),
        ))
    result.sort(key=lambda g: g.name)
    return result
