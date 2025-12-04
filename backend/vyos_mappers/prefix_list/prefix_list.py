"""
Prefix List Command Mapper

Handles command path generation for prefix-list configuration.
Version-specific logic is in version-specific files.
"""

from typing import List
from ..base import BaseFeatureMapper


class PrefixListMapper(BaseFeatureMapper):
    """Base mapper with common operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Core Prefix List Paths (IPv4)
    # ========================================================================

    def get_prefix_list_path(self, name: str) -> List[str]:
        """Get command path for prefix-list."""
        return ["policy", "prefix-list", name]

    def get_prefix_list_description(self, name: str, description: str) -> List[str]:
        """Get command path for prefix-list description."""
        return ["policy", "prefix-list", name, "description", description]

    # ========================================================================
    # Rule Paths (IPv4)
    # ========================================================================

    def get_rule_path(self, name: str, rule: str) -> List[str]:
        """Get command path for rule."""
        return ["policy", "prefix-list", name, "rule", rule]

    def get_rule_action(self, name: str, rule: str, action: str) -> List[str]:
        """Get command path for rule action (permit/deny)."""
        return ["policy", "prefix-list", name, "rule", rule, "action", action]

    def get_rule_description(self, name: str, rule: str, description: str) -> List[str]:
        """Get command path for rule description."""
        return ["policy", "prefix-list", name, "rule", rule, "description", description]

    def get_rule_prefix(self, name: str, rule: str, prefix: str) -> List[str]:
        """Get command path for rule prefix."""
        return ["policy", "prefix-list", name, "rule", rule, "prefix", prefix]

    def get_rule_ge(self, name: str, rule: str, ge: str) -> List[str]:
        """Get command path for rule ge (greater-than-or-equal)."""
        return ["policy", "prefix-list", name, "rule", rule, "ge", ge]

    def get_rule_le(self, name: str, rule: str, le: str) -> List[str]:
        """Get command path for rule le (less-than-or-equal)."""
        return ["policy", "prefix-list", name, "rule", rule, "le", le]

    # ========================================================================
    # Delete Paths (IPv4)
    # ========================================================================

    def get_rule_description_path(self, name: str, rule: str) -> List[str]:
        """Get command path for deleting rule description."""
        return ["policy", "prefix-list", name, "rule", rule, "description"]

    def get_rule_ge_path(self, name: str, rule: str) -> List[str]:
        """Get command path for deleting rule ge."""
        return ["policy", "prefix-list", name, "rule", rule, "ge"]

    def get_rule_le_path(self, name: str, rule: str) -> List[str]:
        """Get command path for deleting rule le."""
        return ["policy", "prefix-list", name, "rule", rule, "le"]

    # ========================================================================
    # Core Prefix List Paths (IPv6)
    # ========================================================================

    def get_prefix_list6_path(self, name: str) -> List[str]:
        """Get command path for prefix-list6."""
        return ["policy", "prefix-list6", name]

    def get_prefix_list6_description(self, name: str, description: str) -> List[str]:
        """Get command path for prefix-list6 description."""
        return ["policy", "prefix-list6", name, "description", description]

    # ========================================================================
    # Rule Paths (IPv6)
    # ========================================================================

    def get_rule6_path(self, name: str, rule: str) -> List[str]:
        """Get command path for IPv6 rule."""
        return ["policy", "prefix-list6", name, "rule", rule]

    def get_rule6_action(self, name: str, rule: str, action: str) -> List[str]:
        """Get command path for IPv6 rule action (permit/deny)."""
        return ["policy", "prefix-list6", name, "rule", rule, "action", action]

    def get_rule6_description(self, name: str, rule: str, description: str) -> List[str]:
        """Get command path for IPv6 rule description."""
        return ["policy", "prefix-list6", name, "rule", rule, "description", description]

    def get_rule6_prefix(self, name: str, rule: str, prefix: str) -> List[str]:
        """Get command path for IPv6 rule prefix."""
        return ["policy", "prefix-list6", name, "rule", rule, "prefix", prefix]

    def get_rule6_ge(self, name: str, rule: str, ge: str) -> List[str]:
        """Get command path for IPv6 rule ge (greater-than-or-equal)."""
        return ["policy", "prefix-list6", name, "rule", rule, "ge", ge]

    def get_rule6_le(self, name: str, rule: str, le: str) -> List[str]:
        """Get command path for IPv6 rule le (less-than-or-equal)."""
        return ["policy", "prefix-list6", name, "rule", rule, "le", le]

    # ========================================================================
    # Delete Paths (IPv6)
    # ========================================================================

    def get_rule6_description_path(self, name: str, rule: str) -> List[str]:
        """Get command path for deleting IPv6 rule description."""
        return ["policy", "prefix-list6", name, "rule", rule, "description"]

    def get_rule6_ge_path(self, name: str, rule: str) -> List[str]:
        """Get command path for deleting IPv6 rule ge."""
        return ["policy", "prefix-list6", name, "rule", rule, "ge"]

    def get_rule6_le_path(self, name: str, rule: str) -> List[str]:
        """Get command path for deleting IPv6 rule le."""
        return ["policy", "prefix-list6", name, "rule", rule, "le"]
