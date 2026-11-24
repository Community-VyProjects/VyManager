"""Parse ``nat64 source rule`` entries from the VyOS config tree."""

from typing import TYPE_CHECKING, Any, Dict, List, Optional

if TYPE_CHECKING:
    from .nat64 import NAT64Mapper


def _parse_protocol(protocol_config: Any) -> Optional[Dict[str, bool]]:
    if not isinstance(protocol_config, dict) or not protocol_config:
        return None
    return {
        "tcp": "tcp" in protocol_config,
        "udp": "udp" in protocol_config,
        "icmp": "icmp" in protocol_config,
    }


def _parse_pools(pools_config: Any) -> List[Dict[str, Any]]:
    pools = []
    for pool_num_str, pool_data in (pools_config or {}).items():
        try:
            pool_number = int(pool_num_str)
        except (ValueError, TypeError):
            continue
        pool_data = pool_data or {}
        pools.append({
            "pool_number": pool_number,
            "address": pool_data.get("address"),
            "description": pool_data.get("description"),
            "disable": "disable" in pool_data,
            "port": pool_data.get("port"),
            "protocol": _parse_protocol(pool_data.get("protocol")),
        })
    pools.sort(key=lambda pool: pool["pool_number"])
    return pools


def parse_config(_mapper: "NAT64Mapper", full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Return ``{"source_rules": [...], "total": n}``, the shape the client type declares."""
    rules_config = (full_config.get("nat64") or {}).get("source", {}).get("rule", {})
    source_rules = []
    for rule_num_str, rule_data in (rules_config or {}).items():
        try:
            rule_number = int(rule_num_str)
        except (ValueError, TypeError):
            continue
        rule_data = rule_data or {}
        source_rules.append({
            "rule_number": rule_number,
            "description": rule_data.get("description"),
            "disable": "disable" in rule_data,
            "match_mark": rule_data.get("match", {}).get("mark"),
            "source_prefix": rule_data.get("source", {}).get("prefix"),
            "translation_pools": _parse_pools(rule_data.get("translation", {}).get("pool")),
        })

    source_rules.sort(key=lambda rule: rule["rule_number"])
    return {"source_rules": source_rules, "total": len(source_rules)}
