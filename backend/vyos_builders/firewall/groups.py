"""
Firewall Groups Batch Builder

Provides all firewall group batch operations following the standard pattern.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class FirewallGroupsBatchBuilder:
    """Complete batch builder for firewall group operations"""

    def __init__(self, version: str):
        """Initialize firewall groups batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get firewall groups mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "firewall_groups"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "FirewallGroupsBatchBuilder":
        """Add a 'set' operation to the batch."""
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "FirewallGroupsBatchBuilder":
        """Add a 'delete' operation to the batch."""
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
    # Address Group Operations (IPv4)
    # ========================================================================

    def set_address_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create address group."""
        path = self.mappers[self.mapper_key].get_address_group(group_name)
        return self.add_set(path)

    def delete_address_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete address group."""
        path = self.mappers[self.mapper_key].get_address_group(group_name)
        return self.add_delete(path)

    def set_address_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set address group description."""
        path = self.mappers[self.mapper_key].get_address_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_address_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete address group description."""
        path = self.mappers[self.mapper_key].get_address_group_description_path(group_name)
        return self.add_delete(path)

    def set_address_group_address(
        self, group_name: str, address: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add address to address group."""
        path = self.mappers[self.mapper_key].get_address_group_address(group_name, address)
        return self.add_set(path)

    def delete_address_group_address(
        self, group_name: str, address: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove address from address group."""
        path = self.mappers[self.mapper_key].get_address_group_address(group_name, address)
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Address Group Operations
    # ========================================================================

    def set_ipv6_address_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create IPv6 address group."""
        path = self.mappers[self.mapper_key].get_ipv6_address_group(group_name)
        return self.add_set(path)

    def delete_ipv6_address_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete IPv6 address group."""
        path = self.mappers[self.mapper_key].get_ipv6_address_group(group_name)
        return self.add_delete(path)

    def set_ipv6_address_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set IPv6 address group description."""
        path = self.mappers[self.mapper_key].get_ipv6_address_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_ipv6_address_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete IPv6 address group description."""
        path = self.mappers[self.mapper_key].get_ipv6_address_group_description_path(
            group_name
        )
        return self.add_delete(path)

    def set_ipv6_address_group_address(
        self, group_name: str, address: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add address to IPv6 address group."""
        path = self.mappers[self.mapper_key].get_ipv6_address_group_address(
            group_name, address
        )
        return self.add_set(path)

    def delete_ipv6_address_group_address(
        self, group_name: str, address: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove address from IPv6 address group."""
        path = self.mappers[self.mapper_key].get_ipv6_address_group_address(
            group_name, address
        )
        return self.add_delete(path)

    # ========================================================================
    # Network Group Operations (IPv4)
    # ========================================================================

    def set_network_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create network group."""
        path = self.mappers[self.mapper_key].get_network_group(group_name)
        return self.add_set(path)

    def delete_network_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete network group."""
        path = self.mappers[self.mapper_key].get_network_group(group_name)
        return self.add_delete(path)

    def set_network_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set network group description."""
        path = self.mappers[self.mapper_key].get_network_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_network_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete network group description."""
        path = self.mappers[self.mapper_key].get_network_group_description_path(group_name)
        return self.add_delete(path)

    def set_network_group_network(
        self, group_name: str, network: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add network to network group."""
        path = self.mappers[self.mapper_key].get_network_group_network(group_name, network)
        return self.add_set(path)

    def delete_network_group_network(
        self, group_name: str, network: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove network from network group."""
        path = self.mappers[self.mapper_key].get_network_group_network(group_name, network)
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Network Group Operations
    # ========================================================================

    def set_ipv6_network_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create IPv6 network group."""
        path = self.mappers[self.mapper_key].get_ipv6_network_group(group_name)
        return self.add_set(path)

    def delete_ipv6_network_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete IPv6 network group."""
        path = self.mappers[self.mapper_key].get_ipv6_network_group(group_name)
        return self.add_delete(path)

    def set_ipv6_network_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set IPv6 network group description."""
        path = self.mappers[self.mapper_key].get_ipv6_network_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_ipv6_network_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete IPv6 network group description."""
        path = self.mappers[self.mapper_key].get_ipv6_network_group_description_path(
            group_name
        )
        return self.add_delete(path)

    def set_ipv6_network_group_network(
        self, group_name: str, network: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add network to IPv6 network group."""
        path = self.mappers[self.mapper_key].get_ipv6_network_group_network(
            group_name, network
        )
        return self.add_set(path)

    def delete_ipv6_network_group_network(
        self, group_name: str, network: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove network from IPv6 network group."""
        path = self.mappers[self.mapper_key].get_ipv6_network_group_network(
            group_name, network
        )
        return self.add_delete(path)

    # ========================================================================
    # Port Group Operations
    # ========================================================================

    def set_port_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create port group."""
        path = self.mappers[self.mapper_key].get_port_group(group_name)
        return self.add_set(path)

    def delete_port_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete port group."""
        path = self.mappers[self.mapper_key].get_port_group(group_name)
        return self.add_delete(path)

    def set_port_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set port group description."""
        path = self.mappers[self.mapper_key].get_port_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_port_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete port group description."""
        path = self.mappers[self.mapper_key].get_port_group_description_path(group_name)
        return self.add_delete(path)

    def set_port_group_port(
        self, group_name: str, port: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add port to port group."""
        path = self.mappers[self.mapper_key].get_port_group_port(group_name, port)
        return self.add_set(path)

    def delete_port_group_port(
        self, group_name: str, port: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove port from port group."""
        path = self.mappers[self.mapper_key].get_port_group_port(group_name, port)
        return self.add_delete(path)

    # ========================================================================
    # Interface Group Operations
    # ========================================================================

    def set_interface_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create interface group."""
        path = self.mappers[self.mapper_key].get_interface_group(group_name)
        return self.add_set(path)

    def delete_interface_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete interface group."""
        path = self.mappers[self.mapper_key].get_interface_group(group_name)
        return self.add_delete(path)

    def set_interface_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set interface group description."""
        path = self.mappers[self.mapper_key].get_interface_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_interface_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete interface group description."""
        path = self.mappers[self.mapper_key].get_interface_group_description_path(
            group_name
        )
        return self.add_delete(path)

    def set_interface_group_interface(
        self, group_name: str, interface: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add interface to interface group."""
        path = self.mappers[self.mapper_key].get_interface_group_interface(
            group_name, interface
        )
        return self.add_set(path)

    def delete_interface_group_interface(
        self, group_name: str, interface: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove interface from interface group."""
        path = self.mappers[self.mapper_key].get_interface_group_interface(
            group_name, interface
        )
        return self.add_delete(path)

    # ========================================================================
    # MAC Group Operations
    # ========================================================================

    def set_mac_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create MAC group."""
        path = self.mappers[self.mapper_key].get_mac_group(group_name)
        return self.add_set(path)

    def delete_mac_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete MAC group."""
        path = self.mappers[self.mapper_key].get_mac_group(group_name)
        return self.add_delete(path)

    def set_mac_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set MAC group description."""
        path = self.mappers[self.mapper_key].get_mac_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_mac_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete MAC group description."""
        path = self.mappers[self.mapper_key].get_mac_group_description_path(group_name)
        return self.add_delete(path)

    def set_mac_group_mac(
        self, group_name: str, mac: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add MAC address to MAC group."""
        path = self.mappers[self.mapper_key].get_mac_group_mac(group_name, mac)
        return self.add_set(path)

    def delete_mac_group_mac(
        self, group_name: str, mac: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove MAC address from MAC group."""
        path = self.mappers[self.mapper_key].get_mac_group_mac(group_name, mac)
        return self.add_delete(path)

    # ========================================================================
    # Domain Group Operations (VyOS 1.5+ only)
    # ========================================================================

    def set_domain_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create domain group (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_domain_group(group_name)
        return self.add_set(path)

    def delete_domain_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete domain group (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_domain_group(group_name)
        return self.add_delete(path)

    def set_domain_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set domain group description (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_domain_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_domain_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete domain group description (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_domain_group_description_path(group_name)
        return self.add_delete(path)

    def set_domain_group_address(
        self, group_name: str, address: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add domain to domain group (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_domain_group_address(group_name, address)
        return self.add_set(path)

    def delete_domain_group_address(
        self, group_name: str, address: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove domain from domain group (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_domain_group_address(group_name, address)
        return self.add_delete(path)

    # ========================================================================
    # Remote Group Operations (VyOS 1.5+ only)
    # ========================================================================

    def set_remote_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create remote group (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_remote_group(group_name)
        return self.add_set(path)

    def delete_remote_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete remote group (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_remote_group(group_name)
        return self.add_delete(path)

    def set_remote_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set remote group description (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_remote_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_remote_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete remote group description (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_remote_group_description_path(group_name)
        return self.add_delete(path)

    def set_remote_group_url(
        self, group_name: str, url: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set remote group URL (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_remote_group_url(group_name, url)
        return self.add_set(path)

    def delete_remote_group_url(
        self, group_name: str, url: str = None
    ) -> "FirewallGroupsBatchBuilder":
        """Delete remote group URL (VyOS 1.5+ only).

        Args:
            group_name: Name of the remote group
            url: Optional URL to delete. If provided, deletes specific URL.
        """
        path = self.mappers[self.mapper_key].get_remote_group_url_path(group_name, url)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """
        Get capabilities for the current VyOS version.

        Returns:
            Dictionary of supported features and operations
        """
        # Base capabilities for all versions
        capabilities = {
            "version": self.version,
            "version_number": float(self.version),
            "group_types": {
                "address_group": {
                    "supported": True,
                    "description": "IPv4 address group",
                    "member_type": "address"
                },
                "ipv6_address_group": {
                    "supported": True,
                    "description": "IPv6 address group",
                    "member_type": "address"
                },
                "network_group": {
                    "supported": True,
                    "description": "IPv4 network group",
                    "member_type": "network"
                },
                "ipv6_network_group": {
                    "supported": True,
                    "description": "IPv6 network group",
                    "member_type": "network"
                },
                "port_group": {
                    "supported": True,
                    "description": "Port group (TCP/UDP ports)",
                    "member_type": "port"
                },
                "interface_group": {
                    "supported": True,
                    "description": "Interface group",
                    "member_type": "interface"
                },
                "mac_group": {
                    "supported": True,
                    "description": "MAC address group",
                    "member_type": "mac"
                },
                "domain_group": {
                    "supported": self.version == "1.5",
                    "description": "Domain name group (1.5+)",
                    "member_type": "domain"
                },
                "remote_group": {
                    "supported": self.version == "1.5",
                    "description": "Remote address group (1.5+)",
                    "member_type": "url"
                }
            },
            "operations": {
                "address_group": [
                    "set_address_group",
                    "delete_address_group",
                    "set_address_group_address",
                    "delete_address_group_address",
                    "set_address_group_description",
                    "delete_address_group_description"
                ],
                "ipv6_address_group": [
                    "set_ipv6_address_group",
                    "delete_ipv6_address_group",
                    "set_ipv6_address_group_address",
                    "delete_ipv6_address_group_address",
                    "set_ipv6_address_group_description",
                    "delete_ipv6_address_group_description"
                ],
                "network_group": [
                    "set_network_group",
                    "delete_network_group",
                    "set_network_group_network",
                    "delete_network_group_network",
                    "set_network_group_description",
                    "delete_network_group_description"
                ],
                "ipv6_network_group": [
                    "set_ipv6_network_group",
                    "delete_ipv6_network_group",
                    "set_ipv6_network_group_network",
                    "delete_ipv6_network_group_network",
                    "set_ipv6_network_group_description",
                    "delete_ipv6_network_group_description"
                ],
                "port_group": [
                    "set_port_group",
                    "delete_port_group",
                    "set_port_group_port",
                    "delete_port_group_port",
                    "set_port_group_description",
                    "delete_port_group_description"
                ],
                "interface_group": [
                    "set_interface_group",
                    "delete_interface_group",
                    "set_interface_group_interface",
                    "delete_interface_group_interface",
                    "set_interface_group_description",
                    "delete_interface_group_description"
                ],
                "mac_group": [
                    "set_mac_group",
                    "delete_mac_group",
                    "set_mac_group_mac",
                    "delete_mac_group_mac",
                    "set_mac_group_description",
                    "delete_mac_group_description"
                ]
            }
        }

        # Add domain_group and remote_group operations for VyOS 1.5+
        if self.version == "1.5":
            capabilities["operations"]["domain_group"] = [
                "set_domain_group",
                "delete_domain_group",
                "set_domain_group_address",
                "delete_domain_group_address",
                "set_domain_group_description",
                "delete_domain_group_description"
            ]
            capabilities["operations"]["remote_group"] = [
                "set_remote_group",
                "delete_remote_group",
                "set_remote_group_url",
                "delete_remote_group_url",
                "set_remote_group_description",
                "delete_remote_group_description"
            ]

        # Calculate statistics
        total_operations = sum(len(ops) for ops in capabilities["operations"].values())
        capabilities["statistics"] = {
            "total_group_types": len([gt for gt in capabilities["group_types"].values() if gt["supported"]]),
            "total_operations": total_operations
        }

        return capabilities


# Export as FirewallGroupsBatchBuilder for consistency
__all__ = ["FirewallGroupsBatchBuilder"]
