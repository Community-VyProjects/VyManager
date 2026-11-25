"""Read-model for policy route / route6 config.

Mappers own VyOS tree shape. The router returns this dict unchanged. The
parse reads the shape the device returned, not the version string: the
1.5-only leaves (geoip, tcp mss, set vrf, directional ipsec) are simply
absent on 1.4. A ``multi:`` leaf is a list whether the device returned one
value or several.
"""

from typing import Any, Dict, List, Optional

_GROUPS = {
    "address": "address-group",
    "domain": "domain-group",
    "mac": "mac-group",
    "network": "network-group",
    "port": "port-group",
}
_TIME = ("monthdays", "startdate", "starttime", "stopdate", "stoptime", "weekdays")
_COMPARE = ("eq", "gt", "lt")
_SET_VALUES = {
    "connection_mark": "connection-mark",
    "dscp": "dscp",
    "mark": "mark",
    "table": "table",
    "tcp_mss": "tcp-mss",
    "vrf": "vrf",
}


def _dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _str(value: Any) -> Optional[str]:
    if isinstance(value, (str, int)) and not isinstance(value, bool):
        return str(value)
    return None


def _list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(item) for item in value if isinstance(item, (str, int))]
    if isinstance(value, dict):
        return [str(key) for key in value]
    single = _str(value)
    return [single] if single is not None else []


def _side(rule: Dict[str, Any], side: str) -> Dict[str, Any]:
    raw = _dict(rule.get(side))
    group = _dict(raw.get("group"))
    geoip = _dict(raw.get("geoip"))
    result: Dict[str, Any] = {
        f"{side}_address": _str(raw.get("address")),
        f"{side}_port": _str(raw.get("port")),
        f"{side}_geoip": {
            "country_code": _list(geoip.get("country-code")),
            "asn": _list(geoip.get("asn")),
            "inverse_match": "inverse-match" in geoip,
        },
    }
    for key, leaf in _GROUPS.items():
        result[f"{side}_group_{key}"] = _str(group.get(leaf))
    return result


def _tcp_flags(tcp: Dict[str, Any]) -> List[str]:
    return [key for key in _dict(tcp.get("flags")) if key != "not"]


def _tcp_flags_not(tcp: Dict[str, Any]) -> List[str]:
    return list(_dict(_dict(tcp.get("flags")).get("not")))


def _compare(raw: Any, prefix: str) -> Dict[str, Optional[str]]:
    node = _dict(raw)
    return {f"{prefix}_{op}": _str(node.get(op)) for op in _COMPARE}


def _parse_rule(number: str, rule: Dict[str, Any]) -> Dict[str, Any]:
    tcp = _dict(rule.get("tcp"))
    icmp = _dict(rule.get("icmp"))
    icmpv6 = _dict(rule.get("icmpv6"))
    time = _dict(rule.get("time"))
    limit = _dict(rule.get("limit"))
    recent = _dict(rule.get("recent"))
    set_raw = _dict(rule.get("set"))

    match: Dict[str, Any] = {}
    match.update(_side(rule, "source"))
    match["source_mac_address"] = _str(_dict(rule.get("source")).get("mac-address"))
    match.update(_side(rule, "destination"))
    match.update(
        {
            "protocol": _str(rule.get("protocol")),
            "tcp_flags": _tcp_flags(tcp),
            "tcp_flags_not": _tcp_flags_not(tcp),
            "tcp_mss": _str(tcp.get("mss")),
            "icmp_code": _str(icmp.get("code")),
            "icmp_type": _str(icmp.get("type")),
            "icmp_type_name": _str(icmp.get("type-name")),
            "icmpv6_type": _str(icmpv6.get("type")),
            "fragment": _list(rule.get("fragment")),
            "packet_type": _str(rule.get("packet-type")),
            "packet_length": _list(rule.get("packet-length")),
            "packet_length_exclude": _list(rule.get("packet-length-exclude")),
            "dscp": _list(rule.get("dscp")),
            "dscp_exclude": _list(rule.get("dscp-exclude")),
            "state": _list(rule.get("state")),
            "ipsec": _list(rule.get("ipsec")),
            "mark": _str(rule.get("mark")),
            "connection_mark": _list(rule.get("connection-mark")),
            "time_utc": "utc" in time,
            "limit_burst": _str(limit.get("burst")),
            "limit_rate": _str(limit.get("rate")),
            "recent_count": _str(recent.get("count")),
            "recent_time": _str(recent.get("time")),
        }
    )
    match.update(_compare(rule.get("ttl"), "ttl"))
    match.update(_compare(rule.get("hop-limit"), "hop_limit"))
    for leaf in _TIME:
        match[f"time_{leaf}"] = _str(time.get(leaf))

    return {
        "rule_number": int(number),
        "description": _str(rule.get("description")),
        "disable": "disable" in rule,
        "log": "log" in rule,
        "action": _str(rule.get("action")),
        "match": match,
        "set": {key: _str(set_raw.get(leaf)) for key, leaf in _SET_VALUES.items()},
    }


def _parse_policy(policy_type: str, name: str, raw: Any) -> Dict[str, Any]:
    policy = _dict(raw)
    rules = [
        _parse_rule(number, _dict(rule))
        for number, rule in _dict(policy.get("rule")).items()
        if str(number).isdigit()
    ]
    rules.sort(key=lambda item: item["rule_number"])
    return {
        "name": name,
        "policy_type": policy_type,
        "description": _str(policy.get("description")),
        "default_log": "default-log" in policy,
        "interfaces": _list(policy.get("interface")),
        "rules": rules,
    }


def parse_config(_mapper: Any, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Parse ``policy route`` and ``policy route6`` into the shape the client reads."""
    policy = _dict(_dict(full_config).get("policy"))
    ipv4 = [_parse_policy("route", name, raw) for name, raw in _dict(policy.get("route")).items()]
    ipv6 = [_parse_policy("route6", name, raw) for name, raw in _dict(policy.get("route6")).items()]
    return {
        "ipv4_policies": ipv4,
        "ipv6_policies": ipv6,
        "total_ipv4": len(ipv4),
        "total_ipv6": len(ipv6),
    }


def rule_trees(full_config: Dict[str, Any], policy_type: str, name: str) -> Optional[Dict[int, Any]]:
    """Raw rule subtrees of one policy keyed by number, or None when the policy is absent."""
    family = _dict(_dict(_dict(full_config).get("policy")).get(policy_type))
    if name not in family:
        return None
    rules = _dict(_dict(family[name]).get("rule"))
    return {int(number): tree for number, tree in rules.items() if str(number).isdigit()}
