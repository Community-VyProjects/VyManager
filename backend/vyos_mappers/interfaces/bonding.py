"""
Bonding Interface Command Mapper

Handles bonding (link aggregation) interface commands.
Supports various bonding modes like 802.3ad, balance-rr, active-backup, etc.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class BondingInterfaceMapper(BaseFeatureMapper):
    """Bonding interface mapper with all bonding interface operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)
        self.interface_type = "bonding"

    # ========================================================================
    # Command Path Methods (for WRITE operations)
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        """Get command path for creating a bonding interface."""
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

    # Bonding-specific settings
    def get_mode(self, interface: str, mode: str) -> List[str]:
        """Get command path for bonding mode (802.3ad, balance-rr, etc.)."""
        return ["interfaces", self.interface_type, interface, "mode", mode]

    def get_mode_path(self, interface: str) -> List[str]:
        """Get command path for mode (for deletion)."""
        return ["interfaces", self.interface_type, interface, "mode"]

    def get_member_interface(self, interface: str, member: str) -> List[str]:
        """Get command path for adding member interface."""
        return ["interfaces", self.interface_type, interface, "member", "interface", member]

    def get_member_interface_path(self, interface: str) -> List[str]:
        """Get command path for member interfaces (for deletion)."""
        return ["interfaces", self.interface_type, interface, "member", "interface"]

    def get_hash_policy(self, interface: str, policy: str) -> List[str]:
        """Get command path for hash policy (layer2, layer2+3, layer3+4, encap2+3, encap3+4)."""
        return ["interfaces", self.interface_type, interface, "hash-policy", policy]

    def get_hash_policy_path(self, interface: str) -> List[str]:
        """Get command path for hash policy (for deletion)."""
        return ["interfaces", self.interface_type, interface, "hash-policy"]

    def get_primary(self, interface: str, primary: str) -> List[str]:
        """Get command path for primary interface (for active-backup mode)."""
        return ["interfaces", self.interface_type, interface, "primary", primary]

    def get_primary_path(self, interface: str) -> List[str]:
        """Get command path for primary (for deletion)."""
        return ["interfaces", self.interface_type, interface, "primary"]

    # LACP settings (for 802.3ad mode)
    def get_lacp_rate(self, interface: str, rate: str) -> List[str]:
        """Get command path for LACP rate (slow/fast)."""
        return ["interfaces", self.interface_type, interface, "lacp-rate", rate]

    def get_lacp_rate_path(self, interface: str) -> List[str]:
        """Get command path for LACP rate (for deletion)."""
        return ["interfaces", self.interface_type, interface, "lacp-rate"]

    def get_min_links(self, interface: str, min_links: str) -> List[str]:
        """Get command path for minimum links."""
        return ["interfaces", self.interface_type, interface, "min-links", min_links]

    def get_min_links_path(self, interface: str) -> List[str]:
        """Get command path for min-links (for deletion)."""
        return ["interfaces", self.interface_type, interface, "min-links"]

    # ARP monitoring
    def get_arp_monitor_interval(self, interface: str, interval: str) -> List[str]:
        """Get command path for ARP monitor interval."""
        return ["interfaces", self.interface_type, interface, "arp-monitor", "interval", interval]

    def get_arp_monitor_target(self, interface: str, target: str) -> List[str]:
        """Get command path for ARP monitor target."""
        return ["interfaces", self.interface_type, interface, "arp-monitor", "target", target]

    def get_arp_monitor_path(self, interface: str) -> List[str]:
        """Get command path for ARP monitor (for deletion)."""
        return ["interfaces", self.interface_type, interface, "arp-monitor"]

    # MAC address
    def get_mac(self, interface: str, mac: str) -> List[str]:
        """Get command path for setting MAC address."""
        return ["interfaces", self.interface_type, interface, "mac", mac]

    def get_mac_path(self, interface: str) -> List[str]:
        """Get command path for MAC address (for deletion)."""
        return ["interfaces", self.interface_type, interface, "mac"]

    # VLANs on bonding interface
    def get_vif(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for 802.1q VLAN (vif)."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id]

    def get_vif_address(self, interface: str, vlan_id: str, address: str) -> List[str]:
        """Get command path for vif address."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "address", address]

    def get_vif_description(self, interface: str, vlan_id: str, description: str) -> List[str]:
        """Get command path for vif description."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "description", description]

    def get_vif_mtu(self, interface: str, vlan_id: str, mtu: str) -> List[str]:
        """Get command path for vif MTU."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "mtu", mtu]

    def get_vif_disable(self, interface: str, vlan_id: str) -> List[str]:
        """Get command path for vif disable."""
        return ["interfaces", self.interface_type, interface, "vif", vlan_id, "disable"]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse a single bonding interface configuration from VyOS.

        Args:
            name: Interface name
            config: Raw interface config dictionary from VyOS

        Returns:
            Parsed interface data as dictionary
        """
        # Parse addresses
        addresses = self._parse_addresses(config)

        # Parse member interfaces
        members = []
        if "member" in config and "interface" in config["member"]:
            member_ifaces = config["member"]["interface"]
            if isinstance(member_ifaces, list):
                members = member_ifaces
            elif isinstance(member_ifaces, str):
                members = [member_ifaces]

        # Parse ARP monitor settings
        arp_monitor = None
        if "arp-monitor" in config:
            arp_config = config["arp-monitor"]
            targets = []
            if "target" in arp_config:
                t = arp_config["target"]
                targets = t if isinstance(t, list) else [t]
            arp_monitor = {
                "interval": arp_config.get("interval"),
                "targets": targets,
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
            # Bonding-specific
            "mode": config.get("mode"),
            "hash_policy": config.get("hash-policy"),
            "members": members,
            "primary": config.get("primary"),
            "lacp_rate": config.get("lacp-rate"),
            "min_links": config.get("min-links"),
            "arp_monitor": arp_monitor,
            "vif": vifs,
        }

    def _parse_addresses(self, config: Dict[str, Any]) -> List[str]:
        """Parse addresses (works for all versions)."""
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]
        return addresses

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
        Parse all bonding interfaces.

        Args:
            config: Raw config dictionary for bonding interfaces from VyOS

        Returns:
            Dictionary with interfaces list and statistics
        """
        interfaces = []
        by_vrf = {}
        by_mode = {}

        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue

            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

            # Count by VRF
            if interface.get("vrf"):
                vrf = interface["vrf"]
                by_vrf[vrf] = by_vrf.get(vrf, 0) + 1

            # Count by mode
            if interface.get("mode"):
                mode = interface["mode"]
                by_mode[mode] = by_mode.get(mode, 0) + 1

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
            "by_type": {self.interface_type: len(interfaces)},
            "by_vrf": by_vrf,
            "by_mode": by_mode,
        }
