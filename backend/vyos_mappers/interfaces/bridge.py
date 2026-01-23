"""
Bridge Interface Command Mapper

Handles bridge (L2 switch) interface commands.
Supports STP, member interfaces, and VLAN filtering.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class BridgeInterfaceMapper(BaseFeatureMapper):
    """Bridge interface mapper with all bridge interface operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)
        self.interface_type = "bridge"

    # ========================================================================
    # Command Path Methods (for WRITE operations)
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        """Get command path for creating a bridge interface."""
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

    # Bridge member management
    def get_member_interface(self, interface: str, member: str) -> List[str]:
        """Get command path for adding member interface."""
        return ["interfaces", self.interface_type, interface, "member", "interface", member]

    def get_member_interface_path(self, interface: str) -> List[str]:
        """Get command path for member interfaces (for deletion)."""
        return ["interfaces", self.interface_type, interface, "member", "interface"]

    def get_member_interface_cost(self, interface: str, member: str, cost: str) -> List[str]:
        """Get command path for member interface STP cost."""
        return ["interfaces", self.interface_type, interface, "member", "interface", member, "cost", cost]

    def get_member_interface_priority(self, interface: str, member: str, priority: str) -> List[str]:
        """Get command path for member interface STP priority."""
        return ["interfaces", self.interface_type, interface, "member", "interface", member, "priority", priority]

    # STP settings
    def get_stp(self, interface: str) -> List[str]:
        """Get command path for enabling STP."""
        return ["interfaces", self.interface_type, interface, "stp"]

    def get_stp_path(self, interface: str) -> List[str]:
        """Get command path for STP (for deletion)."""
        return ["interfaces", self.interface_type, interface, "stp"]

    def get_priority(self, interface: str, priority: str) -> List[str]:
        """Get command path for bridge priority."""
        return ["interfaces", self.interface_type, interface, "priority", priority]

    def get_priority_path(self, interface: str) -> List[str]:
        """Get command path for priority (for deletion)."""
        return ["interfaces", self.interface_type, interface, "priority"]

    def get_hello_time(self, interface: str, time: str) -> List[str]:
        """Get command path for STP hello time."""
        return ["interfaces", self.interface_type, interface, "hello-time", time]

    def get_hello_time_path(self, interface: str) -> List[str]:
        """Get command path for hello time (for deletion)."""
        return ["interfaces", self.interface_type, interface, "hello-time"]

    def get_max_age(self, interface: str, age: str) -> List[str]:
        """Get command path for STP max age."""
        return ["interfaces", self.interface_type, interface, "max-age", age]

    def get_max_age_path(self, interface: str) -> List[str]:
        """Get command path for max age (for deletion)."""
        return ["interfaces", self.interface_type, interface, "max-age"]

    def get_forward_delay(self, interface: str, delay: str) -> List[str]:
        """Get command path for STP forward delay."""
        return ["interfaces", self.interface_type, interface, "forwarding-delay", delay]

    def get_forward_delay_path(self, interface: str) -> List[str]:
        """Get command path for forward delay (for deletion)."""
        return ["interfaces", self.interface_type, interface, "forwarding-delay"]

    # VLAN filtering (VLAN-aware bridge)
    def get_vlan_filter(self, interface: str) -> List[str]:
        """Get command path for enabling VLAN filtering."""
        return ["interfaces", self.interface_type, interface, "enable-vlan"]

    def get_vlan_filter_path(self, interface: str) -> List[str]:
        """Get command path for VLAN filtering (for deletion)."""
        return ["interfaces", self.interface_type, interface, "enable-vlan"]

    # MAC address
    def get_mac(self, interface: str, mac: str) -> List[str]:
        """Get command path for setting MAC address."""
        return ["interfaces", self.interface_type, interface, "mac", mac]

    def get_mac_path(self, interface: str) -> List[str]:
        """Get command path for MAC address (for deletion)."""
        return ["interfaces", self.interface_type, interface, "mac"]

    # Aging time
    def get_aging(self, interface: str, time: str) -> List[str]:
        """Get command path for MAC address aging time."""
        return ["interfaces", self.interface_type, interface, "aging", time]

    def get_aging_path(self, interface: str) -> List[str]:
        """Get command path for aging time (for deletion)."""
        return ["interfaces", self.interface_type, interface, "aging"]

    # IGMP snooping
    def get_igmp_snooping(self, interface: str) -> List[str]:
        """Get command path for enabling IGMP snooping."""
        return ["interfaces", self.interface_type, interface, "igmp", "snooping"]

    def get_igmp_querier(self, interface: str) -> List[str]:
        """Get command path for enabling IGMP querier."""
        return ["interfaces", self.interface_type, interface, "igmp", "querier"]

    # VLANs on bridge interface
    def get_vif(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for 802.1q VLAN (vif)."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id]

    def get_vif_address(self, interface: str, vlan_id: str, address: str) -> List[str]:
        """Get command path for vif address."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "address", address]

    def get_vif_description(self, interface: str, vlan_id: str, description: str) -> List[str]:
        """Get command path for vif description."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "description", description]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse a single bridge interface configuration from VyOS.

        Args:
            name: Interface name
            config: Raw interface config dictionary from VyOS

        Returns:
            Parsed interface data as dictionary
        """
        # Parse addresses
        addresses = self._parse_addresses(config)

        # Parse member interfaces
        members = self._parse_members(config)

        # Parse IGMP settings
        igmp = None
        if "igmp" in config:
            igmp_config = config["igmp"]
            igmp = {
                "snooping": "snooping" in igmp_config,
                "querier": "querier" in igmp_config,
            }

        # Parse VIFs
        vifs = self._parse_vif(config)

        return {
            "name": name,
            "type": self.interface_type,
            "addresses": addresses,
            "description": config.get("description"),
            "vrf": config.get("vrf"),
            "mtu": config.get("mtu"),
            "mac": config.get("mac"),
            "disable": "disable" in config,
            # Bridge-specific
            "members": members,
            "stp": "stp" in config,
            "priority": config.get("priority"),
            "hello_time": config.get("hello-time"),
            "max_age": config.get("max-age"),
            "forward_delay": config.get("forwarding-delay"),
            "aging": config.get("aging"),
            "enable_vlan": "enable-vlan" in config,
            "igmp": igmp,
            "vif": vifs,
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

    def _parse_members(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse member interfaces with their STP settings."""
        members = []
        if "member" in config and "interface" in config["member"]:
            member_config = config["member"]["interface"]
            if isinstance(member_config, dict):
                for member_name, member_settings in member_config.items():
                    member_data = {"interface": member_name}
                    if isinstance(member_settings, dict):
                        member_data["cost"] = member_settings.get("cost")
                        member_data["priority"] = member_settings.get("priority")
                    members.append(member_data)
            elif isinstance(member_config, list):
                # Simple list of interfaces without settings
                for member_name in member_config:
                    members.append({"interface": member_name})
        return members

    def _parse_vif(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse VIF (802.1q VLAN) configurations."""
        vif_raw = config.get("vif", {})
        vif_parsed = []
        if vif_raw:
            for vif_id, vif_config in vif_raw.items():
                if isinstance(vif_config, dict):
                    vif_addresses = []
                    if "address" in vif_config:
                        addr = vif_config["address"]
                        if isinstance(addr, list):
                            vif_addresses = addr
                        elif isinstance(addr, str):
                            vif_addresses = [addr]

                    vif_parsed.append({
                        "vlan_id": vif_id,
                        "addresses": vif_addresses,
                        "description": vif_config.get("description"),
                        "mtu": vif_config.get("mtu"),
                        "vrf": vif_config.get("vrf"),
                        "disable": "disable" in vif_config,
                    })
        return vif_parsed if vif_parsed else None

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse all bridge interfaces.

        Args:
            config: Raw config dictionary for bridge interfaces from VyOS

        Returns:
            Dictionary with interfaces list and statistics
        """
        interfaces = []
        by_vrf = {}
        stp_enabled_count = 0

        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue

            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

            # Count by VRF
            if interface.get("vrf"):
                vrf = interface["vrf"]
                by_vrf[vrf] = by_vrf.get(vrf, 0) + 1

            # Count STP enabled
            if interface.get("stp"):
                stp_enabled_count += 1

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
            "by_type": {self.interface_type: len(interfaces)},
            "by_vrf": by_vrf,
            "stp_enabled": stp_enabled_count,
        }
