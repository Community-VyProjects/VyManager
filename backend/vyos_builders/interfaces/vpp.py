"""
VPP Interface Batch Builder

Provides all batch operations for VPP (Vector Packet Processing) interfaces.
VPP is a VyOS 1.5+ only feature supporting:
  bonding, bridge, gre, ipip, loopback, vxlan, xconnect
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class VppInterfaceBuilderMixin:
    """Complete batch builder for all VPP interface types."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "interface_vpp"

    # =========================================================================
    # Core batch helpers
    # =========================================================================

    def add_set(self, path: List[str]) -> "VppInterfaceBuilderMixin":
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "VppInterfaceBuilderMixin":
        self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def operation_count(self) -> int:
        return len(self._operations)

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    def _mapper(self):
        return self.mappers[self.mapper_key]

    # =========================================================================
    # Capabilities
    # =========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v15 = "1.5" in self.version or "latest" in self.version
        return {
            "version": self.version,
            "version_info": {
                "is_1_4": False,
                "is_1_5": is_v15,
            },
            "supported": is_v15,
            "note": "VPP interfaces are only available on VyOS 1.5+",
            "features": {
                "bonding": {
                    "supported": is_v15,
                    "description": "Bond/LAG interfaces (vppbondN)",
                    "naming": "vppbondN",
                    "fields": ["mode", "hash_policy", "mac", "mtu", "addresses", "members", "vif"],
                },
                "bridge": {
                    "supported": is_v15,
                    "description": "Bridge domain interfaces (vppbrN, vppbr0 reserved)",
                    "naming": "vppbrN",
                    "fields": ["description", "members", "bvi"],
                },
                "gre": {
                    "supported": is_v15,
                    "description": "GRE tunnel interfaces (vppgreN)",
                    "naming": "vppgreN",
                    "fields": ["remote", "source_address", "tunnel_type", "key", "addresses", "mtu"],
                    "tunnel_types": ["l3", "teb", "erspan"],
                },
                "ipip": {
                    "supported": is_v15,
                    "description": "IP-in-IP tunnel interfaces (vppipipN)",
                    "naming": "vppipipN",
                    "fields": ["remote", "source_address", "addresses", "mtu"],
                },
                "loopback": {
                    "supported": is_v15,
                    "description": "Loopback interfaces (vpploN)",
                    "naming": "vpploN",
                    "fields": ["addresses", "mtu", "vif"],
                },
                "vxlan": {
                    "supported": is_v15,
                    "description": "VXLAN tunnel interfaces (vppvxlanN)",
                    "naming": "vppvxlanN",
                    "fields": ["remote", "source_address", "vni", "addresses", "mtu"],
                },
                "xconnect": {
                    "supported": is_v15,
                    "description": "Layer 2 cross-connect interfaces (vppxconN)",
                    "naming": "vppxconN",
                    "fields": ["members"],
                },
            },
        }

    # =========================================================================
    # Bonding operations
    # =========================================================================

    def delete_bonding(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding(name))

    def set_bonding_description(self, name: str, description: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bonding_description(name, description))

    def delete_bonding_description(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_description_path(name))

    def set_bonding_disable(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bonding_disable(name))

    def delete_bonding_disable(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_disable(name))

    def set_bonding_mac(self, name: str, mac: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bonding_mac(name, mac))

    def delete_bonding_mac(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_mac_path(name))

    def set_bonding_mtu(self, name: str, mtu: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bonding_mtu(name, mtu))

    def delete_bonding_mtu(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_mtu_path(name))

    def set_bonding_mode(self, name: str, mode: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bonding_mode(name, mode))

    def delete_bonding_mode(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_mode_path(name))

    def set_bonding_hash_policy(self, name: str, policy: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bonding_hash_policy(name, policy))

    def delete_bonding_hash_policy(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_hash_policy_path(name))

    def set_bonding_address(self, name: str, address: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bonding_address(name, address))

    def delete_bonding_address(self, name: str, address: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_address(name, address))

    def delete_bonding_addresses(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_address_path(name))

    def set_bonding_member(self, name: str, member: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bonding_member(name, member))

    def delete_bonding_member(self, name: str, member: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_member(name, member))

    def delete_bonding_members(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_member_path(name))

    def delete_bonding_vif(self, name: str, vlan_id: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_vif(name, vlan_id))

    def set_bonding_vif_address(self, name: str, vlan_id: str, address: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bonding_vif_address(name, vlan_id, address))

    def delete_bonding_vif_address(self, name: str, vlan_id: str, address: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_vif_address(name, vlan_id, address))

    def delete_bonding_vif_addresses(self, name: str, vlan_id: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_vif_address_path(name, vlan_id))

    def set_bonding_vif_description(self, name: str, vlan_id: str, description: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bonding_vif_description(name, vlan_id, description))

    def delete_bonding_vif_description(self, name: str, vlan_id: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_vif_description_path(name, vlan_id))

    def set_bonding_vif_disable(self, name: str, vlan_id: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bonding_vif_disable(name, vlan_id))

    def delete_bonding_vif_disable(self, name: str, vlan_id: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_vif_disable(name, vlan_id))

    def set_bonding_vif_mtu(self, name: str, vlan_id: str, mtu: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bonding_vif_mtu(name, vlan_id, mtu))

    def delete_bonding_vif_mtu(self, name: str, vlan_id: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bonding_vif_mtu_path(name, vlan_id))

    # =========================================================================
    # Bridge operations
    # =========================================================================

    def delete_bridge(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bridge(name))

    def set_bridge_description(self, name: str, description: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bridge_description(name, description))

    def delete_bridge_description(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bridge_description_path(name))

    def set_bridge_member(self, name: str, member: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bridge_member(name, member))

    def delete_bridge_member(self, name: str, member: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bridge_member(name, member))

    def delete_bridge_members(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bridge_member_path(name))

    def set_bridge_member_bvi(self, name: str, member: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_bridge_member_bvi(name, member))

    def delete_bridge_member_bvi(self, name: str, member: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_bridge_member_bvi(name, member))

    # =========================================================================
    # GRE operations
    # =========================================================================

    def delete_gre(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_gre(name))

    def set_gre_description(self, name: str, description: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_gre_description(name, description))

    def delete_gre_description(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_gre_description_path(name))

    def set_gre_disable(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_gre_disable(name))

    def delete_gre_disable(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_gre_disable(name))

    def set_gre_address(self, name: str, address: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_gre_address(name, address))

    def delete_gre_address(self, name: str, address: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_gre_address(name, address))

    def delete_gre_addresses(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_gre_address_path(name))

    def set_gre_mtu(self, name: str, mtu: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_gre_mtu(name, mtu))

    def delete_gre_mtu(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_gre_mtu_path(name))

    def set_gre_remote(self, name: str, remote: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_gre_remote(name, remote))

    def delete_gre_remote(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_gre_remote_path(name))

    def set_gre_source_address(self, name: str, source: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_gre_source_address(name, source))

    def delete_gre_source_address(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_gre_source_address_path(name))

    def set_gre_tunnel_type(self, name: str, tunnel_type: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_gre_tunnel_type(name, tunnel_type))

    def delete_gre_tunnel_type(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_gre_tunnel_type_path(name))

    def set_gre_key(self, name: str, key: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_gre_key(name, key))

    def delete_gre_key(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_gre_key_path(name))

    # =========================================================================
    # IPIP operations
    # =========================================================================

    def delete_ipip(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipip(name))

    def set_ipip_description(self, name: str, description: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipip_description(name, description))

    def delete_ipip_description(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipip_description_path(name))

    def set_ipip_disable(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipip_disable(name))

    def delete_ipip_disable(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipip_disable(name))

    def set_ipip_address(self, name: str, address: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipip_address(name, address))

    def delete_ipip_address(self, name: str, address: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipip_address(name, address))

    def delete_ipip_addresses(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipip_address_path(name))

    def set_ipip_mtu(self, name: str, mtu: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipip_mtu(name, mtu))

    def delete_ipip_mtu(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipip_mtu_path(name))

    def set_ipip_remote(self, name: str, remote: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipip_remote(name, remote))

    def delete_ipip_remote(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipip_remote_path(name))

    def set_ipip_source_address(self, name: str, source: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipip_source_address(name, source))

    def delete_ipip_source_address(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipip_source_address_path(name))

    # =========================================================================
    # Loopback operations
    # =========================================================================

    def delete_loopback(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_loopback(name))

    def set_loopback_description(self, name: str, description: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_loopback_description(name, description))

    def delete_loopback_description(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_loopback_description_path(name))

    def set_loopback_disable(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_loopback_disable(name))

    def delete_loopback_disable(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_loopback_disable(name))

    def set_loopback_address(self, name: str, address: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_loopback_address(name, address))

    def delete_loopback_address(self, name: str, address: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_loopback_address(name, address))

    def delete_loopback_addresses(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_loopback_address_path(name))

    def set_loopback_mtu(self, name: str, mtu: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_loopback_mtu(name, mtu))

    def delete_loopback_mtu(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_loopback_mtu_path(name))

    def delete_loopback_vif(self, name: str, vlan_id: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_loopback_vif(name, vlan_id))

    def set_loopback_vif_address(self, name: str, vlan_id: str, address: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_loopback_vif_address(name, vlan_id, address))

    def delete_loopback_vif_address(self, name: str, vlan_id: str, address: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_loopback_vif_address(name, vlan_id, address))

    def delete_loopback_vif_addresses(self, name: str, vlan_id: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_loopback_vif_address_path(name, vlan_id))

    def set_loopback_vif_description(self, name: str, vlan_id: str, description: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_loopback_vif_description(name, vlan_id, description))

    def delete_loopback_vif_description(self, name: str, vlan_id: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_loopback_vif_description_path(name, vlan_id))

    def set_loopback_vif_disable(self, name: str, vlan_id: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_loopback_vif_disable(name, vlan_id))

    def delete_loopback_vif_disable(self, name: str, vlan_id: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_loopback_vif_disable(name, vlan_id))

    def set_loopback_vif_mtu(self, name: str, vlan_id: str, mtu: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_loopback_vif_mtu(name, vlan_id, mtu))

    def delete_loopback_vif_mtu(self, name: str, vlan_id: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_loopback_vif_mtu_path(name, vlan_id))

    # =========================================================================
    # VXLAN operations
    # =========================================================================

    def delete_vxlan(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vxlan(name))

    def set_vxlan_description(self, name: str, description: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vxlan_description(name, description))

    def delete_vxlan_description(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vxlan_description_path(name))

    def set_vxlan_disable(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vxlan_disable(name))

    def delete_vxlan_disable(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vxlan_disable(name))

    def set_vxlan_address(self, name: str, address: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vxlan_address(name, address))

    def delete_vxlan_address(self, name: str, address: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vxlan_address(name, address))

    def delete_vxlan_addresses(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vxlan_address_path(name))

    def set_vxlan_mtu(self, name: str, mtu: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vxlan_mtu(name, mtu))

    def delete_vxlan_mtu(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vxlan_mtu_path(name))

    def set_vxlan_remote(self, name: str, remote: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vxlan_remote(name, remote))

    def delete_vxlan_remote(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vxlan_remote_path(name))

    def set_vxlan_source_address(self, name: str, source: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vxlan_source_address(name, source))

    def delete_vxlan_source_address(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vxlan_source_address_path(name))

    def set_vxlan_vni(self, name: str, vni: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vxlan_vni(name, vni))

    def delete_vxlan_vni(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vxlan_vni_path(name))

    # =========================================================================
    # XConnect operations
    # =========================================================================

    def delete_xconnect(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_xconnect(name))

    def set_xconnect_description(self, name: str, description: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_xconnect_description(name, description))

    def delete_xconnect_description(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_xconnect_description_path(name))

    def set_xconnect_disable(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_xconnect_disable(name))

    def delete_xconnect_disable(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_xconnect_disable(name))

    def set_xconnect_member(self, name: str, member: str) -> "VppInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_xconnect_member(name, member))

    def delete_xconnect_member(self, name: str, member: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_xconnect_member(name, member))

    def delete_xconnect_members(self, name: str) -> "VppInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_xconnect_member_path(name))
