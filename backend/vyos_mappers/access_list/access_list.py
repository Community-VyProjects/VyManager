"""Access-list command mapper.

One class holds the ``policy access-list`` / ``policy access-list6``
commands; the templates are the same on VyOS 1.4 and 1.5, so the registry
returns this class for both.

Config tree (``access-list`` for ipv4, ``access-list6`` for ipv6):
  policy access-list <number>/            (u32 tag; the verify calls int() on it)
    description            (0-255 characters)
    rule <1-65535>/
      action               (permit | deny)
      description          (0-255 characters)
      source/ destination/ (destination: ipv4 only)
        any                (flag)
        host               (ipv4-address)
        network            (ipv4-address, with inverse-mask)
        inverse-mask       (ipv4-address)
  policy access-list6 <name>/
    description
    rule <1-65535>/
      action, description
      source/
        any                (flag)
        exact-match        (flag, with network)
        network            (ipv6-prefix)
"""

from typing import Any, Dict, FrozenSet, List, Optional, Tuple

from ..base import BaseFeatureMapper

# Request list type -> CLI node.
FAMILIES: Dict[str, str] = {"ipv4": "access-list", "ipv6": "access-list6"}
# Lab `allowed:` of rule action, the same on 1.4 and 1.5.
RULE_ACTIONS: Tuple[str, ...] = ("permit", "deny")
# Rule endpoint nodes and their leaves per list type.
ENDPOINT_LEAVES: Dict[str, Dict[str, FrozenSet[str]]] = {
    "ipv4": {
        "source": frozenset({"any", "host", "network", "inverse-mask"}),
        "destination": frozenset({"any", "host", "network", "inverse-mask"}),
    },
    "ipv6": {
        "source": frozenset({"any", "exact-match", "network"}),
    },
}
# Lab val_help of an extended IPv4 list number; the verify requires a rule
# destination on these lists, and FRR renders the destination only for them.
EXTENDED_RANGES: Tuple[Tuple[int, int], ...] = ((100, 199), (2000, 2699))


class AccessListMapper(BaseFeatureMapper):
    """Access-list paths shared by VyOS 1.4 and 1.5."""

    def rule_action_values(self) -> Tuple[str, ...]:
        return RULE_ACTIONS

    def extended_ranges(self) -> Tuple[Tuple[int, int], ...]:
        return EXTENDED_RANGES

    # ========================================================================
    # Config read
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_access_list_config

        return parse_access_list_config(self, full_config)

    def rule_trees(self, full_config: Dict[str, Any], list_type: str, name: str) -> Optional[Dict[int, Any]]:
        """Raw rule subtrees of one list (reorder), or None when the list is absent."""
        from .config_parse import rule_trees

        return rule_trees(full_config, self.get_access_list_path(list_type, name)[1], name)

    def rule_tree_paths(self, list_type: str, name: str, rule: str, tree: Any) -> List[List[str]]:
        """Set paths that recreate a rule from its config subtree (reorder).

        A value leaf is one path with its value; a flag (``{}``) or a plain
        node is the path itself, so every leaf the device holds is kept.
        """
        base = self.get_rule_path(list_type, name, rule)
        paths = [base]

        def walk(prefix: List[str], node: Any) -> None:
            for key, value in node.items():
                path = prefix + [str(key)]
                if isinstance(value, dict):
                    if value:
                        walk(path, value)
                    else:
                        paths.append(path)
                elif isinstance(value, (str, int)) and not isinstance(value, bool):
                    paths.append(path + [str(value)])

        walk(base, tree if isinstance(tree, dict) else {})
        return paths

    # ========================================================================
    # List
    # ========================================================================

    def get_access_list_path(self, list_type: str, name: str) -> List[str]:
        node = FAMILIES.get(list_type)
        if node is None:
            raise ValueError(f"{list_type} is not an access-list type")
        return ["policy", node, name]

    def get_access_list_description_path(self, list_type: str, name: str) -> List[str]:
        return self.get_access_list_path(list_type, name) + ["description"]

    def get_access_list_description(self, list_type: str, name: str, value: str) -> List[str]:
        return self.get_access_list_description_path(list_type, name) + [value]

    # ========================================================================
    # Rule
    # ========================================================================

    def get_rule_path(self, list_type: str, name: str, rule: str) -> List[str]:
        return self.get_access_list_path(list_type, name) + ["rule", rule]

    def get_rule_action_path(self, list_type: str, name: str, rule: str) -> List[str]:
        return self.get_rule_path(list_type, name, rule) + ["action"]

    def get_rule_action(self, list_type: str, name: str, rule: str, value: str) -> List[str]:
        return self.get_rule_action_path(list_type, name, rule) + [value]

    def get_rule_description_path(self, list_type: str, name: str, rule: str) -> List[str]:
        return self.get_rule_path(list_type, name, rule) + ["description"]

    def get_rule_description(self, list_type: str, name: str, rule: str, value: str) -> List[str]:
        return self.get_rule_description_path(list_type, name, rule) + [value]

    # ========================================================================
    # Rule source / destination
    # ========================================================================

    def get_rule_endpoint_path(self, list_type: str, name: str, rule: str, endpoint: str) -> List[str]:
        """``source`` or ``destination`` of a rule; access-list6 has no destination."""
        path = self.get_rule_path(list_type, name, rule)
        if endpoint not in ENDPOINT_LEAVES[list_type]:
            raise ValueError(f"{FAMILIES[list_type]} rules have no {endpoint}")
        return path + [endpoint]

    def get_rule_endpoint_leaf_path(
        self, list_type: str, name: str, rule: str, endpoint: str, leaf: str
    ) -> List[str]:
        path = self.get_rule_endpoint_path(list_type, name, rule, endpoint)
        if leaf not in ENDPOINT_LEAVES[list_type][endpoint]:
            raise ValueError(f"{FAMILIES[list_type]} rule {endpoint} has no {leaf}")
        return path + [leaf]

    def get_rule_endpoint_leaf(
        self, list_type: str, name: str, rule: str, endpoint: str, leaf: str, value: str
    ) -> List[str]:
        return self.get_rule_endpoint_leaf_path(list_type, name, rule, endpoint, leaf) + [value]
