"""
VLAN Interface Command Mapper

Handles VLAN (802.1q) sub-interface commands.
VLANs can be configured on ethernet, bonding, and bridge interfaces.
Supports both standard VLANs (vif) and QinQ (vif-s/vif-c).
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class VLANInterfaceMapper(BaseFeatureMapper):
    """VLAN interface mapper for 802.1q VLAN sub-interfaces"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Standard VLAN (vif) Command Paths
    # ========================================================================

    def get_vif(self, parent_type: str, parent: str, vlan_id: str) -> List[str]:
        """Get command path for creating a VLAN sub-interface."""
        return ["interfaces", parent_type, parent, "vif", vlan_id]

    def get_vif_address(self, parent_type: str, parent: str, vlan_id: str, address: str) -> List[str]:
        """Get command path for setting VLAN address."""
        return ["interfaces", parent_type, parent, "vif", vlan_id, "address", address]

    def get_vif_description(self, parent_type: str, parent: str, vlan_id: str, description: str) -> List[str]:
        """Get command path for setting VLAN description."""
        return ["interfaces", parent_type, parent, "vif", vlan_id, "description", description]

    def get_vif_description_path(self, parent_type: str, parent: str, vlan_id: str) -> List[str]:
        """Get command path for VLAN description (for deletion)."""
        return ["interfaces", parent_type, parent, "vif", vlan_id, "description"]

    def get_vif_mtu(self, parent_type: str, parent: str, vlan_id: str, mtu: str) -> List[str]:
        """Get command path for setting VLAN MTU."""
        return ["interfaces", parent_type, parent, "vif", vlan_id, "mtu", mtu]

    def get_vif_mtu_path(self, parent_type: str, parent: str, vlan_id: str) -> List[str]:
        """Get command path for VLAN MTU (for deletion)."""
        return ["interfaces", parent_type, parent, "vif", vlan_id, "mtu"]

    def get_vif_disable(self, parent_type: str, parent: str, vlan_id: str) -> List[str]:
        """Get command path for disabling VLAN."""
        return ["interfaces", parent_type, parent, "vif", vlan_id, "disable"]

    def get_vif_vrf(self, parent_type: str, parent: str, vlan_id: str, vrf: str) -> List[str]:
        """Get command path for assigning VLAN to VRF."""
        return ["interfaces", parent_type, parent, "vif", vlan_id, "vrf", vrf]

    def get_vif_vrf_path(self, parent_type: str, parent: str, vlan_id: str) -> List[str]:
        """Get command path for VLAN VRF (for deletion)."""
        return ["interfaces", parent_type, parent, "vif", vlan_id, "vrf"]

    def get_vif_mac(self, parent_type: str, parent: str, vlan_id: str, mac: str) -> List[str]:
        """Get command path for setting VLAN MAC address."""
        return ["interfaces", parent_type, parent, "vif", vlan_id, "mac", mac]

    def get_vif_mac_path(self, parent_type: str, parent: str, vlan_id: str) -> List[str]:
        """Get command path for VLAN MAC (for deletion)."""
        return ["interfaces", parent_type, parent, "vif", vlan_id, "mac"]

    # DHCP options
    def get_vif_dhcp(self, parent_type: str, parent: str, vlan_id: str) -> List[str]:
        """Get command path for DHCP on VLAN."""
        return ["interfaces", parent_type, parent, "vif", vlan_id, "address", "dhcp"]

    def get_vif_dhcpv6(self, parent_type: str, parent: str, vlan_id: str) -> List[str]:
        """Get command path for DHCPv6 on VLAN."""
        return ["interfaces", parent_type, parent, "vif", vlan_id, "address", "dhcpv6"]

    # ========================================================================
    # QinQ Service VLAN (vif-s) Command Paths
    # ========================================================================

    def get_vif_s(self, parent_type: str, parent: str, vlan_id: str) -> List[str]:
        """Get command path for creating a QinQ service VLAN."""
        return ["interfaces", parent_type, parent, "vif-s", vlan_id]

    def get_vif_s_address(self, parent_type: str, parent: str, vlan_id: str, address: str) -> List[str]:
        """Get command path for setting vif-s address."""
        return ["interfaces", parent_type, parent, "vif-s", vlan_id, "address", address]

    def get_vif_s_description(self, parent_type: str, parent: str, vlan_id: str, description: str) -> List[str]:
        """Get command path for setting vif-s description."""
        return ["interfaces", parent_type, parent, "vif-s", vlan_id, "description", description]

    def get_vif_s_description_path(self, parent_type: str, parent: str, vlan_id: str) -> List[str]:
        """Get command path for vif-s description (for deletion)."""
        return ["interfaces", parent_type, parent, "vif-s", vlan_id, "description"]

    def get_vif_s_mtu(self, parent_type: str, parent: str, vlan_id: str, mtu: str) -> List[str]:
        """Get command path for setting vif-s MTU."""
        return ["interfaces", parent_type, parent, "vif-s", vlan_id, "mtu", mtu]

    def get_vif_s_disable(self, parent_type: str, parent: str, vlan_id: str) -> List[str]:
        """Get command path for disabling vif-s."""
        return ["interfaces", parent_type, parent, "vif-s", vlan_id, "disable"]

    def get_vif_s_vrf(self, parent_type: str, parent: str, vlan_id: str, vrf: str) -> List[str]:
        """Get command path for assigning vif-s to VRF."""
        return ["interfaces", parent_type, parent, "vif-s", vlan_id, "vrf", vrf]

    # ========================================================================
    # QinQ Customer VLAN (vif-c) Command Paths
    # ========================================================================

    def get_vif_c(self, parent_type: str, parent: str, s_vlan: str, c_vlan: str) -> List[str]:
        """Get command path for creating a QinQ customer VLAN."""
        return ["interfaces", parent_type, parent, "vif-s", s_vlan, "vif-c", c_vlan]

    def get_vif_c_address(self, parent_type: str, parent: str, s_vlan: str, c_vlan: str, address: str) -> List[str]:
        """Get command path for setting vif-c address."""
        return ["interfaces", parent_type, parent, "vif-s", s_vlan, "vif-c", c_vlan, "address", address]

    def get_vif_c_description(self, parent_type: str, parent: str, s_vlan: str, c_vlan: str, description: str) -> List[str]:
        """Get command path for setting vif-c description."""
        return ["interfaces", parent_type, parent, "vif-s", s_vlan, "vif-c", c_vlan, "description", description]

    def get_vif_c_mtu(self, parent_type: str, parent: str, s_vlan: str, c_vlan: str, mtu: str) -> List[str]:
        """Get command path for setting vif-c MTU."""
        return ["interfaces", parent_type, parent, "vif-s", s_vlan, "vif-c", c_vlan, "mtu", mtu]

    def get_vif_c_disable(self, parent_type: str, parent: str, s_vlan: str, c_vlan: str) -> List[str]:
        """Get command path for disabling vif-c."""
        return ["interfaces", parent_type, parent, "vif-s", s_vlan, "vif-c", c_vlan, "disable"]

    def get_vif_c_vrf(self, parent_type: str, parent: str, s_vlan: str, c_vlan: str, vrf: str) -> List[str]:
        """Get command path for assigning vif-c to VRF."""
        return ["interfaces", parent_type, parent, "vif-s", s_vlan, "vif-c", c_vlan, "vrf", vrf]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_all_vlans(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse all VLANs from all interface types.

        Args:
            full_config: Full VyOS config with 'interfaces' key

        Returns:
            Dictionary with all VLANs and statistics
        """
        interfaces_config = full_config.get("interfaces", {})
        vlans = []
        by_parent_type = {}
        by_vrf = {}

        # Supported parent interface types
        parent_types = ["ethernet", "bonding", "bridge"]

        for parent_type in parent_types:
            type_config = interfaces_config.get(parent_type, {})
            for parent_name, parent_config in type_config.items():
                if not isinstance(parent_config, dict):
                    continue

                # Parse standard VLANs (vif)
                vif_config = parent_config.get("vif", {})
                for vlan_id, vlan_config in vif_config.items():
                    if isinstance(vlan_config, dict):
                        vlan = self._parse_vlan(
                            parent_type, parent_name, vlan_id, vlan_config, "vif"
                        )
                        vlans.append(vlan)

                        # Statistics
                        by_parent_type[parent_type] = by_parent_type.get(parent_type, 0) + 1
                        if vlan.get("vrf"):
                            by_vrf[vlan["vrf"]] = by_vrf.get(vlan["vrf"], 0) + 1

                # Parse QinQ service VLANs (vif-s)
                vif_s_config = parent_config.get("vif-s", {})
                for s_vlan_id, s_vlan_config in vif_s_config.items():
                    if isinstance(s_vlan_config, dict):
                        # Service VLAN itself
                        s_vlan = self._parse_vlan(
                            parent_type, parent_name, s_vlan_id, s_vlan_config, "vif-s"
                        )
                        vlans.append(s_vlan)
                        by_parent_type[parent_type] = by_parent_type.get(parent_type, 0) + 1

                        # Customer VLANs (vif-c) under this service VLAN
                        vif_c_config = s_vlan_config.get("vif-c", {})
                        for c_vlan_id, c_vlan_config in vif_c_config.items():
                            if isinstance(c_vlan_config, dict):
                                c_vlan = self._parse_vlan(
                                    parent_type, parent_name, c_vlan_id, c_vlan_config, "vif-c",
                                    s_vlan_id=s_vlan_id
                                )
                                vlans.append(c_vlan)
                                by_parent_type[parent_type] = by_parent_type.get(parent_type, 0) + 1

        return {
            "vlans": vlans,
            "total": len(vlans),
            "by_parent_type": by_parent_type,
            "by_vrf": by_vrf,
        }

    def _parse_vlan(
        self,
        parent_type: str,
        parent_name: str,
        vlan_id: str,
        config: Dict[str, Any],
        vlan_type: str,
        s_vlan_id: str = None
    ) -> Dict[str, Any]:
        """Parse a single VLAN configuration."""
        # Parse addresses
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]

        # Build full name
        if vlan_type == "vif":
            full_name = f"{parent_name}.{vlan_id}"
        elif vlan_type == "vif-s":
            full_name = f"{parent_name}.{vlan_id}s"
        else:  # vif-c
            full_name = f"{parent_name}.{s_vlan_id}s.{vlan_id}c"

        return {
            "name": full_name,
            "vlan_id": vlan_id,
            "vlan_type": vlan_type,
            "parent_type": parent_type,
            "parent_interface": parent_name,
            "s_vlan_id": s_vlan_id,  # Only for vif-c
            "addresses": addresses,
            "description": config.get("description"),
            "mtu": config.get("mtu"),
            "mac": config.get("mac"),
            "vrf": config.get("vrf"),
            "disable": "disable" in config,
        }
