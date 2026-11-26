"""Read-model for policy access-list / access-list6 config.

Mappers own VyOS tree shape. The router returns this dict unchanged. Both
labs have the same leaves, so the parse reads each leaf the device returned:
a flag by key membership, a value as its string.
"""

from typing import Any, Dict, List, Optional

from .access_list import FAMILIES


def _dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _str(value: Any) -> Optional[str]:
    if isinstance(value, (str, int)) and not isinstance(value, bool):
        return str(value)
    return None


def _endpoint(prefix: str, raw: Any) -> Dict[str, Any]:
    node = _dict(raw)
    return {
        f"{prefix}_any": "any" in node,
        f"{prefix}_host": _str(node.get("host")),
        f"{prefix}_network": _str(node.get("network")),
        f"{prefix}_inverse_mask": _str(node.get("inverse-mask")),
    }


def _parse_rule(number: str, raw: Any) -> Dict[str, Any]:
    rule = _dict(raw)
    source = _dict(rule.get("source"))
    return {
        "rule_number": int(number),
        "action": _str(rule.get("action")),
        "description": _str(rule.get("description")),
        **_endpoint("source", source),
        "source_exact_match": "exact-match" in source,
        **_endpoint("destination", rule.get("destination")),
    }


def _parse_list(list_type: str, number: str, raw: Any) -> Dict[str, Any]:
    access_list = _dict(raw)
    rules = [
        _parse_rule(rule, tree)
        for rule, tree in _dict(access_list.get("rule")).items()
        if str(rule).isdigit()
    ]
    rules.sort(key=lambda item: item["rule_number"])
    return {
        "number": number,
        "list_type": list_type,
        "description": _str(access_list.get("description")),
        "rules": rules,
    }


def _sort_key(item: Dict[str, Any]) -> Any:
    number = item["number"]
    return (0, int(number), number) if number.isascii() and number.isdigit() else (1, 0, number)


def parse_config(_mapper: Any, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Parse ``policy access-list`` and ``policy access-list6`` into the shape the client reads."""
    policy = _dict(_dict(full_config).get("policy"))
    parsed: Dict[str, List[Dict[str, Any]]] = {}
    for list_type, node in FAMILIES.items():
        lists = [_parse_list(list_type, str(number), raw) for number, raw in _dict(policy.get(node)).items()]
        lists.sort(key=_sort_key)
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
