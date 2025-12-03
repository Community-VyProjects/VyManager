"""
Access List Command Mapper

Handles command path generation for access-list configuration.
Version-specific logic is in version-specific files.
"""

from typing import List
from ..base import BaseFeatureMapper


class AccessListMapper(BaseFeatureMapper):
    """Base mapper with common operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Core Access List Paths (IPv4)
    # ========================================================================

    def get_access_list_path(self, number: str) -> List[str]:
        """Get command path for access-list."""
        return ["policy", "access-list", number]

    def get_access_list_description(self, number: str, description: str) -> List[str]:
        """Get command path for access-list description."""
        return ["policy", "access-list", number, "description", description]

    # ========================================================================
    # Rule Paths (IPv4)
    # ========================================================================

    def get_rule_path(self, number: str, rule: str) -> List[str]:
        """Get command path for rule."""
        return ["policy", "access-list", number, "rule", rule]

    def get_rule_action(self, number: str, rule: str, action: str) -> List[str]:
        """Get command path for rule action (permit/deny)."""
        return ["policy", "access-list", number, "rule", rule, "action", action]

    def get_rule_description(self, number: str, rule: str, description: str) -> List[str]:
        """Get command path for rule description."""
        return ["policy", "access-list", number, "rule", rule, "description", description]

    def get_rule_source_any(self, number: str, rule: str) -> List[str]:
        """Get command path for rule source any."""
        return ["policy", "access-list", number, "rule", rule, "source", "any"]

    def get_rule_source_host(self, number: str, rule: str, host: str) -> List[str]:
        """Get command path for rule source host."""
        return ["policy", "access-list", number, "rule", rule, "source", "host", host]

    def get_rule_source_inverse_mask_network(self, number: str, rule: str, address: str) -> List[str]:
        """Get command path for rule source network address (used with inverse-mask)."""
        return ["policy", "access-list", number, "rule", rule, "source", "network", address]

    def get_rule_source_inverse_mask_mask(self, number: str, rule: str, mask: str) -> List[str]:
        """Get command path for rule source inverse-mask."""
        return ["policy", "access-list", number, "rule", rule, "source", "inverse-mask", mask]

    def get_rule_source_network(self, number: str, rule: str, address: str, mask: str) -> List[str]:
        """Get command path for rule source network."""
        return ["policy", "access-list", number, "rule", rule, "source", "network", address, mask]

    def get_rule_destination_any(self, number: str, rule: str) -> List[str]:
        """Get command path for rule destination any."""
        return ["policy", "access-list", number, "rule", rule, "destination", "any"]

    def get_rule_destination_host(self, number: str, rule: str, host: str) -> List[str]:
        """Get command path for rule destination host."""
        return ["policy", "access-list", number, "rule", rule, "destination", "host", host]

    def get_rule_destination_inverse_mask_network(self, number: str, rule: str, address: str) -> List[str]:
        """Get command path for rule destination network address (used with inverse-mask)."""
        return ["policy", "access-list", number, "rule", rule, "destination", "network", address]

    def get_rule_destination_inverse_mask_mask(self, number: str, rule: str, mask: str) -> List[str]:
        """Get command path for rule destination inverse-mask."""
        return ["policy", "access-list", number, "rule", rule, "destination", "inverse-mask", mask]

    def get_rule_destination_network(self, number: str, rule: str, address: str, mask: str) -> List[str]:
        """Get command path for rule destination network."""
        return ["policy", "access-list", number, "rule", rule, "destination", "network", address, mask]

    # ========================================================================
    # Delete Paths (IPv4)
    # ========================================================================

    def get_rule_source_path(self, number: str, rule: str) -> List[str]:
        """Get command path for deleting rule source."""
        return ["policy", "access-list", number, "rule", rule, "source"]

    def get_rule_destination_path(self, number: str, rule: str) -> List[str]:
        """Get command path for deleting rule destination."""
        return ["policy", "access-list", number, "rule", rule, "destination"]

    # ========================================================================
    # Core Access List Paths (IPv6)
    # ========================================================================

    def get_access_list6_path(self, name: str) -> List[str]:
        """Get command path for access-list6."""
        return ["policy", "access-list6", name]

    def get_access_list6_description(self, name: str, description: str) -> List[str]:
        """Get command path for access-list6 description."""
        return ["policy", "access-list6", name, "description", description]

    # ========================================================================
    # Rule Paths (IPv6)
    # ========================================================================

    def get_rule6_path(self, name: str, rule: str) -> List[str]:
        """Get command path for IPv6 rule."""
        return ["policy", "access-list6", name, "rule", rule]

    def get_rule6_action(self, name: str, rule: str, action: str) -> List[str]:
        """Get command path for IPv6 rule action (permit/deny)."""
        return ["policy", "access-list6", name, "rule", rule, "action", action]

    def get_rule6_description(self, name: str, rule: str, description: str) -> List[str]:
        """Get command path for IPv6 rule description."""
        return ["policy", "access-list6", name, "rule", rule, "description", description]

    def get_rule6_source_any(self, name: str, rule: str) -> List[str]:
        """Get command path for IPv6 rule source any."""
        return ["policy", "access-list6", name, "rule", rule, "source", "any"]

    def get_rule6_source_network(self, name: str, rule: str, network: str) -> List[str]:
        """Get command path for IPv6 rule source network."""
        return ["policy", "access-list6", name, "rule", rule, "source", "network", network]

    def get_rule6_destination_any(self, name: str, rule: str) -> List[str]:
        """Get command path for IPv6 rule destination any."""
        return ["policy", "access-list6", name, "rule", rule, "destination", "any"]

    def get_rule6_destination_network(self, name: str, rule: str, network: str) -> List[str]:
        """Get command path for IPv6 rule destination network."""
        return ["policy", "access-list6", name, "rule", rule, "destination", "network", network]

    # ========================================================================
    # Delete Paths (IPv6)
    # ========================================================================

    def get_rule6_source_path(self, name: str, rule: str) -> List[str]:
        """Get command path for deleting IPv6 rule source."""
        return ["policy", "access-list6", name, "rule", rule, "source"]

    def get_rule6_destination_path(self, name: str, rule: str) -> List[str]:
        """Get command path for deleting IPv6 rule destination."""
        return ["policy", "access-list6", name, "rule", rule, "destination"]
