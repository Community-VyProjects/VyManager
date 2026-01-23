"""
LargeCommunity List Batch Builder

Provides batch operations for large-community-list configuration.
Commands are identical between VyOS 1.4 and 1.5.
"""

from typing import List, Dict, Any
from vyos_mappers.large_community_list import LargeCommunityListMapper


class LargeCommunityListBatchBuilder:
    """Complete batch builder for large-community-list operations"""

    def __init__(self, version: str):
        """Initialize builder with VyOS version."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mapper = LargeCommunityListMapper(version)

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "LargeCommunityListBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "LargeCommunityListBatchBuilder":
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
    # LargeCommunity List Operations
    # ========================================================================

    def set_large_community_list(self, name: str) -> "LargeCommunityListBatchBuilder":
        """Create large community list."""
        path = self.mapper.get_large_community_list(name)
        return self.add_set(path)

    def delete_large_community_list(self, name: str) -> "LargeCommunityListBatchBuilder":
        """Delete large community list."""
        path = self.mapper.get_large_community_list_path(name)
        return self.add_delete(path)

    def set_large_community_list_description(
        self, name: str, description: str
    ) -> "LargeCommunityListBatchBuilder":
        """Set large community list description."""
        path = self.mapper.get_large_community_list_description(name, description)
        return self.add_set(path)

    def delete_large_community_list_description(
        self, name: str
    ) -> "LargeCommunityListBatchBuilder":
        """Delete large community list description."""
        path = self.mapper.get_large_community_list_description_path(name)
        return self.add_delete(path)

    # ========================================================================
    # Rule Operations
    # ========================================================================

    def set_rule(self, name: str, rule: str) -> "LargeCommunityListBatchBuilder":
        """Create rule."""
        path = self.mapper.get_rule(name, rule)
        return self.add_set(path)

    def delete_rule(self, name: str, rule: str) -> "LargeCommunityListBatchBuilder":
        """Delete rule."""
        path = self.mapper.get_rule_path(name, rule)
        return self.add_delete(path)

    def set_rule_action(
        self, name: str, rule: str, action: str
    ) -> "LargeCommunityListBatchBuilder":
        """Set rule action (permit|deny)."""
        path = self.mapper.get_rule_action(name, rule, action)
        return self.add_set(path)

    def set_rule_description(
        self, name: str, rule: str, description: str
    ) -> "LargeCommunityListBatchBuilder":
        """Set rule description."""
        path = self.mapper.get_rule_description(name, rule, description)
        return self.add_set(path)

    def delete_rule_description(
        self, name: str, rule: str
    ) -> "LargeCommunityListBatchBuilder":
        """Delete rule description."""
        path = self.mapper.get_rule_description_path(name, rule)
        return self.add_delete(path)

    def set_rule_regex(
        self, name: str, rule: str, regex: str
    ) -> "LargeCommunityListBatchBuilder":
        """Set rule regex pattern."""
        path = self.mapper.get_rule_regex(name, rule, regex)
        return self.add_set(path)

    def delete_rule_regex(
        self, name: str, rule: str
    ) -> "LargeCommunityListBatchBuilder":
        """Delete rule regex."""
        path = self.mapper.get_rule_regex_path(name, rule)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        return {
            "version": self.version,
            "features": {
                "basic": {
                    "supported": True,
                    "description": "Basic large-community-list configuration",
                },
                "rules": {
                    "supported": True,
                    "description": "Rule-based filtering with permit/deny actions",
                },
                "actions": {
                    "supported": True,
                    "description": "Permit and deny actions for rules",
                },
            },
            "version_notes": {
                "identical_versions": "Commands are identical between VyOS 1.4 and 1.5",
            },
        }
