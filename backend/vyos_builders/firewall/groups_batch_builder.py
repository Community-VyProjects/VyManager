"""
Firewall Groups Batch Builder

Provides all firewall group batch operations following the standard pattern.
"""

from typing import Any, Dict, List, cast
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.firewall.groups import FirewallGroupsMapper
from vyos_builders.base import BatchBuilder


# (capability key, CLI group type node, description, member type, member op suffix, has include)
_GROUP_TYPES = (
    ("address_group", "address-group", "IPv4 address group", "address", "address", True),
    ("ipv6_address_group", "ipv6-address-group", "IPv6 address group", "address", "address", True),
    ("network_group", "network-group", "IPv4 network group", "network", "network", True),
    ("ipv6_network_group", "ipv6-network-group", "IPv6 network group", "network", "network", True),
    ("port_group", "port-group", "Port group (TCP/UDP ports)", "port", "port", True),
    ("interface_group", "interface-group", "Interface group", "interface", "interface", True),
    ("mac_group", "mac-group", "MAC address group", "mac", "mac", True),
    ("domain_group", "domain-group", "Domain name group", "domain", "address", False),
    ("remote_group", "remote-group", "Remote address group", "url", "url", False),
)


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

    def _m(self) -> FirewallGroupsMapper:
        return cast(FirewallGroupsMapper, self.mappers[self.mapper_key])

    def _versioned_path(self, node: str, method: str, *args: Any) -> List[str]:
        """Path for a group type only one VyOS version has; ValueError elsewhere."""
        mapper = self._m()
        mapper.require_node(node)
        return getattr(mapper, method)(*args)

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
        path = self._m().get_address_group(group_name)
        return self.add_set(path)

    def delete_address_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete address group."""
        path = self._m().get_address_group(group_name)
        return self.add_delete(path)

    def set_address_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set address group description."""
        path = self._m().get_address_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_address_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete address group description."""
        path = self._m().get_address_group_description_path(group_name)
        return self.add_delete(path)

    def set_address_group_address(
        self, group_name: str, address: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add address to address group."""
        path = self._m().get_address_group_address(group_name, address)
        return self.add_set(path)

    def delete_address_group_address(
        self, group_name: str, address: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove address from address group."""
        path = self._m().get_address_group_address(group_name, address)
        return self.add_delete(path)

    def set_address_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Include another address group."""
        path = self._m().get_address_group_include(group_name, include_group)
        return self.add_set(path)

    def delete_address_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove included address group."""
        path = self._m().get_address_group_include(group_name, include_group)
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Address Group Operations
    # ========================================================================

    def set_ipv6_address_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create IPv6 address group."""
        path = self._m().get_ipv6_address_group(group_name)
        return self.add_set(path)

    def delete_ipv6_address_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete IPv6 address group."""
        path = self._m().get_ipv6_address_group(group_name)
        return self.add_delete(path)

    def set_ipv6_address_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set IPv6 address group description."""
        path = self._m().get_ipv6_address_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_ipv6_address_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete IPv6 address group description."""
        path = self._m().get_ipv6_address_group_description_path(
            group_name
        )
        return self.add_delete(path)

    def set_ipv6_address_group_address(
        self, group_name: str, address: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add address to IPv6 address group."""
        path = self._m().get_ipv6_address_group_address(
            group_name, address
        )
        return self.add_set(path)

    def delete_ipv6_address_group_address(
        self, group_name: str, address: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove address from IPv6 address group."""
        path = self._m().get_ipv6_address_group_address(
            group_name, address
        )
        return self.add_delete(path)

    def set_ipv6_address_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Include another IPv6 address group."""
        path = self._m().get_ipv6_address_group_include(group_name, include_group)
        return self.add_set(path)

    def delete_ipv6_address_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove included IPv6 address group."""
        path = self._m().get_ipv6_address_group_include(group_name, include_group)
        return self.add_delete(path)

    # ========================================================================
    # Network Group Operations (IPv4)
    # ========================================================================

    def set_network_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create network group."""
        path = self._m().get_network_group(group_name)
        return self.add_set(path)

    def delete_network_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete network group."""
        path = self._m().get_network_group(group_name)
        return self.add_delete(path)

    def set_network_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set network group description."""
        path = self._m().get_network_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_network_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete network group description."""
        path = self._m().get_network_group_description_path(group_name)
        return self.add_delete(path)

    def set_network_group_network(
        self, group_name: str, network: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add network to network group."""
        path = self._m().get_network_group_network(group_name, network)
        return self.add_set(path)

    def delete_network_group_network(
        self, group_name: str, network: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove network from network group."""
        path = self._m().get_network_group_network(group_name, network)
        return self.add_delete(path)

    def set_network_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Include another network group."""
        path = self._m().get_network_group_include(group_name, include_group)
        return self.add_set(path)

    def delete_network_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove included network group."""
        path = self._m().get_network_group_include(group_name, include_group)
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Network Group Operations
    # ========================================================================

    def set_ipv6_network_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create IPv6 network group."""
        path = self._m().get_ipv6_network_group(group_name)
        return self.add_set(path)

    def delete_ipv6_network_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete IPv6 network group."""
        path = self._m().get_ipv6_network_group(group_name)
        return self.add_delete(path)

    def set_ipv6_network_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set IPv6 network group description."""
        path = self._m().get_ipv6_network_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_ipv6_network_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete IPv6 network group description."""
        path = self._m().get_ipv6_network_group_description_path(
            group_name
        )
        return self.add_delete(path)

    def set_ipv6_network_group_network(
        self, group_name: str, network: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add network to IPv6 network group."""
        path = self._m().get_ipv6_network_group_network(
            group_name, network
        )
        return self.add_set(path)

    def delete_ipv6_network_group_network(
        self, group_name: str, network: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove network from IPv6 network group."""
        path = self._m().get_ipv6_network_group_network(
            group_name, network
        )
        return self.add_delete(path)

    def set_ipv6_network_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Include another IPv6 network group."""
        path = self._m().get_ipv6_network_group_include(group_name, include_group)
        return self.add_set(path)

    def delete_ipv6_network_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove included IPv6 network group."""
        path = self._m().get_ipv6_network_group_include(group_name, include_group)
        return self.add_delete(path)

    # ========================================================================
    # Port Group Operations
    # ========================================================================

    def set_port_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create port group."""
        path = self._m().get_port_group(group_name)
        return self.add_set(path)

    def delete_port_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete port group."""
        path = self._m().get_port_group(group_name)
        return self.add_delete(path)

    def set_port_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set port group description."""
        path = self._m().get_port_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_port_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete port group description."""
        path = self._m().get_port_group_description_path(group_name)
        return self.add_delete(path)

    def set_port_group_port(
        self, group_name: str, port: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add port to port group."""
        path = self._m().get_port_group_port(group_name, port)
        return self.add_set(path)

    def delete_port_group_port(
        self, group_name: str, port: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove port from port group."""
        path = self._m().get_port_group_port(group_name, port)
        return self.add_delete(path)

    def set_port_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Include another port group."""
        path = self._m().get_port_group_include(group_name, include_group)
        return self.add_set(path)

    def delete_port_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove included port group."""
        path = self._m().get_port_group_include(group_name, include_group)
        return self.add_delete(path)

    # ========================================================================
    # Interface Group Operations
    # ========================================================================

    def set_interface_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create interface group."""
        path = self._m().get_interface_group(group_name)
        return self.add_set(path)

    def delete_interface_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete interface group."""
        path = self._m().get_interface_group(group_name)
        return self.add_delete(path)

    def set_interface_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set interface group description."""
        path = self._m().get_interface_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_interface_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete interface group description."""
        path = self._m().get_interface_group_description_path(
            group_name
        )
        return self.add_delete(path)

    def set_interface_group_interface(
        self, group_name: str, interface: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add interface to interface group."""
        path = self._m().get_interface_group_interface(
            group_name, interface
        )
        return self.add_set(path)

    def delete_interface_group_interface(
        self, group_name: str, interface: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove interface from interface group."""
        path = self._m().get_interface_group_interface(
            group_name, interface
        )
        return self.add_delete(path)

    def set_interface_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Include another interface group."""
        path = self._m().get_interface_group_include(group_name, include_group)
        return self.add_set(path)

    def delete_interface_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove included interface group."""
        path = self._m().get_interface_group_include(group_name, include_group)
        return self.add_delete(path)

    # ========================================================================
    # MAC Group Operations
    # ========================================================================

    def set_mac_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create MAC group."""
        path = self._m().get_mac_group(group_name)
        return self.add_set(path)

    def delete_mac_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete MAC group."""
        path = self._m().get_mac_group(group_name)
        return self.add_delete(path)

    def set_mac_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set MAC group description."""
        path = self._m().get_mac_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_mac_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete MAC group description."""
        path = self._m().get_mac_group_description_path(group_name)
        return self.add_delete(path)

    def set_mac_group_mac(
        self, group_name: str, mac: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add MAC address to MAC group."""
        path = self._m().get_mac_group_mac(group_name, mac)
        return self.add_set(path)

    def delete_mac_group_mac(
        self, group_name: str, mac: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove MAC address from MAC group."""
        path = self._m().get_mac_group_mac(group_name, mac)
        return self.add_delete(path)

    def set_mac_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Include another MAC group."""
        path = self._m().get_mac_group_include(group_name, include_group)
        return self.add_set(path)

    def delete_mac_group_include(
        self, group_name: str, include_group: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove included MAC group."""
        path = self._m().get_mac_group_include(group_name, include_group)
        return self.add_delete(path)

    # ========================================================================
    # Domain Group Operations
    # ========================================================================

    def set_domain_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create a domain group."""
        path = self._m().get_domain_group(group_name)
        return self.add_set(path)

    def delete_domain_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete a domain group."""
        path = self._m().get_domain_group(group_name)
        return self.add_delete(path)

    def set_domain_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set a domain group description."""
        path = self._m().get_domain_group_description(
            group_name, description
        )
        return self.add_set(path)

    def delete_domain_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete a domain group description."""
        path = self._m().get_domain_group_description_path(group_name)
        return self.add_delete(path)

    def set_domain_group_address(
        self, group_name: str, address: str
    ) -> "FirewallGroupsBatchBuilder":
        """Add a domain to a domain group."""
        path = self._m().get_domain_group_address(group_name, address)
        return self.add_set(path)

    def delete_domain_group_address(
        self, group_name: str, address: str
    ) -> "FirewallGroupsBatchBuilder":
        """Remove a domain from a domain group."""
        path = self._m().get_domain_group_address(group_name, address)
        return self.add_delete(path)

    # ========================================================================
    # Remote Group Operations (1.5 only)
    # ========================================================================

    def set_remote_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Create a remote group."""
        path = self._versioned_path("remote-group", "get_remote_group", group_name)
        return self.add_set(path)

    def delete_remote_group(self, group_name: str) -> "FirewallGroupsBatchBuilder":
        """Delete a remote group."""
        path = self._versioned_path("remote-group", "get_remote_group", group_name)
        return self.add_delete(path)

    def set_remote_group_description(
        self, group_name: str, description: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set a remote group description."""
        path = self._versioned_path(
            "remote-group", "get_remote_group_description", group_name, description
        )
        return self.add_set(path)

    def delete_remote_group_description(
        self, group_name: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete a remote group description."""
        path = self._versioned_path(
            "remote-group", "get_remote_group_description_path", group_name
        )
        return self.add_delete(path)

    def set_remote_group_url(
        self, group_name: str, url: str
    ) -> "FirewallGroupsBatchBuilder":
        """Set a remote group URL."""
        path = self._versioned_path("remote-group", "get_remote_group_url", group_name, url)
        return self.add_set(path)

    def delete_remote_group_url(
        self, group_name: str, url: str
    ) -> "FirewallGroupsBatchBuilder":
        """Delete a remote group URL."""
        path = self._versioned_path("remote-group", "get_remote_group_url", group_name, url)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Group type flags and batch ops, read from the mapper allowlist."""
        types = self._m().supported_group_types()

        group_types: Dict[str, Dict[str, Any]] = {}
        operations: Dict[str, List[str]] = {}
        for key, node, description, member_type, member_suffix, has_include in _GROUP_TYPES:
            group_types[key] = {
                "supported": node in types,
                "description": description,
                "member_type": member_type,
            }
            if node not in types:
                continue
            leaves = [key, f"{key}_{member_suffix}", f"{key}_description"]
            if has_include:
                leaves.append(f"{key}_include")
            operations[key] = [f"{action}_{leaf}" for leaf in leaves for action in ("set", "delete")]

        return {
            "version": self.version,
            "group_types": group_types,
            "operations": operations,
            "statistics": {
                "total_group_types": sum(1 for flag in group_types.values() if flag["supported"]),
                "total_operations": sum(len(ops) for ops in operations.values()),
            },
        }


__all__ = ["FirewallGroupsBatchBuilder"]
