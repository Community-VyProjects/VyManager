"""
NHRP Batch Builder

Generates VyOS set/delete operations for the NHRP protocol.

VyOS 1.4 and 1.5 have significant structural differences:
- Authentication: cisco-authentication (1.4) vs authentication (1.5)
- Hold time: holding-time (1.4) vs holdtime (1.5)
- Map: flat map {ip}/nbma-address (1.4) vs map/tunnel-ip/{ip}/nbma (1.5)
- 1.4-only: dynamic-map, non-caching, shortcut-destination, shortcut-target
- 1.5-only: nhs, mtu, network-id, registration-no-unique

Multi-argument batch operations encode compound values as "arg1,arg2"
(comma-separated), matching the project's standard batch dispatch pattern.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class NhrpBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["nhrp"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "NhrpBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "NhrpBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "nhrp": {
                    "supported": True,
                    "description": "Next Hop Resolution Protocol (NHRP)",
                },
                "authentication": {
                    "supported": True,
                    "description": "NHRP authentication passphrase",
                },
                "holding_time": {
                    "supported": True,
                    "description": "NHRP holding time in seconds",
                },
                "map": {
                    "supported": True,
                    "description": "Static NHRP tunnel-to-NBMA mappings",
                },
                "map_cisco": {
                    "supported": is_1_4,
                    "description": "Cisco IOS peer flag on static map (VyOS 1.4 only)",
                },
                "map_register": {
                    "supported": is_1_4,
                    "description": "Send registration request on startup (VyOS 1.4 only)",
                },
                "dynamic_map": {
                    "supported": is_1_4,
                    "description": "Dynamic map with NBMA domain name (VyOS 1.4 only)",
                },
                "nhs": {
                    "supported": is_1_5,
                    "description": "Next Hop Server configuration (VyOS 1.5+)",
                },
                "mtu": {
                    "supported": is_1_5,
                    "description": "Maximum Transmission Unit (VyOS 1.5+)",
                },
                "network_id": {
                    "supported": is_1_5,
                    "description": "NHRP network identifier (VyOS 1.5+)",
                },
                "registration_no_unique": {
                    "supported": is_1_5,
                    "description": "Don't set unique flag (VyOS 1.5+)",
                },
                "multicast": {
                    "supported": True,
                    "description": "Multicast NBMA mapping",
                },
                "redirect": {
                    "supported": True,
                    "description": "Cisco style NHRP Traffic Indication packets",
                },
                "shortcut": {
                    "supported": True,
                    "description": "Shortcut route creation via NHRP",
                },
                "non_caching": {
                    "supported": is_1_4,
                    "description": "Reduce memory on large NBMA subnets (VyOS 1.4 only)",
                },
                "shortcut_destination": {
                    "supported": is_1_4,
                    "description": "Reply with authoritative answers on resolution requests (VyOS 1.4 only)",
                },
                "shortcut_target": {
                    "supported": is_1_4,
                    "description": "Off-NBMA network prefix gateway (VyOS 1.4 only)",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Delete entire NHRP config or a tunnel
    # -----------------------------------------------------------------------

    def delete_nhrp(self) -> "NhrpBatchBuilder":
        return self.add_delete(self.m.get_nhrp_path())

    def set_tunnel(self, tunnel: str) -> "NhrpBatchBuilder":
        return self.add_set(self.m.get_tunnel_path(tunnel))

    def delete_tunnel(self, tunnel: str) -> "NhrpBatchBuilder":
        return self.add_delete(self.m.get_tunnel_path(tunnel))

    # -----------------------------------------------------------------------
    # Authentication (version-aware via mapper)
    # -----------------------------------------------------------------------

    def set_authentication(self, tunnel: str, value: str) -> "NhrpBatchBuilder":
        return self.add_set(self.m.get_authentication_path(tunnel, value))

    def delete_authentication(self, tunnel: str) -> "NhrpBatchBuilder":
        return self.add_delete(self.m.get_authentication_base_path(tunnel))

    # -----------------------------------------------------------------------
    # Holding time (version-aware via mapper)
    # -----------------------------------------------------------------------

    def set_holding_time(self, tunnel: str, value: str) -> "NhrpBatchBuilder":
        return self.add_set(self.m.get_holding_time_path(tunnel, value))

    def delete_holding_time(self, tunnel: str) -> "NhrpBatchBuilder":
        return self.add_delete(self.m.get_holding_time_base_path(tunnel))

    # -----------------------------------------------------------------------
    # Map (version-aware via mapper)
    # -----------------------------------------------------------------------

    def set_map(self, tunnel: str, tunnel_ip: str) -> "NhrpBatchBuilder":
        return self.add_set(self.m.get_map_path(tunnel, tunnel_ip))

    def delete_map(self, tunnel: str, tunnel_ip: str) -> "NhrpBatchBuilder":
        return self.add_delete(self.m.get_map_path(tunnel, tunnel_ip))

    def set_map_nbma(self, tunnel: str, tunnel_ip: str, nbma: str) -> "NhrpBatchBuilder":
        return self.add_set(self.m.get_map_nbma_path(tunnel, tunnel_ip, nbma))

    def delete_map_nbma(self, tunnel: str, tunnel_ip: str) -> "NhrpBatchBuilder":
        return self.add_delete(self.m.get_map_nbma_base_path(tunnel, tunnel_ip))

    # -----------------------------------------------------------------------
    # Map cisco flag — VyOS 1.4 only
    # -----------------------------------------------------------------------

    def set_map_cisco(self, tunnel: str, tunnel_ip: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_set(self.m.get_map_cisco_path(tunnel, tunnel_ip))

    def delete_map_cisco(self, tunnel: str, tunnel_ip: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_delete(self.m.get_map_cisco_path(tunnel, tunnel_ip))

    # -----------------------------------------------------------------------
    # Map register flag — VyOS 1.4 only
    # -----------------------------------------------------------------------

    def set_map_register(self, tunnel: str, tunnel_ip: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_set(self.m.get_map_register_path(tunnel, tunnel_ip))

    def delete_map_register(self, tunnel: str, tunnel_ip: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_delete(self.m.get_map_register_path(tunnel, tunnel_ip))

    # -----------------------------------------------------------------------
    # Dynamic map — VyOS 1.4 only
    # -----------------------------------------------------------------------

    def set_dynamic_map(self, tunnel: str, network: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_set(self.m.get_dynamic_map_path(tunnel, network))

    def delete_dynamic_map(self, tunnel: str, network: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_delete(self.m.get_dynamic_map_path(tunnel, network))

    def set_dynamic_map_nbma_domain(self, tunnel: str, network: str, fqdn: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_set(self.m.get_dynamic_map_nbma_domain_path(tunnel, network, fqdn))

    def delete_dynamic_map_nbma_domain(self, tunnel: str, network: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_delete(self.m.get_dynamic_map_nbma_domain_base_path(tunnel, network))

    # -----------------------------------------------------------------------
    # NHS — VyOS 1.5 only
    # -----------------------------------------------------------------------

    def set_nhs(self, tunnel: str, tunnel_ip: str) -> "NhrpBatchBuilder":
        """VyOS 1.5 only."""
        return self.add_set(self.m.get_nhs_path(tunnel, tunnel_ip))

    def delete_nhs(self, tunnel: str, tunnel_ip: str) -> "NhrpBatchBuilder":
        """VyOS 1.5 only."""
        return self.add_delete(self.m.get_nhs_path(tunnel, tunnel_ip))

    def set_nhs_nbma(self, tunnel: str, tunnel_ip: str, nbma: str) -> "NhrpBatchBuilder":
        """VyOS 1.5 only."""
        return self.add_set(self.m.get_nhs_nbma_path(tunnel, tunnel_ip, nbma))

    def delete_nhs_nbma(self, tunnel: str, tunnel_ip: str, nbma: str) -> "NhrpBatchBuilder":
        """VyOS 1.5 only."""
        return self.add_delete(self.m.get_nhs_nbma_path(tunnel, tunnel_ip, nbma))

    def delete_nhs_all_nbma(self, tunnel: str, tunnel_ip: str) -> "NhrpBatchBuilder":
        """VyOS 1.5 only. Delete all NBMA addresses for an NHS entry."""
        return self.add_delete(self.m.get_nhs_nbma_base_path(tunnel, tunnel_ip))

    def delete_all_nhs(self, tunnel: str) -> "NhrpBatchBuilder":
        """VyOS 1.5 only. Delete all NHS entries."""
        return self.add_delete(self.m.get_nhs_base_path(tunnel))

    # -----------------------------------------------------------------------
    # MTU — VyOS 1.5 only
    # -----------------------------------------------------------------------

    def set_mtu(self, tunnel: str, value: str) -> "NhrpBatchBuilder":
        """VyOS 1.5 only."""
        return self.add_set(self.m.get_mtu_path(tunnel, value))

    def delete_mtu(self, tunnel: str) -> "NhrpBatchBuilder":
        """VyOS 1.5 only."""
        return self.add_delete(self.m.get_mtu_base_path(tunnel))

    # -----------------------------------------------------------------------
    # Network ID — VyOS 1.5 only
    # -----------------------------------------------------------------------

    def set_network_id(self, tunnel: str, value: str) -> "NhrpBatchBuilder":
        """VyOS 1.5 only."""
        return self.add_set(self.m.get_network_id_path(tunnel, value))

    def delete_network_id(self, tunnel: str) -> "NhrpBatchBuilder":
        """VyOS 1.5 only."""
        return self.add_delete(self.m.get_network_id_base_path(tunnel))

    # -----------------------------------------------------------------------
    # Registration no-unique — VyOS 1.5 only
    # -----------------------------------------------------------------------

    def set_registration_no_unique(self, tunnel: str) -> "NhrpBatchBuilder":
        """VyOS 1.5 only."""
        return self.add_set(self.m.get_registration_no_unique_path(tunnel))

    def delete_registration_no_unique(self, tunnel: str) -> "NhrpBatchBuilder":
        """VyOS 1.5 only."""
        return self.add_delete(self.m.get_registration_no_unique_path(tunnel))

    # -----------------------------------------------------------------------
    # Multicast (both versions, but value semantics differ)
    # -----------------------------------------------------------------------

    def set_multicast(self, tunnel: str, value: str) -> "NhrpBatchBuilder":
        return self.add_set(self.m.get_multicast_path(tunnel, value))

    def delete_multicast(self, tunnel: str, value: str) -> "NhrpBatchBuilder":
        return self.add_delete(self.m.get_multicast_path(tunnel, value))

    def delete_all_multicast(self, tunnel: str) -> "NhrpBatchBuilder":
        return self.add_delete(self.m.get_multicast_base_path(tunnel))

    # -----------------------------------------------------------------------
    # Common flags (both versions)
    # -----------------------------------------------------------------------

    def set_redirect(self, tunnel: str) -> "NhrpBatchBuilder":
        return self.add_set(self.m.get_redirect_path(tunnel))

    def delete_redirect(self, tunnel: str) -> "NhrpBatchBuilder":
        return self.add_delete(self.m.get_redirect_path(tunnel))

    def set_shortcut(self, tunnel: str) -> "NhrpBatchBuilder":
        return self.add_set(self.m.get_shortcut_path(tunnel))

    def delete_shortcut(self, tunnel: str) -> "NhrpBatchBuilder":
        return self.add_delete(self.m.get_shortcut_path(tunnel))

    # -----------------------------------------------------------------------
    # Non-caching — VyOS 1.4 only
    # -----------------------------------------------------------------------

    def set_non_caching(self, tunnel: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_set(self.m.get_non_caching_path(tunnel))

    def delete_non_caching(self, tunnel: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_delete(self.m.get_non_caching_path(tunnel))

    # -----------------------------------------------------------------------
    # Shortcut destination — VyOS 1.4 only
    # -----------------------------------------------------------------------

    def set_shortcut_destination(self, tunnel: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_set(self.m.get_shortcut_destination_path(tunnel))

    def delete_shortcut_destination(self, tunnel: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_delete(self.m.get_shortcut_destination_path(tunnel))

    # -----------------------------------------------------------------------
    # Shortcut target — VyOS 1.4 only
    # -----------------------------------------------------------------------

    def set_shortcut_target(self, tunnel: str, target: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_set(self.m.get_shortcut_target_path(tunnel, target))

    def delete_shortcut_target(self, tunnel: str, target: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_delete(self.m.get_shortcut_target_path(tunnel, target))

    def set_shortcut_target_holding_time(self, tunnel: str, target: str, value: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_set(self.m.get_shortcut_target_holding_time_path(tunnel, target, value))

    def delete_shortcut_target_holding_time(self, tunnel: str, target: str) -> "NhrpBatchBuilder":
        """VyOS 1.4 only."""
        return self.add_delete(self.m.get_shortcut_target_holding_time_base_path(tunnel, target))
