"""Read-model for QoS config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. traffic-match-group is a 1.5-only node; the router parser reads
it on every version.
"""

from typing import Any, Dict, List, Optional


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
    "blind",
    "dst-host",
    "dual-dst-host",
    "dual-src-host",
    "flow",
    "host",
    "src-host",
    "triple-isolate",
]


def _as_dict(raw) -> dict:
    return raw if isinstance(raw, dict) else {}


def parse_multi_value(raw) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return sorted(str(v) for v in raw)
    if isinstance(raw, dict):
        return sorted(raw.keys())
    return [str(raw)]


def parse_interfaces(qos_raw: dict) -> List[Dict[str, Any]]:
    iface_raw = _as_dict(qos_raw.get("interface"))
    result = []
    for name, cfg in iface_raw.items():
        cfg = _as_dict(cfg)
        result.append(
            {
                "name": name,
                "ingress": cfg.get("ingress"),
                "egress": cfg.get("egress"),
            }
        )
    result.sort(key=lambda i: i["name"])
    return result


def parse_match_addr(raw) -> Optional[Dict[str, Any]]:
    raw = _as_dict(raw)
    if not raw:
        return None
    dest = _as_dict(raw.get("destination"))
    src = _as_dict(raw.get("source"))
    tcp = _as_dict(raw.get("tcp"))
    return {
        "destination_address": dest.get("address"),
        "destination_port": dest.get("port"),
        "source_address": src.get("address"),
        "source_port": src.get("port"),
        "dscp": raw.get("dscp"),
        "max_length": raw.get("max-length"),
        "protocol": raw.get("protocol"),
        "tcp_ack": "ack" in tcp,
        "tcp_syn": "syn" in tcp,
    }


def parse_match_rule(name: str, raw) -> Dict[str, Any]:
    raw = _as_dict(raw)
    ether_raw = _as_dict(raw.get("ether"))
    ether = None
    if ether_raw:
        ether = {
            "destination": ether_raw.get("destination"),
            "source": ether_raw.get("source"),
            "protocol": ether_raw.get("protocol"),
        }
    return {
        "name": name,
        "description": raw.get("description"),
        "interface": raw.get("interface"),
        "mark": raw.get("mark"),
        "vif": raw.get("vif"),
        "ether": ether,
        "ip": parse_match_addr(raw.get("ip")),
        "ipv6": parse_match_addr(raw.get("ipv6")),
    }


def parse_matches(raw) -> List[Dict[str, Any]]:
    matches_raw = _as_dict(raw)
    result = [parse_match_rule(name, cfg) for name, cfg in matches_raw.items()]
    result.sort(key=lambda m: m["name"])
    return result


def parse_service_curve(raw) -> Optional[Dict[str, Any]]:
    raw = _as_dict(raw)
    if not raw:
        return None
    return {"d": raw.get("d"), "m1": raw.get("m1"), "m2": raw.get("m2")}


def parse_class(class_id: str, raw) -> Dict[str, Any]:
    raw = _as_dict(raw)
    data: Dict[str, Any] = {"class_id": class_id}
    for vyos_key, field in _CLASS_SCALAR_FIELDS.items():
        if vyos_key in raw:
            data[field] = raw.get(vyos_key)
    data["linkshare"] = parse_service_curve(raw.get("linkshare"))
    data["realtime"] = parse_service_curve(raw.get("realtime"))
    data["upperlimit"] = parse_service_curve(raw.get("upperlimit"))
    data["match_groups"] = parse_multi_value(raw.get("match-group"))
    data["matches"] = parse_matches(raw.get("match"))
    return data


def parse_precedences(raw) -> List[Dict[str, Any]]:
    prec_raw = _as_dict(raw)
    result = []
    for prec, cfg in prec_raw.items():
        cfg = _as_dict(cfg)
        result.append(
            {
                "precedence": prec,
                "average_packet": cfg.get("average-packet"),
                "mark_probability": cfg.get("mark-probability"),
                "maximum_threshold": cfg.get("maximum-threshold"),
                "minimum_threshold": cfg.get("minimum-threshold"),
                "queue_limit": cfg.get("queue-limit"),
            }
        )
    result.sort(key=lambda p: p["precedence"])
    return result


def parse_policy(ptype: str, name: str, raw) -> Dict[str, Any]:
    raw = _as_dict(raw)
    policy: Dict[str, Any] = {
        "type": ptype,
        "name": name,
        "description": raw.get("description"),
        "bandwidth": raw.get("bandwidth"),
        "rtt": raw.get("rtt"),
        "queue_limit": raw.get("queue-limit"),
        "hash_interval": raw.get("hash-interval"),
        "codel_quantum": raw.get("codel-quantum"),
        "flows": raw.get("flows"),
        "interval": raw.get("interval"),
        "target": raw.get("target"),
        "corruption": raw.get("corruption"),
        "delay": raw.get("delay"),
        "duplicate": raw.get("duplicate"),
        "loss": raw.get("loss"),
        "reordering": raw.get("reordering"),
        "burst": raw.get("burst"),
        "latency": raw.get("latency"),
    }

    # `flow-isolation` is a leaf node holding a single mode value (e.g.
    # "src-host"); `flow-isolation-nat` is a separate valueless sibling.
    fi = raw.get("flow-isolation")
    policy["flow_isolation"] = fi if isinstance(fi, str) and fi in FLOW_ISOLATION_MODES else None
    policy["flow_isolation_nat"] = "flow-isolation-nat" in raw
    ack = raw.get("ack-filter")
    if "ack-filter" not in raw:
        policy["ack_filter"] = None
    elif isinstance(ack, dict) and "aggressive" in ack:
        policy["ack_filter"] = "aggressive"
    else:
        policy["ack_filter"] = "filter"
    policy["no_split_gso"] = "no-split-gso" in raw

    classes_raw = _as_dict(raw.get("class"))
    policy["classes"] = sorted(
        (parse_class(cid, cfg) for cid, cfg in classes_raw.items()),
        key=lambda c: c["class_id"],
    )
    policy["default"] = (
        parse_class("default", raw.get("default")) if "default" in raw else None
    )
    policy["precedences"] = parse_precedences(raw.get("precedence"))
    return policy


def parse_policies(qos_raw: dict) -> List[Dict[str, Any]]:
    policy_raw = _as_dict(qos_raw.get("policy"))
    result = []
    for ptype, named in policy_raw.items():
        for name, cfg in _as_dict(named).items():
            result.append(parse_policy(ptype, name, cfg))
    result.sort(key=lambda p: (p["type"], p["name"]))
    return result


def parse_traffic_match_groups(qos_raw: dict) -> List[Dict[str, Any]]:
    tmg_raw = _as_dict(qos_raw.get("traffic-match-group"))
    result = []
    for name, cfg in tmg_raw.items():
        cfg = _as_dict(cfg)
        result.append(
            {
                "name": name,
                "description": cfg.get("description"),
                "match_groups": parse_multi_value(cfg.get("match-group")),
                "matches": parse_matches(cfg.get("match")),
            }
        )
    result.sort(key=lambda g: g["name"])
    return result


def _empty_qos() -> Dict[str, Any]:
    return {
        "interfaces": [],
        "policies": [],
        "traffic_match_groups": [],
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/qos/config payload."""
    qos_raw = full_config.get("qos", {})
    if not qos_raw or not isinstance(qos_raw, dict):
        return _empty_qos()
    return {
        "interfaces": parse_interfaces(qos_raw),
        "policies": parse_policies(qos_raw),
        "traffic_match_groups": parse_traffic_match_groups(qos_raw),
    }
