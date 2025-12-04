"""
Prefix List Batch Builder

Provides all batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class PrefixListBatchBuilder:
    """Complete batch builder for prefix-list operations"""

    def __init__(self, version: str):
        """Initialize builder with VyOS version."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "prefix_list"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "PrefixListBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "PrefixListBatchBuilder":
        """Add a 'delete' operation to the batch."""
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        """Get the list of operations."""
        return self._operations.copy()

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

    def is_empty(self) -> bool:
        """Check if the batch is empty."""
        return len(self._operations) == 0

    # ========================================================================
    # IPv4 Prefix List Operations
    # ========================================================================

    def set_prefix_list(self, name: str) -> "PrefixListBatchBuilder":
        """Create prefix-list."""
        path = self.mappers[self.mapper_key].get_prefix_list_path(name)
        return self.add_set(path)

    def delete_prefix_list(self, name: str) -> "PrefixListBatchBuilder":
        """Delete prefix-list."""
        path = self.mappers[self.mapper_key].get_prefix_list_path(name)
        return self.add_delete(path)

    def set_prefix_list_description(
        self, name: str, description: str
    ) -> "PrefixListBatchBuilder":
        """Set prefix-list description."""
        path = self.mappers[self.mapper_key].get_prefix_list_description(
            name, description
        )
        return self.add_set(path)

    def delete_prefix_list_description(self, name: str) -> "PrefixListBatchBuilder":
        """Delete prefix-list description."""
        path = self.mappers[self.mapper_key].get_prefix_list_description(name, "")
        # For description deletion, we need just the path without value
        path = path[:-1]  # Remove the empty description value
        return self.add_delete(path)

    # ========================================================================
    # IPv4 Rule Operations
    # ========================================================================

    def set_rule(self, name: str, rule: str) -> "PrefixListBatchBuilder":
        """Create rule."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule)
        return self.add_set(path)

    def delete_rule(self, name: str, rule: str) -> "PrefixListBatchBuilder":
        """Delete rule."""
        path = self.mappers[self.mapper_key].get_rule_path(name, rule)
        return self.add_delete(path)

    def set_rule_action(
        self, name: str, rule: str, action: str
    ) -> "PrefixListBatchBuilder":
        """Set rule action (permit/deny)."""
        path = self.mappers[self.mapper_key].get_rule_action(name, rule, action)
        return self.add_set(path)

    def set_rule_description(
        self, name: str, rule: str, description: str
    ) -> "PrefixListBatchBuilder":
        """Set rule description."""
        path = self.mappers[self.mapper_key].get_rule_description(
            name, rule, description
        )
        return self.add_set(path)

    def delete_rule_description(
        self, name: str, rule: str
    ) -> "PrefixListBatchBuilder":
        """Delete rule description."""
        path = self.mappers[self.mapper_key].get_rule_description_path(name, rule)
        return self.add_delete(path)

    def set_rule_prefix(
        self, name: str, rule: str, prefix: str
    ) -> "PrefixListBatchBuilder":
        """Set rule prefix."""
        path = self.mappers[self.mapper_key].get_rule_prefix(name, rule, prefix)
        return self.add_set(path)

    def set_rule_ge(
        self, name: str, rule: str, ge: str
    ) -> "PrefixListBatchBuilder":
        """Set rule ge (greater-than-or-equal)."""
        path = self.mappers[self.mapper_key].get_rule_ge(name, rule, ge)
        return self.add_set(path)

    def delete_rule_ge(self, name: str, rule: str) -> "PrefixListBatchBuilder":
        """Delete rule ge."""
        path = self.mappers[self.mapper_key].get_rule_ge_path(name, rule)
        return self.add_delete(path)

    def set_rule_le(
        self, name: str, rule: str, le: str
    ) -> "PrefixListBatchBuilder":
        """Set rule le (less-than-or-equal)."""
        path = self.mappers[self.mapper_key].get_rule_le(name, rule, le)
        return self.add_set(path)

    def delete_rule_le(self, name: str, rule: str) -> "PrefixListBatchBuilder":
        """Delete rule le."""
        path = self.mappers[self.mapper_key].get_rule_le_path(name, rule)
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Prefix List Operations
    # ========================================================================

    def set_prefix_list6(self, name: str) -> "PrefixListBatchBuilder":
        """Create prefix-list6."""
        path = self.mappers[self.mapper_key].get_prefix_list6_path(name)
        return self.add_set(path)

    def delete_prefix_list6(self, name: str) -> "PrefixListBatchBuilder":
        """Delete prefix-list6."""
        path = self.mappers[self.mapper_key].get_prefix_list6_path(name)
        return self.add_delete(path)

    def set_prefix_list6_description(
        self, name: str, description: str
    ) -> "PrefixListBatchBuilder":
        """Set prefix-list6 description."""
        path = self.mappers[self.mapper_key].get_prefix_list6_description(
            name, description
        )
        return self.add_set(path)

    def delete_prefix_list6_description(self, name: str) -> "PrefixListBatchBuilder":
        """Delete prefix-list6 description."""
        path = self.mappers[self.mapper_key].get_prefix_list6_description(name, "")
        # For description deletion, we need just the path without value
        path = path[:-1]  # Remove the empty description value
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Rule Operations
    # ========================================================================

    def set_rule6(self, name: str, rule: str) -> "PrefixListBatchBuilder":
        """Create IPv6 rule."""
        path = self.mappers[self.mapper_key].get_rule6_path(name, rule)
        return self.add_set(path)

    def delete_rule6(self, name: str, rule: str) -> "PrefixListBatchBuilder":
        """Delete IPv6 rule."""
        path = self.mappers[self.mapper_key].get_rule6_path(name, rule)
        return self.add_delete(path)

    def set_rule6_action(
        self, name: str, rule: str, action: str
    ) -> "PrefixListBatchBuilder":
        """Set IPv6 rule action (permit/deny)."""
        path = self.mappers[self.mapper_key].get_rule6_action(name, rule, action)
        return self.add_set(path)

    def set_rule6_description(
        self, name: str, rule: str, description: str
    ) -> "PrefixListBatchBuilder":
        """Set IPv6 rule description."""
        path = self.mappers[self.mapper_key].get_rule6_description(
            name, rule, description
        )
        return self.add_set(path)

    def delete_rule6_description(
        self, name: str, rule: str
    ) -> "PrefixListBatchBuilder":
        """Delete IPv6 rule description."""
        path = self.mappers[self.mapper_key].get_rule6_description_path(name, rule)
        return self.add_delete(path)

    def set_rule6_prefix(
        self, name: str, rule: str, prefix: str
    ) -> "PrefixListBatchBuilder":
        """Set IPv6 rule prefix."""
        path = self.mappers[self.mapper_key].get_rule6_prefix(name, rule, prefix)
        return self.add_set(path)

    def set_rule6_ge(
        self, name: str, rule: str, ge: str
    ) -> "PrefixListBatchBuilder":
        """Set IPv6 rule ge (greater-than-or-equal)."""
        path = self.mappers[self.mapper_key].get_rule6_ge(name, rule, ge)
        return self.add_set(path)

    def delete_rule6_ge(self, name: str, rule: str) -> "PrefixListBatchBuilder":
        """Delete IPv6 rule ge."""
        path = self.mappers[self.mapper_key].get_rule6_ge_path(name, rule)
        return self.add_delete(path)

    def set_rule6_le(
        self, name: str, rule: str, le: str
    ) -> "PrefixListBatchBuilder":
        """Set IPv6 rule le (less-than-or-equal)."""
        path = self.mappers[self.mapper_key].get_rule6_le(name, rule, le)
        return self.add_set(path)

    def delete_rule6_le(self, name: str, rule: str) -> "PrefixListBatchBuilder":
        """Delete IPv6 rule le."""
        path = self.mappers[self.mapper_key].get_rule6_le_path(name, rule)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        # Prefix lists have same features in 1.4 and 1.5
        return {
            "version": self.version,
            "features": {
                "ipv4_prefix_lists": {
                    "supported": True,
                    "description": "IPv4 prefix lists with permit/deny rules",
                },
                "ipv6_prefix_lists": {
                    "supported": True,
                    "description": "IPv6 prefix lists with permit/deny rules",
                },
                "ge_le_operators": {
                    "supported": True,
                    "description": "Greater-than-or-equal (ge) and less-than-or-equal (le) prefix length operators",
                },
                "rule_descriptions": {
                    "supported": True,
                    "description": "Rule-level descriptions",
                },
            },
        }
