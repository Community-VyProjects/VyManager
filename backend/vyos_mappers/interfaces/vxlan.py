"""
VXLAN Interface Command Mapper

Handles VXLAN interface commands for overlay networking.
Supports unicast, multicast, and EVPN-based VXLAN configurations.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class VXLANInterfaceMapper(BaseFeatureMapper):
    """VXLAN interface mapper with all VXLAN interface operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)
        self.interface_type = "vxlan"

    # ========================================================================
    # Command Path Methods (for WRITE operations)
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        """Get command path for creating a VXLAN interface."""
        return ["interfaces", self.interface_type, interface]

    def get_description(self, interface: str, description: str) -> List[str]:
        """Get command path for setting interface description."""
        return ["interfaces", self.interface_type, interface, "description", description]

    def get_description_path(self, interface: str) -> List[str]:
        """Get command path for description property (for deletion)."""
        return ["interfaces", self.interface_type, interface, "description"]

    def get_address(self, interface: str, address: str) -> List[str]:
        """Get command path for setting interface address."""
        return ["interfaces", self.interface_type, interface, "address", address]

    def get_mtu(self, interface: str, mtu: str) -> List[str]:
        """Get command path for setting interface MTU."""
        return ["interfaces", self.interface_type, interface, "mtu", mtu]

    def get_mtu_path(self, interface: str) -> List[str]:
        """Get command path for MTU property (for deletion)."""
        return ["interfaces", self.interface_type, interface, "mtu"]

    def get_disable(self, interface: str) -> List[str]:
        """Get command path for disabling an interface."""
        return ["interfaces", self.interface_type, interface, "disable"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        """Get command path for assigning interface to VRF."""
        return ["interfaces", self.interface_type, interface, "vrf", vrf]

    def get_vrf_path(self, interface: str) -> List[str]:
        """Get command path for VRF (for deletion)."""
        return ["interfaces", self.interface_type, interface, "vrf"]

    # ========================================================================
    # VXLAN-specific settings
    # ========================================================================

    def get_vni(self, interface: str, vni: str) -> List[str]:
        """Get command path for VXLAN Network Identifier (VNI)."""
        return ["interfaces", self.interface_type, interface, "vni", vni]

    def get_vni_path(self, interface: str) -> List[str]:
        """Get command path for VNI (for deletion)."""
        return ["interfaces", self.interface_type, interface, "vni"]

    def get_port(self, interface: str, port: str) -> List[str]:
        """Get command path for UDP port (default 8472, standard is 4789)."""
        return ["interfaces", self.interface_type, interface, "port", port]

    def get_port_path(self, interface: str) -> List[str]:
        """Get command path for port (for deletion)."""
        return ["interfaces", self.interface_type, interface, "port"]

    def get_source_address(self, interface: str, address: str) -> List[str]:
        """Get command path for source IP address (underlay)."""
        return ["interfaces", self.interface_type, interface, "source-address", address]

    def get_source_address_path(self, interface: str) -> List[str]:
        """Get command path for source address (for deletion)."""
        return ["interfaces", self.interface_type, interface, "source-address"]

    def get_source_interface(self, interface: str, source_if: str) -> List[str]:
        """Get command path for source interface."""
        return ["interfaces", self.interface_type, interface, "source-interface", source_if]

    def get_source_interface_path(self, interface: str) -> List[str]:
        """Get command path for source interface (for deletion)."""
        return ["interfaces", self.interface_type, interface, "source-interface"]

    def get_remote(self, interface: str, remote: str) -> List[str]:
        """Get command path for remote VTEP address (unicast mode)."""
        return ["interfaces", self.interface_type, interface, "remote", remote]

    def get_remote_path(self, interface: str) -> List[str]:
        """Get command path for remote (for deletion)."""
        return ["interfaces", self.interface_type, interface, "remote"]

    def get_group(self, interface: str, group: str) -> List[str]:
        """Get command path for multicast group address."""
        return ["interfaces", self.interface_type, interface, "group", group]

    def get_group_path(self, interface: str) -> List[str]:
        """Get command path for group (for deletion)."""
        return ["interfaces", self.interface_type, interface, "group"]

    def get_gpe(self, interface: str) -> List[str]:
        """Get command path for Generic Protocol Extension."""
        return ["interfaces", self.interface_type, interface, "gpe"]

    # ========================================================================
    # VXLAN Parameters (for EVPN/external control plane)
    # ========================================================================

    def get_external(self, interface: str) -> List[str]:
        """Get command path for external control plane (BGP L2VPN/EVPN)."""
        return ["interfaces", self.interface_type, interface, "parameters", "external"]

    def get_nolearning(self, interface: str) -> List[str]:
        """Get command path for disabling FDB learning."""
        return ["interfaces", self.interface_type, interface, "parameters", "nolearning"]

    def get_neighbor_suppress(self, interface: str) -> List[str]:
        """Get command path for ARP/ND suppression."""
        return ["interfaces", self.interface_type, interface, "parameters", "neighbor-suppress"]

    def get_vni_filter(self, interface: str) -> List[str]:
        """Get command path for VNI filtering."""
        return ["interfaces", self.interface_type, interface, "parameters", "vni-filter"]

    # ========================================================================
    # Single VXLAN Device (SVD) - VLAN-to-VNI Mapping
    # ========================================================================

    def get_vlan_to_vni(self, interface: str, vlan: str, vni: str) -> List[str]:
        """Get command path for VLAN-to-VNI mapping (SVD mode)."""
        return ["interfaces", self.interface_type, interface, "vlan-to-vni", vlan, "vni", vni]

    def get_vlan_to_vni_path(self, interface: str, vlan: str) -> List[str]:
        """Get command path for VLAN-to-VNI (for deletion)."""
        return ["interfaces", self.interface_type, interface, "vlan-to-vni", vlan]

    # ========================================================================
    # IP Settings
    # ========================================================================

    def get_ip_adjust_mss(self, interface: str, mss: str) -> List[str]:
        """Get command path for TCP MSS adjustment."""
        return ["interfaces", self.interface_type, interface, "ip", "adjust-mss", mss]

    def get_ip_arp_cache_timeout(self, interface: str, timeout: str) -> List[str]:
        """Get command path for ARP cache timeout."""
        return ["interfaces", self.interface_type, interface, "ip", "arp-cache-timeout", timeout]

    def get_ip_disable_arp_filter(self, interface: str) -> List[str]:
        """Get command path for disabling ARP filter."""
        return ["interfaces", self.interface_type, interface, "ip", "disable-arp-filter"]

    def get_ip_disable_forwarding(self, interface: str) -> List[str]:
        """Get command path for disabling IP forwarding."""
        return ["interfaces", self.interface_type, interface, "ip", "disable-forwarding"]

    def get_ipv6_disable_forwarding(self, interface: str) -> List[str]:
        """Get command path for disabling IPv6 forwarding."""
        return ["interfaces", self.interface_type, interface, "ipv6", "disable-forwarding"]

    # MAC address
    def get_mac(self, interface: str, mac: str) -> List[str]:
        """Get command path for custom MAC address."""
        return ["interfaces", self.interface_type, interface, "mac", mac]

    def get_mac_path(self, interface: str) -> List[str]:
        """Get command path for MAC address (for deletion)."""
        return ["interfaces", self.interface_type, interface, "mac"]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse a single VXLAN interface configuration from VyOS.

        Args:
            name: Interface name
            config: Raw interface config dictionary from VyOS

        Returns:
            Parsed interface data as dictionary
        """
        # Parse addresses
        addresses = self._parse_addresses(config)

        # Parse parameters
        params = config.get("parameters", {})

        # Parse VLAN-to-VNI mappings
        vlan_to_vni = self._parse_vlan_to_vni(config)

        # Handle remote - can be string or list in VyOS
        remote = config.get("remote")
        if isinstance(remote, list):
            remote = remote[0] if remote else None

        # Handle group - can be string or list in VyOS
        group = config.get("group")
        if isinstance(group, list):
            group = group[0] if group else None

        return {
            "name": name,
            "type": self.interface_type,
            "addresses": addresses,
            "description": config.get("description"),
            "vrf": config.get("vrf"),
            "mtu": config.get("mtu"),
            "mac": config.get("mac"),
            "disable": "disable" in config,
            # VXLAN-specific
            "vni": config.get("vni"),
            "port": config.get("port"),
            "source_address": config.get("source-address"),
            "source_interface": config.get("source-interface"),
            "remote": remote,
            "group": group,
            "gpe": "gpe" in config,
            # Parameters
            "external": "external" in params if isinstance(params, dict) else False,
            "nolearning": "nolearning" in params if isinstance(params, dict) else False,
            "neighbor_suppress": "neighbor-suppress" in params if isinstance(params, dict) else False,
            "vni_filter": "vni-filter" in params if isinstance(params, dict) else False,
            # SVD mappings
            "vlan_to_vni": vlan_to_vni,
            # IP settings
            "ip_disable_forwarding": "disable-forwarding" in config.get("ip", {}) if isinstance(config.get("ip"), dict) else False,
            "ipv6_disable_forwarding": "disable-forwarding" in config.get("ipv6", {}) if isinstance(config.get("ipv6"), dict) else False,
        }

    def _parse_addresses(self, config: Dict[str, Any]) -> List[str]:
        """Parse addresses."""
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]
        return addresses

    def _parse_vlan_to_vni(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse VLAN-to-VNI mappings for SVD."""
        mappings = []
        vlan_to_vni = config.get("vlan-to-vni", {})
        if isinstance(vlan_to_vni, dict):
            for vlan, vlan_data in vlan_to_vni.items():
                if isinstance(vlan_data, dict):
                    mappings.append({
                        "vlan": vlan,
                        "vni": vlan_data.get("vni"),
                    })
        return mappings

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse all VXLAN interfaces.

        Args:
            config: Raw config dictionary for VXLAN interfaces from VyOS

        Returns:
            Dictionary with interfaces list and statistics
        """
        interfaces = []
        by_vrf = {}
        by_mode = {"unicast": 0, "multicast": 0, "evpn": 0}

        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue

            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

            # Count by VRF
            if interface.get("vrf"):
                vrf = interface["vrf"]
                by_vrf[vrf] = by_vrf.get(vrf, 0) + 1

            # Determine mode
            if interface.get("external"):
                by_mode["evpn"] += 1
            elif interface.get("group"):
                by_mode["multicast"] += 1
            elif interface.get("remote"):
                by_mode["unicast"] += 1

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
            "by_type": {self.interface_type: len(interfaces)},
            "by_vrf": by_vrf,
            "by_mode": by_mode,
        }
