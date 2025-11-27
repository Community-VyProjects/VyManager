"""
Firewall Groups Command Mapper

Handles firewall group commands for all group types.
Provides command path generation for firewall group operations.
"""

from typing import List
from ..base import BaseFeatureMapper


class FirewallGroupsMapper(BaseFeatureMapper):
    """Firewall groups mapper with all group operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Address Group Operations (IPv4)
    # ========================================================================

    def get_address_group(self, group_name: str) -> List[str]:
        """Get command path for creating address group."""
        return ["firewall", "group", "address-group", group_name]

    def get_address_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting address group description."""
        return ["firewall", "group", "address-group", group_name, "description", description]

    def get_address_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for address group description (for deletion)."""
        return ["firewall", "group", "address-group", group_name, "description"]

    def get_address_group_address(self, group_name: str, address: str) -> List[str]:
        """Get command path for adding address to group."""
        return ["firewall", "group", "address-group", group_name, "address", address]

    # ========================================================================
    # IPv6 Address Group Operations
    # ========================================================================

    def get_ipv6_address_group(self, group_name: str) -> List[str]:
        """Get command path for creating IPv6 address group."""
        return ["firewall", "group", "ipv6-address-group", group_name]

    def get_ipv6_address_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting IPv6 address group description."""
        return ["firewall", "group", "ipv6-address-group", group_name, "description", description]

    def get_ipv6_address_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for IPv6 address group description (for deletion)."""
        return ["firewall", "group", "ipv6-address-group", group_name, "description"]

    def get_ipv6_address_group_address(self, group_name: str, address: str) -> List[str]:
        """Get command path for adding IPv6 address to group."""
        return ["firewall", "group", "ipv6-address-group", group_name, "address", address]

    # ========================================================================
    # Network Group Operations (IPv4)
    # ========================================================================

    def get_network_group(self, group_name: str) -> List[str]:
        """Get command path for creating network group."""
        return ["firewall", "group", "network-group", group_name]

    def get_network_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting network group description."""
        return ["firewall", "group", "network-group", group_name, "description", description]

    def get_network_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for network group description (for deletion)."""
        return ["firewall", "group", "network-group", group_name, "description"]

    def get_network_group_network(self, group_name: str, network: str) -> List[str]:
        """Get command path for adding network to group."""
        return ["firewall", "group", "network-group", group_name, "network", network]

    # ========================================================================
    # IPv6 Network Group Operations
    # ========================================================================

    def get_ipv6_network_group(self, group_name: str) -> List[str]:
        """Get command path for creating IPv6 network group."""
        return ["firewall", "group", "ipv6-network-group", group_name]

    def get_ipv6_network_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting IPv6 network group description."""
        return ["firewall", "group", "ipv6-network-group", group_name, "description", description]

    def get_ipv6_network_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for IPv6 network group description (for deletion)."""
        return ["firewall", "group", "ipv6-network-group", group_name, "description"]

    def get_ipv6_network_group_network(self, group_name: str, network: str) -> List[str]:
        """Get command path for adding IPv6 network to group."""
        return ["firewall", "group", "ipv6-network-group", group_name, "network", network]

    # ========================================================================
    # Port Group Operations
    # ========================================================================

    def get_port_group(self, group_name: str) -> List[str]:
        """Get command path for creating port group."""
        return ["firewall", "group", "port-group", group_name]

    def get_port_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting port group description."""
        return ["firewall", "group", "port-group", group_name, "description", description]

    def get_port_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for port group description (for deletion)."""
        return ["firewall", "group", "port-group", group_name, "description"]

    def get_port_group_port(self, group_name: str, port: str) -> List[str]:
        """Get command path for adding port to group."""
        return ["firewall", "group", "port-group", group_name, "port", port]

    # ========================================================================
    # Interface Group Operations
    # ========================================================================

    def get_interface_group(self, group_name: str) -> List[str]:
        """Get command path for creating interface group."""
        return ["firewall", "group", "interface-group", group_name]

    def get_interface_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting interface group description."""
        return ["firewall", "group", "interface-group", group_name, "description", description]

    def get_interface_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for interface group description (for deletion)."""
        return ["firewall", "group", "interface-group", group_name, "description"]

    def get_interface_group_interface(self, group_name: str, interface: str) -> List[str]:
        """Get command path for adding interface to group."""
        return ["firewall", "group", "interface-group", group_name, "interface", interface]

    # ========================================================================
    # MAC Group Operations
    # ========================================================================

    def get_mac_group(self, group_name: str) -> List[str]:
        """Get command path for creating MAC group."""
        return ["firewall", "group", "mac-group", group_name]

    def get_mac_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting MAC group description."""
        return ["firewall", "group", "mac-group", group_name, "description", description]

    def get_mac_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for MAC group description (for deletion)."""
        return ["firewall", "group", "mac-group", group_name, "description"]

    def get_mac_group_mac(self, group_name: str, mac: str) -> List[str]:
        """Get command path for adding MAC address to group."""
        return ["firewall", "group", "mac-group", group_name, "mac-address", mac]
