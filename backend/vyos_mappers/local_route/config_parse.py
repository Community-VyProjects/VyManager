"""Read-model for local-route config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

from typing import Any, Dict, List, Optional


def _parse_leaf(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list) and value:
        return _parse_leaf(value[0])
    if isinstance(value, dict) and value:
        return str(next(iter(value.keys())))
    return None


def _parse_container_leaf(container: Any, key: str) -> Optional[str]:
    if not isinstance(container, dict):
        return None
    return _parse_leaf(container.get(key))


def _parse_address(container: Any) -> Optional[str]:
    """``source``/``destination`` hold ``address`` and ``port``."""
    if isinstance(container, str):
        return container
    return _parse_container_leaf(container, "address")


def _parse_rule(rule_number: str, rule: Any) -> Dict[str, Any]:
    rule = rule if isinstance(rule, dict) else {}
    source = rule.get("source")
    destination = rule.get("destination")
    set_data = rule.get("set") if isinstance(rule.get("set"), dict) else {}
    return {
        "rule_number": int(rule_number),
        "source": _parse_address(source),
        "destination": _parse_address(destination),
        "inbound_interface": _parse_leaf(rule.get("inbound-interface")),
        "fwmark": _parse_leaf(rule.get("fwmark")),
        "protocol": _parse_leaf(rule.get("protocol")),
        "source_port": _parse_container_leaf(source, "port"),
        "destination_port": _parse_container_leaf(destination, "port"),
        "table": _parse_leaf(set_data.get("table")),
        "vrf": _parse_leaf(set_data.get("vrf")),
    }


def _parse_rules(family: Any) -> List[Dict[str, Any]]:
    rules = family.get("rule") if isinstance(family, dict) else None
    if not isinstance(rules, dict):
        return []
    parsed = [_parse_rule(number, rule) for number, rule in rules.items()]
    return sorted(parsed, key=lambda row: row["rule_number"])


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/local-route/config payload."""
    policy = full_config.get("policy") if isinstance(full_config, dict) else None
    policy = policy if isinstance(policy, dict) else {}
    ipv4_rules = _parse_rules(policy.get("local-route"))
    ipv6_rules = _parse_rules(policy.get("local-route6"))
    return {
        "ipv4_rules": ipv4_rules,
        "ipv6_rules": ipv6_rules,
        "total_ipv4": len(ipv4_rules),
        "total_ipv6": len(ipv6_rules),
    }
