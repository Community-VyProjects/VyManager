"""
Firewall Groups Command Mapper

Handles firewall group commands for all group types.
Provides command path generation for firewall group operations.
"""

from typing import FrozenSet, List, Optional
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
        self._require_group_type("address-group")
        return ["firewall", "group", "address-group", group_name]

    def get_address_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting address group description."""
        self._require_group_type("address-group")
        return ["firewall", "group", "address-group", group_name, "description", description]

    def get_address_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for address group description (for deletion)."""
        self._require_group_type("address-group")
        return ["firewall", "group", "address-group", group_name, "description"]

    def get_address_group_address(self, group_name: str, address: str) -> List[str]:
        """Get command path for adding address to group."""
        self._require_group_type("address-group")
        return ["firewall", "group", "address-group", group_name, "address", address]

    def get_address_group_include(self, group_name: str, include_group: str) -> List[str]:
        """Get command path for including another address group."""
        self._require_group_type("address-group")
        return ["firewall", "group", "address-group", group_name, "include", include_group]

    # ========================================================================
    # IPv6 Address Group Operations
    # ========================================================================

    def get_ipv6_address_group(self, group_name: str) -> List[str]:
        """Get command path for creating IPv6 address group."""
        self._require_group_type("ipv6-address-group")
        return ["firewall", "group", "ipv6-address-group", group_name]

    def get_ipv6_address_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting IPv6 address group description."""
        self._require_group_type("ipv6-address-group")
        return ["firewall", "group", "ipv6-address-group", group_name, "description", description]

    def get_ipv6_address_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for IPv6 address group description (for deletion)."""
        self._require_group_type("ipv6-address-group")
        return ["firewall", "group", "ipv6-address-group", group_name, "description"]

    def get_ipv6_address_group_address(self, group_name: str, address: str) -> List[str]:
        """Get command path for adding IPv6 address to group."""
        self._require_group_type("ipv6-address-group")
        return ["firewall", "group", "ipv6-address-group", group_name, "address", address]

    def get_ipv6_address_group_include(self, group_name: str, include_group: str) -> List[str]:
        """Get command path for including another IPv6 address group."""
        self._require_group_type("ipv6-address-group")
        return ["firewall", "group", "ipv6-address-group", group_name, "include", include_group]

    # ========================================================================
    # Network Group Operations (IPv4)
    # ========================================================================

    def get_network_group(self, group_name: str) -> List[str]:
        """Get command path for creating network group."""
        self._require_group_type("network-group")
        return ["firewall", "group", "network-group", group_name]

    def get_network_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting network group description."""
        self._require_group_type("network-group")
        return ["firewall", "group", "network-group", group_name, "description", description]

    def get_network_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for network group description (for deletion)."""
        self._require_group_type("network-group")
        return ["firewall", "group", "network-group", group_name, "description"]

    def get_network_group_network(self, group_name: str, network: str) -> List[str]:
        """Get command path for adding network to group."""
        self._require_group_type("network-group")
        return ["firewall", "group", "network-group", group_name, "network", network]

    def get_network_group_include(self, group_name: str, include_group: str) -> List[str]:
        """Get command path for including another network group."""
        self._require_group_type("network-group")
        return ["firewall", "group", "network-group", group_name, "include", include_group]

    # ========================================================================
    # IPv6 Network Group Operations
    # ========================================================================

    def get_ipv6_network_group(self, group_name: str) -> List[str]:
        """Get command path for creating IPv6 network group."""
        self._require_group_type("ipv6-network-group")
        return ["firewall", "group", "ipv6-network-group", group_name]

    def get_ipv6_network_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting IPv6 network group description."""
        self._require_group_type("ipv6-network-group")
        return ["firewall", "group", "ipv6-network-group", group_name, "description", description]

    def get_ipv6_network_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for IPv6 network group description (for deletion)."""
        self._require_group_type("ipv6-network-group")
        return ["firewall", "group", "ipv6-network-group", group_name, "description"]

    def get_ipv6_network_group_network(self, group_name: str, network: str) -> List[str]:
        """Get command path for adding IPv6 network to group."""
        self._require_group_type("ipv6-network-group")
        return ["firewall", "group", "ipv6-network-group", group_name, "network", network]

    def get_ipv6_network_group_include(self, group_name: str, include_group: str) -> List[str]:
        """Get command path for including another IPv6 network group."""
        self._require_group_type("ipv6-network-group")
        return ["firewall", "group", "ipv6-network-group", group_name, "include", include_group]

    # ========================================================================
    # Port Group Operations
    # ========================================================================

    def get_port_group(self, group_name: str) -> List[str]:
        """Get command path for creating port group."""
        self._require_group_type("port-group")
        return ["firewall", "group", "port-group", group_name]

    def get_port_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting port group description."""
        self._require_group_type("port-group")
        return ["firewall", "group", "port-group", group_name, "description", description]

    def get_port_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for port group description (for deletion)."""
        self._require_group_type("port-group")
        return ["firewall", "group", "port-group", group_name, "description"]

    def get_port_group_port(self, group_name: str, port: str) -> List[str]:
        """Get command path for adding port to group."""
        self._require_group_type("port-group")
        return ["firewall", "group", "port-group", group_name, "port", port]

    def get_port_group_include(self, group_name: str, include_group: str) -> List[str]:
        """Get command path for including another port group."""
        self._require_group_type("port-group")
        return ["firewall", "group", "port-group", group_name, "include", include_group]

    # ========================================================================
    # Interface Group Operations
    # ========================================================================

    def get_interface_group(self, group_name: str) -> List[str]:
        """Get command path for creating interface group."""
        self._require_group_type("interface-group")
        return ["firewall", "group", "interface-group", group_name]

    def get_interface_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting interface group description."""
        self._require_group_type("interface-group")
        return ["firewall", "group", "interface-group", group_name, "description", description]

    def get_interface_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for interface group description (for deletion)."""
        self._require_group_type("interface-group")
        return ["firewall", "group", "interface-group", group_name, "description"]

    def get_interface_group_interface(self, group_name: str, interface: str) -> List[str]:
        """Get command path for adding interface to group."""
        self._require_group_type("interface-group")
        return ["firewall", "group", "interface-group", group_name, "interface", interface]

    def get_interface_group_include(self, group_name: str, include_group: str) -> List[str]:
        """Get command path for including another interface group."""
        self._require_group_type("interface-group")
        return ["firewall", "group", "interface-group", group_name, "include", include_group]

    # ========================================================================
    # MAC Group Operations
    # ========================================================================

    def get_mac_group(self, group_name: str) -> List[str]:
        """Get command path for creating MAC group."""
        self._require_group_type("mac-group")
        return ["firewall", "group", "mac-group", group_name]

    def get_mac_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting MAC group description."""
        self._require_group_type("mac-group")
        return ["firewall", "group", "mac-group", group_name, "description", description]

    def get_mac_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for MAC group description (for deletion)."""
        self._require_group_type("mac-group")
        return ["firewall", "group", "mac-group", group_name, "description"]

    def get_mac_group_mac(self, group_name: str, mac: str) -> List[str]:
        """Get command path for adding MAC address to group."""
        self._require_group_type("mac-group")
        return ["firewall", "group", "mac-group", group_name, "mac-address", mac]

    def get_mac_group_include(self, group_name: str, include_group: str) -> List[str]:
        """Get command path for including another MAC group."""
        self._require_group_type("mac-group")
        return ["firewall", "group", "mac-group", group_name, "include", include_group]

    # ========================================================================
    # Versioned group types
    # domain-group exists on 1.4 and 1.5 (validateTmplPath on both lab hosts).
    # remote-group exists only on 1.5. Path methods and capability flags both
    # read this set.
    # ========================================================================

    _GROUP_TYPES_BOTH = frozenset({
        "address-group",
        "ipv6-address-group",
        "network-group",
        "ipv6-network-group",
        "port-group",
        "interface-group",
        "mac-group",
        "domain-group",
    })
    _GROUP_TYPES_V15_ONLY = frozenset({"remote-group"})

    def supported_group_types(self) -> FrozenSet[str]:
        """Group type nodes this device has."""
        if "1.4" in self.version:
            return self._GROUP_TYPES_BOTH
        return self._GROUP_TYPES_BOTH | self._GROUP_TYPES_V15_ONLY

    def _require_group_type(self, group_type: str) -> None:
        if group_type not in self.supported_group_types():
            raise ValueError(
                f"firewall group {group_type} is not supported on this device"
            )

    def get_domain_group(self, group_name: str) -> List[str]:
        """Get command path for creating a domain group."""
        self._require_group_type("domain-group")
        return ["firewall", "group", "domain-group", group_name]

    def get_domain_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting a domain group description."""
        self._require_group_type("domain-group")
        return ["firewall", "group", "domain-group", group_name, "description", description]

    def get_domain_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for a domain group description (for deletion)."""
        self._require_group_type("domain-group")
        return ["firewall", "group", "domain-group", group_name, "description"]

    def get_domain_group_address(self, group_name: str, address: str) -> List[str]:
        """Get command path for adding a domain to a group."""
        self._require_group_type("domain-group")
        return ["firewall", "group", "domain-group", group_name, "address", address]

    def get_remote_group(self, group_name: str) -> List[str]:
        """Get command path for creating a remote group."""
        self._require_group_type("remote-group")
        return ["firewall", "group", "remote-group", group_name]

    def get_remote_group_description(self, group_name: str, description: str) -> List[str]:
        """Get command path for setting a remote group description."""
        self._require_group_type("remote-group")
        return ["firewall", "group", "remote-group", group_name, "description", description]

    def get_remote_group_description_path(self, group_name: str) -> List[str]:
        """Get command path for a remote group description (for deletion)."""
        self._require_group_type("remote-group")
        return ["firewall", "group", "remote-group", group_name, "description"]

    def get_remote_group_url(self, group_name: str, url: str) -> List[str]:
        """Get command path for setting a remote group URL."""
        self._require_group_type("remote-group")
        return ["firewall", "group", "remote-group", group_name, "url", url]

    def get_remote_group_url_path(self, group_name: str, url: Optional[str] = None) -> List[str]:
        """Get command path for a remote group URL (for deletion)."""
        self._require_group_type("remote-group")
        base_path = ["firewall", "group", "remote-group", group_name, "url"]
        if url:
            return base_path + [url]
        return base_path
