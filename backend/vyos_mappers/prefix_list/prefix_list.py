"""Prefix-list command mapper.

One class holds the ``policy prefix-list`` / ``policy prefix-list6``
commands; the templates are the same on VyOS 1.4 and 1.5, so the registry
returns this class for both.

Config tree (``prefix-list`` for ipv4, ``prefix-list6`` for ipv6):
  policy prefix-list <NAME [-_a-zA-Z0-9]+>/
    description          (0-255 characters)
    rule <1-65535>/
      action             (permit | deny)
      description        (0-255 characters)
      prefix             (ipv4-prefix | ipv6-prefix)
      ge                 (0-32 | 0-128)
      le                 (0-32 | 0-128)
"""

from typing import Any, Dict, List, Optional, Tuple

from ..base import BaseFeatureMapper

# Request list type -> CLI node.
FAMILIES: Dict[str, str] = {"ipv4": "prefix-list", "ipv6": "prefix-list6"}
# Lab `allowed:` of rule action, the same on 1.4 and 1.5.
RULE_ACTIONS: Tuple[str, ...] = ("permit", "deny")


class PrefixListMapper(BaseFeatureMapper):
    """Prefix-list paths shared by VyOS 1.4 and 1.5."""

    def rule_action_values(self) -> Tuple[str, ...]:
        return RULE_ACTIONS

    # ========================================================================
    # Config read
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_prefix_list_config

        return parse_prefix_list_config(self, full_config)

    def rule_trees(self, full_config: Dict[str, Any], list_type: str, name: str) -> Optional[Dict[int, Any]]:
        """Raw rule subtrees of one list (reorder), or None when the list is absent."""
        from .config_parse import rule_trees

        return rule_trees(full_config, self.get_prefix_list_path(list_type, name)[1], name)

    def rule_tree_paths(self, list_type: str, name: str, rule: str, tree: Any) -> List[List[str]]:
        """Set paths that recreate a rule from its config subtree (reorder).

        Every rule leaf is a single value, so one path per leaf.
        """
        base = self.get_rule_path(list_type, name, rule)
        node = tree if isinstance(tree, dict) else {}
        paths = [base]
        for leaf, value in node.items():
            if isinstance(value, (str, int)) and not isinstance(value, bool):
                paths.append(base + [str(leaf), str(value)])
        return paths

    # ========================================================================
    # List
    # ========================================================================

    def get_prefix_list_path(self, list_type: str, name: str) -> List[str]:
        node = FAMILIES.get(list_type)
        if node is None:
            raise ValueError(f"{list_type} is not a prefix-list type")
        return ["policy", node, name]

    def get_prefix_list_description_path(self, list_type: str, name: str) -> List[str]:
        return self.get_prefix_list_path(list_type, name) + ["description"]

    def get_prefix_list_description(self, list_type: str, name: str, value: str) -> List[str]:
        return self.get_prefix_list_description_path(list_type, name) + [value]

    # ========================================================================
    # Rule
    # ========================================================================

    def get_rule_path(self, list_type: str, name: str, rule: str) -> List[str]:
        return self.get_prefix_list_path(list_type, name) + ["rule", rule]

    def get_rule_action_path(self, list_type: str, name: str, rule: str) -> List[str]:
        return self.get_rule_path(list_type, name, rule) + ["action"]

    def get_rule_action(self, list_type: str, name: str, rule: str, value: str) -> List[str]:
        return self.get_rule_action_path(list_type, name, rule) + [value]

    def get_rule_description_path(self, list_type: str, name: str, rule: str) -> List[str]:
        return self.get_rule_path(list_type, name, rule) + ["description"]

    def get_rule_description(self, list_type: str, name: str, rule: str, value: str) -> List[str]:
        return self.get_rule_description_path(list_type, name, rule) + [value]

    def get_rule_prefix_path(self, list_type: str, name: str, rule: str) -> List[str]:
        return self.get_rule_path(list_type, name, rule) + ["prefix"]

    def get_rule_prefix(self, list_type: str, name: str, rule: str, value: str) -> List[str]:
        return self.get_rule_prefix_path(list_type, name, rule) + [value]

    def get_rule_ge_path(self, list_type: str, name: str, rule: str) -> List[str]:
        return self.get_rule_path(list_type, name, rule) + ["ge"]

    def get_rule_ge(self, list_type: str, name: str, rule: str, value: str) -> List[str]:
        return self.get_rule_ge_path(list_type, name, rule) + [value]

    def get_rule_le_path(self, list_type: str, name: str, rule: str) -> List[str]:
        return self.get_rule_path(list_type, name, rule) + ["le"]

    def get_rule_le(self, list_type: str, name: str, rule: str, value: str) -> List[str]:
        return self.get_rule_le_path(list_type, name, rule) + [value]
