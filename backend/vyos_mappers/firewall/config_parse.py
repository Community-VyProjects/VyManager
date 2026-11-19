"""Read-model for bridge firewall config.

Mappers own the VyOS tree. Routers call parse_config and do not walk it.
"""

from typing import Any, Dict, List, Optional


_INTERFACE_TYPES = (
    "bonding",
    "bridge",
    "dummy",
    "ethernet",
    "geneve",
    "input",
    "l2tpv3",
    "loopback",
    "macsec",
    "openvpn",
    "pppoe",
    "pseudo-ethernet",
    "sstpc",
    "tunnel",
    "virtual-ethernet",
    "vti",
    "vxlan",
    "wireguard",
    "wireless",
    "wwan",
)


def _dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def parse_rule(rule_number: int, rule_config: dict) -> Dict[str, Any]:
    """Parse one bridge rule into the router model's field names."""
    from vyos_mappers.firewall.bridge import TCP_FLAG_NAMES

    source = _dict(rule_config.get("source"))
    source_group = _dict(source.get("group"))
    destination = _dict(rule_config.get("destination"))
    dest_group = _dict(destination.get("group"))
    vlan = _dict(rule_config.get("vlan"))
    inbound = _dict(rule_config.get("inbound-interface"))
    outbound = _dict(rule_config.get("outbound-interface"))
    set_opts = _dict(rule_config.get("set"))
    time_opts = _dict(rule_config.get("time"))
    limit_opts = _dict(rule_config.get("limit"))
    icmp_opts = _dict(rule_config.get("icmp"))
    icmpv6_opts = _dict(rule_config.get("icmpv6"))
    tcp_opts = _dict(rule_config.get("tcp"))
    tcp_flags = _dict(tcp_opts.get("flags"))
    not_flags = _dict(tcp_flags.get("not"))
    fragment_opts = _dict(rule_config.get("fragment"))
    ipsec_opts = _dict(rule_config.get("ipsec"))
    ttl_opts = _dict(rule_config.get("ttl"))
    hop_limit_opts = _dict(rule_config.get("hop-limit"))
    log_opts = _dict(rule_config.get("log-options"))
    tcp_flag_list = ",".join(flag for flag in TCP_FLAG_NAMES if flag in tcp_flags) or None
    tcp_flag_not_list = ",".join(flag for flag in TCP_FLAG_NAMES if flag in not_flags) or None

    return {
        "rule_number": rule_number,
        "action": rule_config.get("action"),
        "description": rule_config.get("description"),
        "disabled": "disable" in rule_config,
        "log": "log" in rule_config,
        "source_mac": source.get("mac-address"),
        "source_address": source.get("address"),
        "source_port": source.get("port"),
        "source_group_address": source_group.get("address-group"),
        "source_group_network": source_group.get("network-group"),
        "source_group_port": source_group.get("port-group"),
        "source_group_mac": source_group.get("mac-group"),
        "destination_mac": destination.get("mac-address"),
        "destination_address": destination.get("address"),
        "destination_port": destination.get("port"),
        "destination_group_address": dest_group.get("address-group"),
        "destination_group_network": dest_group.get("network-group"),
        "destination_group_port": dest_group.get("port-group"),
        "destination_group_mac": dest_group.get("mac-group"),
        "vlan_id": vlan.get("id"),
        "vlan_priority": vlan.get("priority"),
        "vlan_ethernet_type": vlan.get("ethernet-type"),
        "inbound_interface": inbound.get("name"),
        "inbound_interface_group": inbound.get("group"),
        "outbound_interface": outbound.get("name"),
        "outbound_interface_group": outbound.get("group"),
        "protocol": rule_config.get("protocol"),
        "ethernet_type": rule_config.get("ethernet-type"),
        "icmp_type": icmp_opts.get("type"),
        "icmp_code": icmp_opts.get("code"),
        "icmp_type_name": icmp_opts.get("type-name"),
        "icmpv6_type": icmpv6_opts.get("type"),
        "icmpv6_code": icmpv6_opts.get("code"),
        "icmpv6_type_name": icmpv6_opts.get("type-name"),
        "tcp_flags": tcp_flag_list,
        "tcp_flags_not": tcp_flag_not_list,
        "tcp_mss": tcp_opts.get("mss"),
        "limit_rate": limit_opts.get("rate"),
        "limit_burst": limit_opts.get("burst"),
        "time_startdate": time_opts.get("startdate"),
        "time_stopdate": time_opts.get("stopdate"),
        "time_starttime": time_opts.get("starttime"),
        "time_stoptime": time_opts.get("stoptime"),
        "time_weekdays": time_opts.get("weekdays"),
        "mark": rule_config.get("mark"),
        "connection_mark": rule_config.get("connection-mark"),
        "dscp": rule_config.get("dscp"),
        "dscp_exclude": rule_config.get("dscp-exclude"),
        "ttl_eq": ttl_opts.get("eq"),
        "ttl_gt": ttl_opts.get("gt"),
        "ttl_lt": ttl_opts.get("lt"),
        "hop_limit_eq": hop_limit_opts.get("eq"),
        "hop_limit_gt": hop_limit_opts.get("gt"),
        "hop_limit_lt": hop_limit_opts.get("lt"),
        "packet_type": rule_config.get("packet-type"),
        "packet_length": rule_config.get("packet-length"),
        "fragment_match_frag": "match-frag" in fragment_opts,
        "fragment_match_non_frag": "match-non-frag" in fragment_opts,
        "ipsec_match_ipsec_in": "match-ipsec-in" in ipsec_opts,
        "ipsec_match_ipsec_out": "match-ipsec-out" in ipsec_opts,
        "ipsec_match_none_in": "match-none-in" in ipsec_opts,
        "ipsec_match_none_out": "match-none-out" in ipsec_opts,
        "log_options_level": log_opts.get("level"),
        "log_options_group": log_opts.get("group"),
        "log_options_queue_threshold": log_opts.get("queue-threshold"),
        "log_options_snapshot_length": log_opts.get("snapshot-length"),
        "jump_target": rule_config.get("jump-target"),
        "queue": rule_config.get("queue"),
        "set_dscp": set_opts.get("dscp"),
        "set_mark": set_opts.get("mark"),
        "set_connection_mark": set_opts.get("connection-mark"),
        "set_ttl": set_opts.get("ttl"),
        "set_hop_limit": set_opts.get("hop-limit"),
        "set_tcp_mss": set_opts.get("tcp-mss"),
    }


