"""Read-model for policy prefix-list / prefix-list6 config.

Mappers own VyOS tree shape. The router returns this dict unchanged. Both
labs have the same leaves, so the parse reads the shape the device returned.
"""

from typing import Any, Dict, List, Optional

_FAMILIES = (("ipv4", "prefix-list"), ("ipv6", "prefix-list6"))


def _dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _str(value: Any) -> Optional[str]:
    if isinstance(value, (str, int)) and not isinstance(value, bool):
        return str(value)
    return None


def _int(value: Any) -> Optional[int]:
    text = _str(value)
    return int(text) if text is not None and text.isascii() and text.isdigit() else None


def _parse_rule(number: str, raw: Any) -> Dict[str, Any]:
    rule = _dict(raw)
    return {
        "rule_number": int(number),
        "action": _str(rule.get("action")),
        "description": _str(rule.get("description")),
        "prefix": _str(rule.get("prefix")),
        "ge": _int(rule.get("ge")),
        "le": _int(rule.get("le")),
    }


def _parse_list(list_type: str, name: str, raw: Any) -> Dict[str, Any]:
    prefix_list = _dict(raw)
    rules = [
        _parse_rule(number, rule)
        for number, rule in _dict(prefix_list.get("rule")).items()
        if str(number).isdigit()
    ]
    rules.sort(key=lambda item: item["rule_number"])
    return {
        "name": name,
        "list_type": list_type,
        "description": _str(prefix_list.get("description")),
        "rules": rules,
    }


def parse_config(_mapper: Any, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Parse ``policy prefix-list`` and ``policy prefix-list6`` into the shape the client reads."""
    policy = _dict(_dict(full_config).get("policy"))
    parsed: Dict[str, List[Dict[str, Any]]] = {}
    for list_type, node in _FAMILIES:
        lists = [_parse_list(list_type, name, raw) for name, raw in _dict(policy.get(node)).items()]
        lists.sort(key=lambda item: item["name"])
        parsed[list_type] = lists
    return {
        "ipv4_lists": parsed["ipv4"],
        "ipv6_lists": parsed["ipv6"],
        "total_ipv4": len(parsed["ipv4"]),
        "total_ipv6": len(parsed["ipv6"]),
    }


def rule_trees(full_config: Dict[str, Any], node: str, name: str) -> Optional[Dict[int, Any]]:
    """Raw rule subtrees of one list keyed by number, or None when the list is absent."""
    family = _dict(_dict(_dict(full_config).get("policy")).get(node))
    if name not in family:
        return None
    rules = _dict(_dict(family[name]).get("rule"))
    return {int(number): tree for number, tree in rules.items() if str(number).isdigit()}
