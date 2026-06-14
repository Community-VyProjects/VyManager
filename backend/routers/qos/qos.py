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
import inspect
import logging
import json

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


# Friendly CAKE tin names per diffserv mode (the raw JSON tins[] are unnamed).
_CAKE_DIFFSERV_TINS = {
    "besteffort": ["Best Effort"],
    "diffserv3": ["Bulk", "Best Effort", "Voice"],
    "diffserv4": ["Bulk", "Best Effort", "Video", "Voice"],
}


def _to_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_int_or_none(value) -> Optional[int]:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _bytes_per_s_to_bits(value) -> Optional[int]:
    """tc reports CAKE rates in bytes/s; convert to bits/s for our models."""
    n = _to_int_or_none(value)
    return n * 8 if n is not None else None


def parse_shaper_qos_json(result: Optional[dict]) -> QoSStatsResponse:
    """Map ``ShowShaperQos`` structured JSON into per-interface/per-class stats.

    Shape: ``{"qos": {iface: {class_name: {rate, ceil, bytes, packets, drops,
    queued, overlimits, requeues, lended, borrowed, giants, queue_type,
    direction, policy_name, ...}}}}``. Shaper ``rate``/``ceil`` are already in
    bits/s (the op-mode multiplies tc's bytes/s by 8).
    """
    qos = (result or {}).get("qos", {}) or {}
    interfaces: List[QoSInterfaceStats] = []
    for ifname, classes in qos.items():
        if not isinstance(classes, dict):
            continue
        iface = QoSInterfaceStats(interface=ifname, policy_name=None, classes=[])
        for cls_name, c in classes.items():
            if not isinstance(c, dict):
                continue
            if iface.policy_name is None:
                iface.policy_name = c.get("policy_name") or None
            iface.classes.append(QoSClassStats(
                class_name=c.get("class_name") or cls_name,
                queue_type=c.get("queue_type") or None,
                direction=c.get("direction") or None,
                bandwidth=_to_int_or_none(c.get("rate")),
                ceiling=_to_int_or_none(c.get("ceil")),
                bytes=_to_int(c.get("bytes")),
                packets=_to_int(c.get("packets")),
                drops=_to_int(c.get("drops")),
                queued=_to_int(c.get("queued")),
                overlimits=_to_int(c.get("overlimits")),
                requeues=_to_int(c.get("requeues")),
                lended=_to_int(c.get("lended")),
                borrowed=_to_int(c.get("borrowed")),
                giants=_to_int(c.get("giants")),
            ))
        # ShowShaperQos lists every QoS-enabled interface, including cake ones
        # (which carry no shaper classes) — skip those empty entries.
        if iface.classes:
            interfaces.append(iface)
    return QoSStatsResponse(applied=bool(interfaces), interfaces=interfaces)


