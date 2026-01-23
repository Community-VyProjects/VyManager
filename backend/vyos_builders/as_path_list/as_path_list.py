"""
AS Path List Batch Builder

Provides all batch operations for AS path list configuration.
Commands are identical between VyOS 1.4 and 1.5.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class AsPathListBatchBuilder:
    """Complete batch builder for AS path list operations"""

    def __init__(self, version: str):
        """Initialize builder with VyOS version."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "as_path_list"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "AsPathListBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "AsPathListBatchBuilder":
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
    # AS Path List Operations
    # ========================================================================

    def set_as_path_list(self, name: str) -> "AsPathListBatchBuilder":
        """Create AS path list.
        Command: set policy as-path-list <name>
        """
        path = self.mappers[self.mapper_key].get_as_path_list(name)
        return self.add_set(path)

    def delete_as_path_list(self, name: str) -> "AsPathListBatchBuilder":
        """Delete AS path list.
        Command: delete policy as-path-list <name>
        """
        path = self.mappers[self.mapper_key].get_delete_as_path_list(name)
        return self.add_delete(path)

    def set_as_path_list_description(
        self, name: str, description: str
    ) -> "AsPathListBatchBuilder":
        """Set AS path list description.
        Command: set policy as-path-list <name> description <text>
        """
        path = self.mappers[self.mapper_key].get_as_path_list_description(
            name, description
        )
        return self.add_set(path)

    def delete_as_path_list_description(self, name: str) -> "AsPathListBatchBuilder":
        """Delete AS path list description.
        Command: delete policy as-path-list <name> description
        """
        path = self.mappers[self.mapper_key].get_delete_as_path_list_description(name)
        return self.add_delete(path)

    # ========================================================================
    # Rule Operations
    # ========================================================================

    def set_rule(self, name: str, rule: str) -> "AsPathListBatchBuilder":
        """Create rule.
        Command: set policy as-path-list <name> rule <number>
        """
        path = self.mappers[self.mapper_key].get_rule(name, rule)
        return self.add_set(path)

    def delete_rule(self, name: str, rule: str) -> "AsPathListBatchBuilder":
        """Delete rule.
        Command: delete policy as-path-list <name> rule <number>
        """
        path = self.mappers[self.mapper_key].get_delete_rule(name, rule)
        return self.add_delete(path)

    def set_rule_action(
        self, name: str, rule: str, action: str
    ) -> "AsPathListBatchBuilder":
        """Set rule action.
        Command: set policy as-path-list <name> rule <number> action <permit|deny>
        """
        path = self.mappers[self.mapper_key].get_rule_action(name, rule, action)
        return self.add_set(path)

    def set_rule_description(
        self, name: str, rule: str, description: str
    ) -> "AsPathListBatchBuilder":
        """Set rule description.
        Command: set policy as-path-list <name> rule <number> description <text>
        """
        path = self.mappers[self.mapper_key].get_rule_description(
            name, rule, description
        )
        return self.add_set(path)

    def delete_rule_description(
        self, name: str, rule: str
    ) -> "AsPathListBatchBuilder":
        """Delete rule description.
        Command: delete policy as-path-list <name> rule <number> description
        """
        path = self.mappers[self.mapper_key].get_delete_rule_description(name, rule)
        return self.add_delete(path)

    def set_rule_regex(
        self, name: str, rule: str, regex: str
    ) -> "AsPathListBatchBuilder":
        """Set rule regex.
        Command: set policy as-path-list <name> rule <number> regex <text>
        """
        path = self.mappers[self.mapper_key].get_rule_regex(name, rule, regex)
        return self.add_set(path)

    def delete_rule_regex(self, name: str, rule: str) -> "AsPathListBatchBuilder":
        """Delete rule regex.
        Command: delete policy as-path-list <name> rule <number> regex
        """
        path = self.mappers[self.mapper_key].get_delete_rule_regex(name, rule)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        # Commands are identical between 1.4 and 1.5
        return {
            "version": self.version,
            "features": {
                "basic": {
                    "supported": True,
                    "description": "Basic AS path list configuration",
                },
                "rules": {
                    "supported": True,
                    "description": "AS path list rules with regex patterns",
                },
                "actions": {
                    "supported": True,
                    "description": "Permit/deny actions for rules",
                },
            },
            "version_notes": {
                "identical_versions": "Commands are identical between VyOS 1.4 and 1.5",
            },
        }
