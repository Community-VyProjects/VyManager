"""
ExtCommunity List Batch Builder

Provides batch operations for extcommunity-list configuration.
Commands are identical between VyOS 1.4 and 1.5.
"""

from typing import List, Dict, Any
from vyos_mappers.extcommunity_list import ExtCommunityListMapper


class ExtCommunityListBatchBuilder:
    """Complete batch builder for extcommunity-list operations"""

    def __init__(self, version: str):
        """Initialize builder with VyOS version."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mapper = ExtCommunityListMapper(version)

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "ExtCommunityListBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "ExtCommunityListBatchBuilder":
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
    # ExtCommunity List Operations
    # ========================================================================

    def set_extcommunity_list(self, name: str) -> "ExtCommunityListBatchBuilder":
        """Create community list."""
        path = self.mapper.get_extcommunity_list(name)
        return self.add_set(path)

    def delete_extcommunity_list(self, name: str) -> "ExtCommunityListBatchBuilder":
        """Delete community list."""
        path = self.mapper.get_extcommunity_list_path(name)
        return self.add_delete(path)

    def set_extcommunity_list_description(
        self, name: str, description: str
    ) -> "ExtCommunityListBatchBuilder":
        """Set community list description."""
        path = self.mapper.get_extcommunity_list_description(name, description)
        return self.add_set(path)

    def delete_extcommunity_list_description(
        self, name: str
    ) -> "ExtCommunityListBatchBuilder":
        """Delete community list description."""
        path = self.mapper.get_extcommunity_list_description_path(name)
        return self.add_delete(path)

    # ========================================================================
    # Rule Operations
    # ========================================================================

    def set_rule(self, name: str, rule: str) -> "ExtCommunityListBatchBuilder":
        """Create rule."""
        path = self.mapper.get_rule(name, rule)
        return self.add_set(path)

    def delete_rule(self, name: str, rule: str) -> "ExtCommunityListBatchBuilder":
        """Delete rule."""
        path = self.mapper.get_rule_path(name, rule)
        return self.add_delete(path)

    def set_rule_action(
        self, name: str, rule: str, action: str
    ) -> "ExtCommunityListBatchBuilder":
        """Set rule action (permit|deny)."""
        path = self.mapper.get_rule_action(name, rule, action)
        return self.add_set(path)

    def set_rule_description(
        self, name: str, rule: str, description: str
    ) -> "ExtCommunityListBatchBuilder":
        """Set rule description."""
        path = self.mapper.get_rule_description(name, rule, description)
        return self.add_set(path)

    def delete_rule_description(
        self, name: str, rule: str
    ) -> "ExtCommunityListBatchBuilder":
        """Delete rule description."""
        path = self.mapper.get_rule_description_path(name, rule)
        return self.add_delete(path)

    def set_rule_regex(
        self, name: str, rule: str, regex: str
    ) -> "ExtCommunityListBatchBuilder":
        """Set rule regex pattern."""
        path = self.mapper.get_rule_regex(name, rule, regex)
        return self.add_set(path)

    def delete_rule_regex(
        self, name: str, rule: str
    ) -> "ExtCommunityListBatchBuilder":
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
                    "description": "Basic extcommunity-list configuration",
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
