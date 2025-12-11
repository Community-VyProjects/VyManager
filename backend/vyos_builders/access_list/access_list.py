"""
Access List Batch Builder

Provides all batch operations for access-list configuration.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class AccessListBatchBuilder:
    """Complete batch builder for access-list operations"""

    def __init__(self, version: str):
        """Initialize builder with VyOS version."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "access_list"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "AccessListBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "AccessListBatchBuilder":
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
    # IPv4 Access List Operations
    # ========================================================================

    def set_access_list(self, number: str) -> "AccessListBatchBuilder":
        """Create IPv4 access-list."""
        path = self.mappers[self.mapper_key].get_access_list_path(number)
        return self.add_set(path)

    def delete_access_list(self, number: str) -> "AccessListBatchBuilder":
        """Delete IPv4 access-list."""
        path = self.mappers[self.mapper_key].get_access_list_path(number)
        return self.add_delete(path)

    def set_access_list_description(
        self, number: str, description: str
    ) -> "AccessListBatchBuilder":
        """Set IPv4 access-list description."""
        path = self.mappers[self.mapper_key].get_access_list_description(
            number, description
        )
        return self.add_set(path)

    def delete_access_list_description(
        self, number: str
    ) -> "AccessListBatchBuilder":
        """Delete IPv4 access-list description."""
        path = self.mappers[self.mapper_key].get_access_list_path(number) + ["description"]
        return self.add_delete(path)

    # ========================================================================
    # IPv4 Rule Operations
    # ========================================================================

    def set_rule(self, number: str, rule: str) -> "AccessListBatchBuilder":
        """Create IPv4 rule."""
        path = self.mappers[self.mapper_key].get_rule_path(number, rule)
        return self.add_set(path)

    def delete_rule(self, number: str, rule: str) -> "AccessListBatchBuilder":
        """Delete IPv4 rule."""
        path = self.mappers[self.mapper_key].get_rule_path(number, rule)
        return self.add_delete(path)

    def set_rule_action(
        self, number: str, rule: str, action: str
    ) -> "AccessListBatchBuilder":
        """Set IPv4 rule action (permit/deny)."""
        path = self.mappers[self.mapper_key].get_rule_action(number, rule, action)
        return self.add_set(path)

    def set_rule_description(
        self, number: str, rule: str, description: str
    ) -> "AccessListBatchBuilder":
        """Set IPv4 rule description."""
        path = self.mappers[self.mapper_key].get_rule_description(
            number, rule, description
        )
        return self.add_set(path)

    def delete_rule_description(
        self, number: str, rule: str
    ) -> "AccessListBatchBuilder":
        """Delete IPv4 rule description."""
        path = self.mappers[self.mapper_key].get_rule_path(number, rule) + ["description"]
        return self.add_delete(path)

    # ========================================================================
    # IPv4 Rule Source Operations
    # ========================================================================

    def set_rule_source_any(
        self, number: str, rule: str
    ) -> "AccessListBatchBuilder":
        """Set IPv4 rule source to any."""
        path = self.mappers[self.mapper_key].get_rule_source_any(number, rule)
        return self.add_set(path)

    def set_rule_source_host(
        self, number: str, rule: str, host: str
    ) -> "AccessListBatchBuilder":
        """Set IPv4 rule source to specific host."""
        path = self.mappers[self.mapper_key].get_rule_source_host(number, rule, host)
        return self.add_set(path)

    def set_rule_source_inverse_mask(
        self, number: str, rule: str, address: str, mask: str
    ) -> "AccessListBatchBuilder":
        """Set IPv4 rule source with inverse-mask (requires two commands)."""
        # Set network address
        path1 = self.mappers[self.mapper_key].get_rule_source_inverse_mask_network(
            number, rule, address
        )
        self.add_set(path1)
        # Set inverse-mask
        path2 = self.mappers[self.mapper_key].get_rule_source_inverse_mask_mask(
            number, rule, mask
        )
        return self.add_set(path2)

    def set_rule_source_network(
        self, number: str, rule: str, address: str, mask: str
    ) -> "AccessListBatchBuilder":
        """Set IPv4 rule source network."""
        path = self.mappers[self.mapper_key].get_rule_source_network(
            number, rule, address, mask
        )
        return self.add_set(path)

    def delete_rule_source(
        self, number: str, rule: str
    ) -> "AccessListBatchBuilder":
        """Delete IPv4 rule source."""
        path = self.mappers[self.mapper_key].get_rule_source_path(number, rule)
        return self.add_delete(path)

    # ========================================================================
    # IPv4 Rule Destination Operations
    # ========================================================================

    def set_rule_destination_any(
        self, number: str, rule: str
    ) -> "AccessListBatchBuilder":
        """Set IPv4 rule destination to any."""
        path = self.mappers[self.mapper_key].get_rule_destination_any(number, rule)
        return self.add_set(path)

    def set_rule_destination_host(
        self, number: str, rule: str, host: str
    ) -> "AccessListBatchBuilder":
        """Set IPv4 rule destination to specific host."""
        path = self.mappers[self.mapper_key].get_rule_destination_host(number, rule, host)
        return self.add_set(path)

    def set_rule_destination_inverse_mask(
        self, number: str, rule: str, address: str, mask: str
    ) -> "AccessListBatchBuilder":
        """Set IPv4 rule destination with inverse-mask (requires two commands)."""
        # Set network address
        path1 = self.mappers[self.mapper_key].get_rule_destination_inverse_mask_network(
            number, rule, address
        )
        self.add_set(path1)
        # Set inverse-mask
        path2 = self.mappers[self.mapper_key].get_rule_destination_inverse_mask_mask(
            number, rule, mask
        )
        return self.add_set(path2)

    def set_rule_destination_network(
        self, number: str, rule: str, address: str, mask: str
    ) -> "AccessListBatchBuilder":
        """Set IPv4 rule destination network."""
        path = self.mappers[self.mapper_key].get_rule_destination_network(
            number, rule, address, mask
        )
        return self.add_set(path)

    def delete_rule_destination(
        self, number: str, rule: str
    ) -> "AccessListBatchBuilder":
        """Delete IPv4 rule destination."""
        path = self.mappers[self.mapper_key].get_rule_destination_path(number, rule)
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Access List Operations
    # ========================================================================

    def set_access_list6(self, name: str) -> "AccessListBatchBuilder":
        """Create IPv6 access-list."""
        path = self.mappers[self.mapper_key].get_access_list6_path(name)
        return self.add_set(path)

    def delete_access_list6(self, name: str) -> "AccessListBatchBuilder":
        """Delete IPv6 access-list."""
        path = self.mappers[self.mapper_key].get_access_list6_path(name)
        return self.add_delete(path)

    def set_access_list6_description(
        self, name: str, description: str
    ) -> "AccessListBatchBuilder":
        """Set IPv6 access-list description."""
        path = self.mappers[self.mapper_key].get_access_list6_description(
            name, description
        )
        return self.add_set(path)

    def delete_access_list6_description(
        self, name: str
    ) -> "AccessListBatchBuilder":
        """Delete IPv6 access-list description."""
        path = self.mappers[self.mapper_key].get_access_list6_path(name) + ["description"]
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Rule Operations
    # ========================================================================

    def set_rule6(self, name: str, rule: str) -> "AccessListBatchBuilder":
        """Create IPv6 rule."""
        path = self.mappers[self.mapper_key].get_rule6_path(name, rule)
        return self.add_set(path)

    def delete_rule6(self, name: str, rule: str) -> "AccessListBatchBuilder":
        """Delete IPv6 rule."""
        path = self.mappers[self.mapper_key].get_rule6_path(name, rule)
        return self.add_delete(path)

    def set_rule6_action(
        self, name: str, rule: str, action: str
    ) -> "AccessListBatchBuilder":
        """Set IPv6 rule action (permit/deny)."""
        path = self.mappers[self.mapper_key].get_rule6_action(name, rule, action)
        return self.add_set(path)

    def set_rule6_description(
        self, name: str, rule: str, description: str
    ) -> "AccessListBatchBuilder":
        """Set IPv6 rule description."""
        path = self.mappers[self.mapper_key].get_rule6_description(
            name, rule, description
        )
        return self.add_set(path)

    def delete_rule6_description(
        self, name: str, rule: str
    ) -> "AccessListBatchBuilder":
        """Delete IPv6 rule description."""
        path = self.mappers[self.mapper_key].get_rule6_path(name, rule) + ["description"]
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Rule Source Operations
    # ========================================================================

    def set_rule6_source_any(
        self, name: str, rule: str
    ) -> "AccessListBatchBuilder":
        """Set IPv6 rule source to any."""
        path = self.mappers[self.mapper_key].get_rule6_source_any(name, rule)
        return self.add_set(path)

    def set_rule6_source_exact_match(
        self, name: str, rule: str
    ) -> "AccessListBatchBuilder":
        """Set IPv6 rule source exact-match flag."""
        path = self.mappers[self.mapper_key].get_rule6_source_exact_match(name, rule)
        return self.add_set(path)

    def set_rule6_source_network(
        self, name: str, rule: str, network: str
    ) -> "AccessListBatchBuilder":
        """Set IPv6 rule source network."""
        path = self.mappers[self.mapper_key].get_rule6_source_network(name, rule, network)
        return self.add_set(path)

    def delete_rule6_source(
        self, name: str, rule: str
    ) -> "AccessListBatchBuilder":
        """Delete IPv6 rule source."""
        path = self.mappers[self.mapper_key].get_rule6_source_path(name, rule)
        return self.add_delete(path)

    # NOTE: IPv6 access-lists do NOT have destination fields
    # They only match on source (any or network)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        # Both 1.4 and 1.5 support the same features for access-list
        return {
            "version": self.version,
            "features": {
                "ipv4_access_list": {
                    "supported": True,
                    "description": "IPv4 access lists",
                },
                "ipv6_access_list": {
                    "supported": True,
                    "description": "IPv6 access lists (access-list6)",
                },
                "source_destination_filters": {
                    "supported": True,
                    "description": "Source and destination filtering",
                },
            },
            "access_list_ranges": {
                "standard": "1-99, 1300-1999",
                "extended": "100-199, 2000-2699",
            },
        }