def parse_cake_qos_json(result: Optional[dict], interface: str, policy_name: Optional[str] = None) -> Optional[QoSCakeStats]:
    """Map ``ShowCakeQos`` structured JSON into CAKE stats, or None.

    Shape: ``ShowCakeQos`` wraps the ``tc -j -s qdisc`` object as
    ``{"qos": {ifname: {kind, options{bandwidth, diffserv, flowmode, ...}, bytes,
    packets, drops, overlimits, requeues, backlog, memory_used, memory_limit,
    capacity_estimate, tins:[{threshold_rate, sent_bytes, sent_packets, drops,
    ecn_mark, backlog_bytes, ...}]}}}``. CAKE rates are tc bytes/s, converted to
    bits/s here. Tin names are derived from the diffserv mode (the JSON tins are
    unnamed). Returns None if not a cake qdisc.
    """
    if not isinstance(result, dict):
        return None
    # Unwrap the {"qos": {ifname: ...}} envelope (fall back to result itself).
    cake = result
    if "qos" in result:
        qos = result.get("qos") or {}
        cake = qos.get(interface)
        if cake is None and len(qos) == 1:
            cake = next(iter(qos.values()))
    if not isinstance(cake, dict) or cake.get("kind") != "cake":
        return None

    result = cake
    options = result.get("options") or {}
    diffserv = options.get("diffserv")
    raw_tins = result.get("tins") or []

    names = _CAKE_DIFFSERV_TINS.get(diffserv or "")
    if not names or len(names) != len(raw_tins):
        names = [f"Tin {i}" for i in range(len(raw_tins))]

    tins: List[QoSCakeTin] = []
    for i, t in enumerate(raw_tins):
        if not isinstance(t, dict):
            continue
        tins.append(QoSCakeTin(
            name=names[i],
            threshold_rate=_bytes_per_s_to_bits(t.get("threshold_rate")),
            sent_bytes=_to_int(t.get("sent_bytes")),
            sent_packets=_to_int(t.get("sent_packets")),
            drops=_to_int(t.get("drops")),
            marks=_to_int(t.get("ecn_mark")),
            backlog_bytes=_to_int(t.get("backlog_bytes")),
        ))

    return QoSCakeStats(
        interface=interface,
        policy_name=policy_name,
        bandwidth=_bytes_per_s_to_bits(options.get("bandwidth")),
        diffserv=diffserv,
        flow_mode=options.get("flowmode"),
        capacity_estimate=_bytes_per_s_to_bits(result.get("capacity_estimate")),
        memory_used=_to_int_or_none(result.get("memory_used")),
        memory_limit=_to_int_or_none(result.get("memory_limit")),
        bytes=_to_int(result.get("bytes")),
        packets=_to_int(result.get("packets")),
        drops=_to_int(result.get("drops")),
        overlimits=_to_int(result.get("overlimits")),
        requeues=_to_int(result.get("requeues")),
        backlog=_to_int(result.get("backlog")),
        tins=tins,
    )


def _config_single(value):
    """VyOS config values may be a scalar or a single-element list."""
    if isinstance(value, list):
        return value[0] if value else None
    return value


def find_cake_targets(config) -> List[tuple]:
    """Return ``[(interface, policy)]`` for interfaces bound to a cake policy.

    Accepts either the full config (``{"qos": {...}}``) or the bare qos subtree.
    """
    qos = config or {}
    if isinstance(qos, dict) and "qos" in qos:
        qos = qos.get("qos") or {}
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


def qos_op_result(data: dict, alias: str) -> Optional[dict]:
    """Extract a typed QoS op's structured ``result`` from a GraphQL data dict.

    Returns None for "no policy applied" (op returns ``success: false`` / null
    data) and for the empty-cake case (``result`` is "" on an interface with no
    cake qdisc) — the parsers treat None as "nothing here".
    """
    node = (data or {}).get(alias)
    if not isinstance(node, dict) or not node.get("success"):
        return None
    inner = node.get("data")
    if isinstance(inner, dict) and isinstance(inner.get("result"), dict):
        return inner["result"]
    return None


def qos_gql_fields(key_literal: str, cake_targets: List[tuple]) -> List[str]:
    """GraphQL alias fields that fetch QoS stats, for batching into a larger query.

    ``key_literal`` must be a JSON-encoded API key (``json.dumps(key)``). Returns a
    ``Shaper`` field (all shaper interfaces in one op) plus a ``Cake_<i>`` field
    per cake interface. The typed ops return structured JSON in ``data.result``.
    Used by the dashboard broadcaster (routers/show.py) to fold QoS into the same
    GraphQL call as interface counters.
    """
    fields = [
        f"Shaper: ShowShaperQos(data: {{key: {key_literal}, detail: true}}) {{ success data {{ result }} }}"
    ]
    for idx, (ifname, _policy) in enumerate(cake_targets):
        fields.append(
            f"Cake_{idx}: ShowCakeQos(data: {{key: {key_literal}, ifname: {json.dumps(ifname)}}}) "
            "{ success data { result } }"
        )
    return fields


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