def parse_chain(chain_name: str, chain_data: dict) -> Dict[str, Any]:
    """Parse one chain, including its rules, into plain dicts."""
    rules = []
    for rule_num, rule_config in _dict(chain_data.get("rule")).items():
        if isinstance(rule_config, dict):
            rules.append(parse_rule(int(rule_num), rule_config))
    rules.sort(key=lambda row: row["rule_number"])
    return {
        "name": chain_name,
        "default_action": chain_data.get("default-action"),
        "description": chain_data.get("description"),
        "rules": rules,
        "rule_count": len(rules),
    }


def parse_config(mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Parse firewall bridge from a full device config."""
    bridge = _dict(_dict((full_config or {}).get("firewall")).get("bridge"))
    if not bridge:
        return {"chains": [], "custom_chains": [], "total_rules": 0}

    chains = []
    total_rules = 0
    for chain_name in mapper.get_supported_chains():
        raw = bridge.get(chain_name)
        if not isinstance(raw, dict):
            continue
        chain_data = raw["filter"] if isinstance(raw.get("filter"), dict) else raw
        chain = parse_chain(chain_name, chain_data)
        chains.append(chain)
        total_rules += chain["rule_count"]

    custom_chains = []
    for chain_name, chain_data in _dict(bridge.get("name")).items():
        if not isinstance(chain_data, dict):
            continue
        chain = parse_chain(str(chain_name), chain_data)
        custom_chains.append(chain)
        total_rules += chain["rule_count"]

    return {
        "chains": chains,
        "custom_chains": custom_chains,
        "total_rules": total_rules,
    }


def interface_options(full_config: Dict[str, Any]) -> List[Dict[str, Optional[str]]]:
    """Interface names a bridge rule can match, including VLAN subinterfaces."""
    interfaces_config = _dict((full_config or {}).get("interfaces"))
    interfaces: List[Dict[str, Optional[str]]] = []
    for iface_type in _INTERFACE_TYPES:
        type_config = interfaces_config.get(iface_type)
        if not isinstance(type_config, dict):
            continue
        for iface_name, iface_data in type_config.items():
            data = iface_data if isinstance(iface_data, dict) else {}
            interfaces.append({
                "name": str(iface_name),
                "type": iface_type,
                "description": data.get("description"),
            })
            vif = data.get("vif")
            if isinstance(vif, dict):
                for vlan_id, vlan_data in vif.items():
                    vlan_desc = vlan_data.get("description") if isinstance(vlan_data, dict) else None
                    interfaces.append({
                        "name": f"{iface_name}.{vlan_id}",
                        "type": iface_type,
                        "description": vlan_desc or f"VLAN {vlan_id}",
                    })
            vif_s = data.get("vif-s")
            if not isinstance(vif_s, dict):
                continue
            for s_vlan_id, s_vlan_data in vif_s.items():
                s_desc = s_vlan_data.get("description") if isinstance(s_vlan_data, dict) else None
                interfaces.append({
                    "name": f"{iface_name}.{s_vlan_id}",
                    "type": iface_type,
                    "description": s_desc or f"Service VLAN {s_vlan_id}",
                })
                vif_c = s_vlan_data.get("vif-c") if isinstance(s_vlan_data, dict) else None
                if not isinstance(vif_c, dict):
                    continue
                for c_vlan_id, c_vlan_data in vif_c.items():
                    c_desc = c_vlan_data.get("description") if isinstance(c_vlan_data, dict) else None
                    interfaces.append({
                        "name": f"{iface_name}.{s_vlan_id}.{c_vlan_id}",
                        "type": iface_type,
                        "description": c_desc or f"Customer VLAN {c_vlan_id}",
                    })
    interfaces.sort(key=lambda row: row["name"] or "")
    return interfaces
