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


def _parse_flow_isolation(raw) -> tuple[Optional[str], bool]:
    fi = _as_dict(raw)
    mode = next((m for m in FLOW_ISOLATION_MODES if m in fi), None)
    return mode, ("nat" in fi)


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

    if "flow-isolation" in raw:
        policy.flow_isolation, policy.flow_isolation_nat = _parse_flow_isolation(raw.get("flow-isolation"))

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
