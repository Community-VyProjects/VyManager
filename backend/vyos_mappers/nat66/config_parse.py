"""Parse ``nat66`` source and destination rules from the VyOS config tree."""

from typing import TYPE_CHECKING, Any, Dict, List, Optional

if TYPE_CHECKING:
    from .nat66 import NAT66Mapper

# parse key -> CLI child under ``<side> group``
_GROUP_KEYS = {
    "address_group": "address-group",
    "domain_group": "domain-group",
    "mac_group": "mac-group",
    "network_group": "network-group",
    "port_group": "port-group",
}


def _parse_group(group_config: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(group_config, dict):
        return None
    group = {key: group_config.get(leaf) for key, leaf in _GROUP_KEYS.items()}
    return group if any(group.values()) else None


def _parse_side(side_config: Any, match_key: str) -> Optional[Dict[str, Any]]:
    if not isinstance(side_config, dict) or not side_config:
        return None
    return {
        match_key: side_config.get(match_key),
        "port": side_config.get("port"),
        "group": _parse_group(side_config.get("group")),
    }


def _parse_rules(rules_config: Any, match_key: str, direction: str) -> List[Dict[str, Any]]:
    """Source rules match on prefix and an outbound interface; destination rules on address and an inbound interface."""
    if not isinstance(rules_config, dict):
        return []
    rules = []
    for rule_num_str, rule_data in rules_config.items():
        try:
            rule_number = int(rule_num_str)
        except (ValueError, TypeError):
            continue
        if not isinstance(rule_data, dict):
            rule_data = {}

        translation_config = rule_data.get("translation", {})
        interface = rule_data.get(f"{direction}-interface", {})

        rules.append({
            "rule_number": rule_number,
            "description": rule_data.get("description"),
            "disable": "disable" in rule_data,
            "exclude": "exclude" in rule_data,
            "log": "log" in rule_data,
            "protocol": rule_data.get("protocol"),
            f"{direction}_interface": interface.get("name") if isinstance(interface, dict) else None,
            "source": _parse_side(rule_data.get("source"), match_key),
            "destination": _parse_side(rule_data.get("destination"), match_key),
            "translation": {
                "address": translation_config.get("address"),
                "port": translation_config.get("port"),
            } if isinstance(translation_config, dict) and translation_config else None,
        })

    rules.sort(key=lambda rule: rule["rule_number"])
    return rules


def parse_config(_mapper: "NAT66Mapper", full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Return the GET /config shape: source and destination rules plus their total."""
    nat66_config = full_config.get("nat66") or {}
    source_rules = _parse_rules((nat66_config.get("source") or {}).get("rule"), "prefix", "outbound")
    destination_rules = _parse_rules((nat66_config.get("destination") or {}).get("rule"), "address", "inbound")
    return {
        "source_rules": source_rules,
        "destination_rules": destination_rules,
        "total": len(source_rules) + len(destination_rules),
    }
