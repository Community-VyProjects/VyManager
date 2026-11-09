"""
Firewall Groups Batch Builder

Provides all firewall group batch operations following the standard pattern.
"""

from typing import Any, Dict, cast
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.firewall.groups import FirewallGroupsMapper
from vyos_builders.base import BatchBuilder


def _version_to_float(version: str) -> float:
    """Best-effort numeric form of a VyOS version for display.

    Handles "x.y" and "x.y.z" (e.g. "1.4.4" -> 1.4); returns 0.0 when the
    string cannot be parsed. float("1.4.4") raises, so the major.minor pair is
    used rather than the raw string.
    """
    parts = str(version).split(".")
    try:
        return float(f"{parts[0]}.{parts[1]}") if len(parts) >= 2 else float(parts[0])
    except (ValueError, IndexError):
        return 0.0


class FirewallGroupsBatchBuilder(BatchBuilder):
    """Complete batch builder for firewall group operations"""

    def __init__(self, version: str):
        """Initialize firewall groups batch builder."""
        super().__init__(version)

        self.mapper_key = "firewall_groups"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

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

    def set_address_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Include another address group."""
        path = self.mappers[self.mapper_key].get_address_group_include(group_name, include_group)
        return self.add_set(path)

    def delete_address_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove included address group."""
        path = self.mappers[self.mapper_key].get_address_group_include(group_name, include_group)
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

    def set_ipv6_address_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Include another IPv6 address group."""
        path = self.mappers[self.mapper_key].get_ipv6_address_group_include(group_name, include_group)
        return self.add_set(path)

    def delete_ipv6_address_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove included IPv6 address group."""
        path = self.mappers[self.mapper_key].get_ipv6_address_group_include(group_name, include_group)
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

    def set_network_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Include another network group."""
        path = self.mappers[self.mapper_key].get_network_group_include(group_name, include_group)
        return self.add_set(path)

    def delete_network_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove included network group."""
        path = self.mappers[self.mapper_key].get_network_group_include(group_name, include_group)
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

    def set_ipv6_network_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Include another IPv6 network group."""
        path = self.mappers[self.mapper_key].get_ipv6_network_group_include(group_name, include_group)
        return self.add_set(path)

    def delete_ipv6_network_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove included IPv6 network group."""
        path = self.mappers[self.mapper_key].get_ipv6_network_group_include(group_name, include_group)
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

    def set_port_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Include another port group."""
        path = self.mappers[self.mapper_key].get_port_group_include(group_name, include_group)
        return self.add_set(path)

    def delete_port_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove included port group."""
        path = self.mappers[self.mapper_key].get_port_group_include(group_name, include_group)
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

    def set_interface_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Include another interface group."""
        path = self.mappers[self.mapper_key].get_interface_group_include(group_name, include_group)
        return self.add_set(path)

    def delete_interface_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove included interface group."""
        path = self.mappers[self.mapper_key].get_interface_group_include(group_name, include_group)
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

    def set_mac_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Include another MAC group."""
        path = self.mappers[self.mapper_key].get_mac_group_include(group_name, include_group)
        return self.add_set(path)

    def delete_mac_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove included MAC group."""
        path = self.mappers[self.mapper_key].get_mac_group_include(group_name, include_group)
        return self.add_delete(path)

    # ========================================================================
    # Domain Group Operations
    # ========================================================================

    def set_domain_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create a domain group."""
        path = self.mappers[self.mapper_key].get_domain_group(group_name)
        return self.add_set(path)

    def delete_domain_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete a domain group."""
        path = self.mappers[self.mapper_key].get_domain_group(group_name)
        return self.add_delete(path)

    def set_domain_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set a domain group description."""
        path = self.mappers[self.mapper_key].get_domain_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_domain_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete a domain group description."""
        path = self.mappers[self.mapper_key].get_domain_group_description_path(group_name)
        return self.add_delete(path)

    def set_domain_group_address(
        self, group_name: str, address: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add a domain to a domain group."""
        path = self.mappers[self.mapper_key].get_domain_group_address(group_name, address)
        return self.add_set(path)

    def delete_domain_group_address(
        self, group_name: str, address: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove a domain from a domain group."""
        path = self.mappers[self.mapper_key].get_domain_group_address(group_name, address)
        return self.add_delete(path)

    # ========================================================================
    # Remote Group Operations
    # ========================================================================

    def set_remote_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create a remote group."""
        path = self.mappers[self.mapper_key].get_remote_group(group_name)
        return self.add_set(path)

    def delete_remote_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete a remote group."""
        path = self.mappers[self.mapper_key].get_remote_group(group_name)
        return self.add_delete(path)

    def set_remote_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set a remote group description."""
        path = self.mappers[self.mapper_key].get_remote_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_remote_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete a remote group description."""
        path = self.mappers[self.mapper_key].get_remote_group_description_path(group_name)
        return self.add_delete(path)

    def set_remote_group_url(
        self, group_name: str, url: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set a remote group URL."""
        path = self.mappers[self.mapper_key].get_remote_group_url(group_name, url)
        return self.add_set(path)

    def delete_remote_group_url(
        self, group_name: str, url: str = None
    ) -> "FirewallGroupsBatchBuilder":
        """Delete a remote group URL.

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
        mapper = cast(FirewallGroupsMapper, self.mappers[self.mapper_key])
        types = mapper.supported_group_types()

        def type_flag(node: str, description: str, member_type: str) -> Dict[str, Any]:
            return {
                "supported": node in types,
                "description": description,
                "member_type": member_type,
            }

        # Base capabilities for all versions
        capabilities = {
            "version": self.version,
            "version_number": _version_to_float(self.version),
            "group_types": {
                "address_group": type_flag("address-group", "IPv4 address group", "address"),
                "ipv6_address_group": type_flag("ipv6-address-group", "IPv6 address group", "address"),
                "network_group": type_flag("network-group", "IPv4 network group", "network"),
                "ipv6_network_group": type_flag("ipv6-network-group", "IPv6 network group", "network"),
                "port_group": type_flag("port-group", "Port group (TCP/UDP ports)", "port"),
                "interface_group": type_flag("interface-group", "Interface group", "interface"),
                "mac_group": type_flag("mac-group", "MAC address group", "mac"),
                "domain_group": type_flag("domain-group", "Domain name group", "domain"),
                "remote_group": type_flag("remote-group", "Remote address group", "url"),
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

        if "domain-group" in types:
            capabilities["operations"]["domain_group"] = [
                "set_domain_group",
                "delete_domain_group",
                "set_domain_group_address",
                "delete_domain_group_address",
                "set_domain_group_description",
                "delete_domain_group_description"
            ]
        if "remote-group" in types:
            capabilities["operations"]["remote_group"] = [
                "set_remote_group",
                "delete_remote_group",
                "set_remote_group_url",
                "delete_remote_group_url",
                "set_remote_group_description",
                "delete_remote_group_description"
            ]

        op_nodes = {
            "address_group": "address-group",
            "ipv6_address_group": "ipv6-address-group",
            "network_group": "network-group",
            "ipv6_network_group": "ipv6-network-group",
            "port_group": "port-group",
            "interface_group": "interface-group",
            "mac_group": "mac-group",
            "domain_group": "domain-group",
            "remote_group": "remote-group",
        }
        capabilities["operations"] = {
            key: ops
            for key, ops in capabilities["operations"].items()
            if op_nodes[key] in types
        }

        # Calculate statistics
        total_operations = sum(len(ops) for ops in capabilities["operations"].values())
        capabilities["statistics"] = {
            "total_group_types": len([gt for gt in capabilities["group_types"].values() if gt["supported"]]),
            "total_operations": total_operations
        }

        return capabilities


# Export as FirewallGroupsBatchBuilder for consistency
__all__ = ["FirewallGroupsBatchBuilder"]
