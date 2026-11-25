"""Read-model for firewall global-options config.

Mappers own VyOS tree shape. The router returns this dict unchanged. The
parse reads the shape the device returned, not the version string: the
1.5-only sections are simply absent on 1.4 and parse as unset.
"""

from typing import Any, Dict, List, Optional

# Returned instead of the stored MaxMind license key.
MASKED_SECRET = "***"

_TOGGLE_LEAVES = (
    "all-ping",
    "broadcast-ping",
    "directed-broadcast",
    "ip-src-route",
    "ipv6-src-route",
    "receive-redirects",
    "ipv6-receive-redirects",
    "send-redirects",
    "log-martians",
    "source-validation",
    "ipv6-source-validation",
    "syn-cookies",
    "twa-hazards-protection",
)

_STATES = ("established", "invalid", "related")

# Response key -> path under ``timeout``.
TIMEOUT_LEAVES: Dict[str, List[str]] = {
    "icmp": ["icmp"],
    "other": ["other"],
    "tcp_close": ["tcp", "close"],
    "tcp_close_wait": ["tcp", "close-wait"],
    "tcp_established": ["tcp", "established"],
    "tcp_fin_wait": ["tcp", "fin-wait"],
    "tcp_last_ack": ["tcp", "last-ack"],
    "tcp_syn_recv": ["tcp", "syn-recv"],
    "tcp_syn_sent": ["tcp", "syn-sent"],
    "tcp_time_wait": ["tcp", "time-wait"],
    "udp_other": ["udp", "other"],
    "udp_stream": ["udp", "stream"],
}

# Response key -> single-value leaf under ``geoip``.
GEOIP_VALUE_LEAVES: Dict[str, str] = {
    "provider": "provider",
    "maxmind_account_id": "maxmind-account-id",
    "maxmind_license_key": "maxmind-license-key",
    "source_address": "source-address",
    "vrf": "vrf",
}


def _dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _str(value: Any) -> Optional[str]:
    return value if isinstance(value, str) else None


def _int(value: Any) -> Optional[int]:
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return None


def _str_list(value: Any) -> List[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [item for item in value if isinstance(item, str)]
    return []


def _parse_state(raw: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "action": _str(raw.get("action")),
        "log": "log" in raw,
        "log_level": _str(raw.get("log-level")),
    }


def _parse_timeouts(raw: Dict[str, Any]) -> Dict[str, Optional[int]]:
    result: Dict[str, Optional[int]] = {}
    for key, leaf in TIMEOUT_LEAVES.items():
        node: Any = raw
        for part in leaf:
            node = _dict(node).get(part)
        result[key] = _int(node)
    return result


def _parse_geoip(raw: Dict[str, Any]) -> Dict[str, Any]:
    result: Dict[str, Any] = {key: _str(raw.get(leaf)) for key, leaf in GEOIP_VALUE_LEAVES.items()}
    if result["maxmind_license_key"]:
        result["maxmind_license_key"] = MASKED_SECRET
    result["maxmind_lite"] = "maxmind-lite" in raw
    return result


def parse_config(_mapper: Any, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Parse ``firewall global-options`` into the shape the client reads."""
    firewall = _dict(_dict(full_config).get("firewall"))
    raw = _dict(firewall.get("global-options"))

    result: Dict[str, Any] = {"configured": "global-options" in firewall}
    for leaf in _TOGGLE_LEAVES:
        result[leaf.replace("-", "_")] = _str(raw.get(leaf))

    result["resolver_cache"] = "resolver-cache" in raw
    result["resolver_interval"] = _int(raw.get("resolver-interval"))

    state_policy = _dict(raw.get("state-policy"))
    states: Dict[str, Any] = {state: _parse_state(_dict(state_policy.get(state))) for state in _STATES}
    states["offload_target"] = _str(_dict(state_policy.get("offload")).get("offload-target"))
    result["state_policy"] = states

    bridged = _dict(raw.get("apply-to-bridged-traffic"))
    result["bridged_traffic"] = {
        "ipv4": "ipv4" in bridged,
        "ipv6": "ipv6" in bridged,
        "accept_invalid_ethernet_types": _str_list(
            _dict(bridged.get("accept-invalid")).get("ethernet-type")
        ),
    }

    result["geoip"] = _parse_geoip(_dict(raw.get("geoip")))
    result["timeouts"] = _parse_timeouts(_dict(raw.get("timeout")))
    return result
