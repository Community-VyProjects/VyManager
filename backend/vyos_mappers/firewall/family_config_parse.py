"""Parse ``firewall ipv4`` / ``firewall ipv6`` into the GET /config shape.

``parse_config`` returns plain dicts. The router builds its response model
from them, so the pydantic types stay in the router.
"""

from typing import TYPE_CHECKING, Any, Dict, List, Optional

if TYPE_CHECKING:
    from .family import FirewallFamilyMapper

_BASE_CHAINS = ("forward", "input", "output")


def _flag(data: Dict[str, Any], key: str) -> bool:
    """A valueless leaf: present as a key, or an empty string."""
    return key in data or data.get(key) == ""


def multi_text(raw: Any) -> Optional[List[str]]:
    """A multi: leaf. VyOS JSON is a dict of values, a list, or one string."""
    if raw is None or raw == "" or raw == {}:
        return None
    if isinstance(raw, dict):
        values = [str(key) for key in raw if key not in (None, "")]
    elif isinstance(raw, list):
        values = [str(item) for item in raw if item not in (None, "")]
    else:
        values = [str(raw)]
    return values or None


def _geoip(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    geoip = data.get("geoip", {})
    if not geoip:
        return None
    codes = geoip.get("country-code")
    if codes and not isinstance(codes, list):
        codes = [codes]
    return {"country_code": codes, "inverse_match": _flag(geoip, "inverse-match")}


def _interface_side(data: Any) -> tuple:
    if not isinstance(data, dict):
        return None, None
    name = data.get("name")
    if not name and "interface-name" in data:
        name = data.get("interface-name")
    return name, data.get("group")


def _state(data: Any) -> Optional[Dict[str, bool]]:
    if not data:
        return None
    names = ("established", "new", "related", "invalid")
    if isinstance(data, list):
        return {name: name in data for name in names}
    if isinstance(data, dict):
        return {name: _flag(data, name) for name in names}
    return None


def _tcp_flags(tcp: Dict[str, Any]) -> Optional[List[str]]:
    if not tcp or "flags" not in tcp:
        return None
    flags = tcp["flags"]
    found: List[str] = []
    if isinstance(flags, dict):
        for key, value in flags.items():
            if key == "not":
                # Inverted flags: {"not": {"fin": {}, "rst": {}}}
                if isinstance(value, dict):
                    found.extend(f"not {flag}" for flag in value)
            else:
                found.append(key)
    elif isinstance(flags, list):
        found = flags
    return found or None


def _gre(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not data:
        return None
    flags = data.get("flags", {})

    def flag(name: str, unset: bool) -> bool:
        return name in flags and (("unset" in flags.get(name, {})) is unset)

    return {
        "key": data.get("key"),
        "version": data.get("version"),
        "inner_proto": data.get("inner-proto"),
        "flags_checksum": flag("checksum", False),
        "flags_checksum_unset": flag("checksum", True),
        "flags_key": flag("key", False),
        "flags_key_unset": flag("key", True),
        "flags_sequence": flag("sequence", False),
        "flags_sequence_unset": flag("sequence", True),
    }


def _parse_rule(
    mapper: "FirewallFamilyMapper",
    rule_num: str,
    rule: Dict[str, Any],
    chain: str,
    is_custom: bool,
) -> Dict[str, Any]:
    source_data = rule.get("source", {})
    source = None
    if source_data:
        source = {
            "address": source_data.get("address"),
            "port": source_data.get("port"),
            "mac_address": source_data.get("mac-address"),
            "geoip": _geoip(source_data),
            "group": source_data.get("group"),
        }

    dest_data = rule.get("destination", {})
    destination = None
    if dest_data:
        destination = {
            "address": dest_data.get("address"),
            "port": dest_data.get("port"),
            "geoip": _geoip(dest_data),
            "group": dest_data.get("group"),
        }

    inbound, inbound_group = _interface_side(rule.get("inbound-interface"))
    outbound, outbound_group = _interface_side(rule.get("outbound-interface"))
    interface = None
    if inbound or inbound_group or outbound or outbound_group:
        interface = {
            "inbound": inbound,
            "inbound_group": inbound_group,
            "outbound": outbound,
            "outbound_group": outbound_group,
        }

    set_data = rule.get("set", {})
    packet_mods = None
    if set_data:
        packet_mods = {
            "dscp": set_data.get("dscp"),
            "mark": set_data.get("mark"),
            "ttl": set_data.get(mapper.hop_leaf),
        }

    icmp_type_name = icmp_code = icmp_type = None
    icmp = rule.get(mapper.icmp_leaf) or {}
    if isinstance(icmp, dict) and icmp:
        icmp_type_name = icmp.get("type-name") or None
        if icmp.get("code") not in (None, ""):
            icmp_code = str(icmp.get("code"))
        if icmp.get("type") not in (None, ""):
            icmp_type = str(icmp.get("type"))

    conn_status = rule.get("connection-status", {})
    fragment = rule.get("fragment", {})
    ipsec = rule.get("ipsec", {})
    limit = rule.get("limit", {})
    log_options = rule.get("log-options", {})
    recent = rule.get("recent", {})
    synproxy = rule.get("synproxy", {})
    tcp = rule.get("tcp", {})
    time = rule.get("time", {})
    hop = rule.get(mapper.hop_leaf, {})
    aatg = rule.get("add-address-to-group", {})

    add_address_to_group = None
    if aatg:
        src = aatg.get("source-address", {})
        dst = aatg.get("destination-address", {})
        add_address_to_group = {
            "source_address_group": src.get("address-group") if src else None,
            "source_timeout": src.get("timeout") if src else None,
            "destination_address_group": dst.get("address-group") if dst else None,
            "destination_timeout": dst.get("timeout") if dst else None,
        }

    synproxy_tcp = synproxy.get("tcp", {}) if synproxy else {}

    return {
        "rule_number": int(rule_num),
        "chain": chain,
        "is_custom_chain": is_custom,
        "description": rule.get("description"),
        "action": rule.get("action"),
        "protocol": rule.get("protocol"),
        "source": source,
        "destination": destination,
        "state": _state(rule.get("state")),
        "interface": interface,
        "packet_mods": packet_mods,
        "tcp_flags": _tcp_flags(tcp),
        "icmp_type_name": icmp_type_name,
        "icmp_code": icmp_code,
        "icmp_type": icmp_type,
        "jump_target": rule.get("jump-target"),
        "offload_target": rule.get("offload-target"),
        "connection_mark": multi_text(rule.get("connection-mark")),
        "connection_status": {"nat": conn_status.get("nat")} if conn_status else None,
        "conntrack_helper": multi_text(rule.get("conntrack-helper")),
        "dscp_match": multi_text(rule.get("dscp")),
        "dscp_exclude": multi_text(rule.get("dscp-exclude")),
        "fragment": {
            "match_frag": _flag(fragment, "match-frag"),
            "match_non_frag": _flag(fragment, "match-non-frag"),
        } if fragment else None,
        "gre": _gre(rule.get("gre", {})),
        "ipsec": {
            "match_ipsec": _flag(ipsec, "match-ipsec"),
            "match_none": _flag(ipsec, "match-none"),
            "match_ipsec_in": _flag(ipsec, "match-ipsec-in"),
            "match_ipsec_out": _flag(ipsec, "match-ipsec-out"),
            "match_none_in": _flag(ipsec, "match-none-in"),
            "match_none_out": _flag(ipsec, "match-none-out"),
        } if ipsec else None,
        "limit": {"rate": limit.get("rate"), "burst": limit.get("burst")} if limit else None,
        "log_options": {
            "group": log_options.get("group"),
            "level": log_options.get("level"),
            "queue_threshold": log_options.get("queue-threshold"),
            "snapshot_length": log_options.get("snapshot-length"),
        } if log_options else None,
        "mark_match": rule.get("mark"),
        "packet_length": multi_text(rule.get("packet-length")),
        "packet_length_exclude": multi_text(rule.get("packet-length-exclude")),
        "packet_type": rule.get("packet-type"),
        "queue_number": rule.get("queue"),
        "queue_options": multi_text(rule.get("queue-options")),
        "recent": {"count": recent.get("count"), "time": recent.get("time")} if recent else None,
        "synproxy_config": {
            "tcp_mss": synproxy_tcp.get("mss"),
            "tcp_window_scale": synproxy_tcp.get("window-scale"),
        } if synproxy else None,
        "tcp_mss": tcp.get("mss") if tcp else None,
        "time": {
            "startdate": time.get("startdate"),
            "starttime": time.get("starttime"),
            "stopdate": time.get("stopdate"),
            "stoptime": time.get("stoptime"),
            "weekdays": time.get("weekdays"),
        } if time else None,
        "ttl_match": {"eq": hop.get("eq"), "gt": hop.get("gt"), "lt": hop.get("lt")} if hop else None,
        "add_address_to_group": add_address_to_group,
        "source_fqdn": source_data.get("fqdn") if source_data else None,
        "source_address_mask": source_data.get("address-mask") if source_data else None,
        "destination_fqdn": dest_data.get("fqdn") if dest_data else None,
        "destination_address_mask": dest_data.get("address-mask") if dest_data else None,
        "destination_mac_address": dest_data.get("mac-address") if dest_data else None,
        "set_connection_mark": set_data.get("connection-mark") if set_data else None,
        "set_tcp_mss": set_data.get("tcp-mss") if set_data else None,
        "disable": _flag(rule, "disable"),
        "log": _flag(rule, "log"),
    }


def _rules(
    mapper: "FirewallFamilyMapper",
    rules: Any,
    chain: str,
    is_custom: bool,
) -> List[Dict[str, Any]]:
    if not isinstance(rules, dict):
        return []
    parsed = [_parse_rule(mapper, num, data, chain, is_custom) for num, data in rules.items()]
    return sorted(parsed, key=lambda rule: rule["rule_number"])


def parse_config(mapper: "FirewallFamilyMapper", full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Return the GET /config payload for ``mapper.family``."""
    family = (full_config or {}).get("firewall", {}).get(mapper.family, {})

    chains: Dict[str, Dict[str, Any]] = {}
    for chain in _BASE_CHAINS:
        filter_data = family.get(chain, {}).get("filter", {}) if chain in family else {}
        chains[chain] = {
            "default_action": filter_data.get("default-action"),
            "description": filter_data.get("description"),
            "default_log": True if _flag(filter_data, "default-log") else None,
            "rules": _rules(mapper, filter_data.get("rule", {}), chain, False),
        }

    custom_chains = []
    names = family.get("name", {})
    if isinstance(names, dict):
        for name, chain_config in names.items():
            custom_chains.append({
                "name": name,
                "description": chain_config.get("description"),
                "default_action": chain_config.get("default-action"),
                "default_log": True if _flag(chain_config, "default-log") else None,
                "default_jump_target": chain_config.get("default-jump-target"),
                "rules": _rules(mapper, chain_config.get("rule", {}), name, True),
            })
    custom_chains.sort(key=lambda chain: chain["name"])

    prerouting_raw = None
    prerouting = family.get("prerouting")
    raw = prerouting.get("raw", {}) if isinstance(prerouting, dict) else {}
    if raw:
        prerouting_raw = {
            "default_action": raw.get("default-action"),
            "description": raw.get("description"),
            "default_log": _flag(raw, "default-log") or None,
            "default_jump_target": raw.get("default-jump-target"),
            "rules": _rules(mapper, raw.get("rule", {}), "prerouting_raw", False),
        }

    total = sum(len(chains[chain]["rules"]) for chain in _BASE_CHAINS)
    total += sum(len(chain["rules"]) for chain in custom_chains)
    if prerouting_raw:
        total += len(prerouting_raw["rules"])

    return {
        "forward": chains["forward"],
        "input": chains["input"],
        "output": chains["output"],
        "forward_rules": chains["forward"]["rules"],
        "input_rules": chains["input"]["rules"],
        "output_rules": chains["output"]["rules"],
        "custom_chains": custom_chains,
        "prerouting_raw": prerouting_raw,
        "total_rules": total,
    }
