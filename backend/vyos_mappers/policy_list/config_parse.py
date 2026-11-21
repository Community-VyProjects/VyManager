"""Read-model for policy community-list families.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

from typing import Any, Dict

from .policy_list import KIND_SPEC, PolicyListMapper


def parse_config(mapper: PolicyListMapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Return ``{<lists_field>: [...], "total": n}`` for the mapper's kind."""
    lists_field = KIND_SPEC[mapper.kind]["lists_field"]
    raw = (full_config.get("policy") or {}).get(mapper.kind) or {}
    lists = []
    for name, list_data in raw.items():
        list_data = list_data or {}
        rules = []
        for rule_number, rule_data in (list_data.get("rule") or {}).items():
            rule_data = rule_data or {}
            rules.append(
                {
                    "rule_number": int(rule_number),
                    "description": rule_data.get("description"),
                    "action": rule_data.get("action", "permit"),
                    "regex": rule_data.get("regex"),
                }
            )
        lists.append(
            {
                "name": name,
                "description": list_data.get("description"),
                "rules": sorted(rules, key=lambda rule: rule["rule_number"]),
            }
        )
    return {lists_field: lists, "total": len(lists)}
