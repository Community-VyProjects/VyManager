"""
SNMP Service Batch Builder

Generates VyOS set/delete operations for the SNMP service.

Configuration lives under: service snmp

Version differences:
  1.4 and 1.5 share identical SNMP config paths — no version-specific overrides.

Multi-argument builder methods receive their arguments comma-separated from the
router (e.g. set_community_authorization -> "community,ro"). The last argument
absorbs any extra commas (router uses maxsplit), so trailing free-text values
such as passwords are preserved intact.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class SNMPBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["snmp"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "SNMPBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "SNMPBatchBuilder":
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
                "snmp": {
                    "supported": True,
                    "description": "Simple Network Management Protocol service",
                },
                "protocol": {
                    "supported": True,
                    "description": "Transport protocol for SNMP",
                    "values": ["udp", "tcp"],
                    "default": "udp",
                },
                "oid_enable": {
                    "supported": True,
                    "description": "Enable OIDs that are disabled by default",
                    "multi_value": True,
                    "values": [
                        "ip-forward",
                        "ip-route-table",
                        "ip-net-to-media-table",
                        "ip-net-to-physical-phys-address",
                    ],
                },
                "smux_peer": {
                    "supported": True,
                    "description": "Register a subtree for SMUX-based processing",
                    "multi_value": True,
                },
                "listen_address": {
                    "supported": True,
                    "description": "Addresses (and ports) to listen for SNMP requests",
                    "default_port": "161",
                },
                "community": {
                    "supported": True,
                    "description": "SNMPv1/v2c community configuration",
                    "authorization_values": ["ro", "rw"],
                    "default_authorization": "ro",
                },
                "mib": {
                    "supported": True,
                    "description": "IF-MIB data collection tuning",
                    "interface_prefixes": [
                        "br", "bond", "dum", "eth", "gnv", "macsec", "peth",
                        "sstpc", "tun", "veth", "vti", "vtun", "vxlan", "wg",
                        "wlan", "wwan",
                    ],
                },
                "script_extensions": {
                    "supported": True,
                    "description": "Extend SNMP agent with custom scripts",
                },
                "trap_target": {
                    "supported": True,
                    "description": "SNMPv1/v2c trap targets",
                    "default_port": "162",
                },
                "v3": {
                    "supported": True,
                    "description": "SNMPv3 (users, groups, views, trap targets)",
                    "auth_types": ["md5", "sha"],
                    "privacy_types": ["des", "aes"],
                    "mode_values": ["ro", "rw"],
                    "seclevel_values": ["noauth", "auth", "priv"],
                    "trap_type_values": ["inform", "trap"],
                    "trap_protocol_values": ["udp", "tcp"],
                    "default_trap_port": "162",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # =======================================================================
    # Global service
    # =======================================================================

    def delete_snmp(self) -> "SNMPBatchBuilder":
        """Delete the entire SNMP service configuration."""
        return self.add_delete(self.m.get_snmp_delete())

    def set_contact(self, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_contact(value))

    def delete_contact(self) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_contact_delete())

    def set_description(self, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_description(value))

    def delete_description(self) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_description_delete())

    def set_location(self, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_location(value))

    def delete_location(self) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_location_delete())

    def set_protocol(self, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_protocol(value))

    def delete_protocol(self) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_protocol_delete())

    def set_trap_source(self, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_trap_source(value))

    def delete_trap_source(self) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_trap_source_delete())

    def set_vrf(self, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_vrf(value))

    def delete_vrf(self) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_vrf_delete())

    # ---------------------------------------------------------- smux-peer (multi)
    def set_smux_peer(self, oid: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_smux_peer(oid))

    def delete_smux_peer(self, oid: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_smux_peer_delete(oid))

    def delete_all_smux_peers(self) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_all_smux_peers_delete())

    # -------------------------------------------------------- oid-enable (multi)
    def set_oid_enable(self, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_oid_enable(value))

    def delete_oid_enable(self, value: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_oid_enable_delete(value))

    def delete_all_oid_enable(self) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_all_oid_enable_delete())

    # =======================================================================
    # Listen-address (tag node)
    # =======================================================================

    def set_listen_address(self, address: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_listen_address(address))

    def delete_listen_address(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_listen_address_delete(address))

    def set_listen_address_port(self, address: str, port: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_listen_address_port(address, port))

    def delete_listen_address_port(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_listen_address_port_delete(address))

    # =======================================================================
    # Community (tag node)
    # =======================================================================

    def set_community(self, name: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_community(name))

    def delete_community(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_community_delete(name))

    def set_community_authorization(self, name: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_community_authorization(name, value))

    def delete_community_authorization(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_community_authorization_delete(name))

    def set_community_client(self, name: str, client: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_community_client(name, client))

    def delete_community_client(self, name: str, client: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_community_client_delete(name, client))

    def delete_all_community_clients(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_all_community_clients_delete(name))

    def set_community_network(self, name: str, network: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_community_network(name, network))

    def delete_community_network(self, name: str, network: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_community_network_delete(name, network))

    def delete_all_community_networks(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_all_community_networks_delete(name))

    # =======================================================================
    # MIB
    # =======================================================================

    def set_mib_interface(self, prefix: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_mib_interface(prefix))

    def delete_mib_interface(self, prefix: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_mib_interface_delete(prefix))

    def delete_all_mib_interfaces(self) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_all_mib_interfaces_delete())

    def set_mib_interface_max(self, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_mib_interface_max(value))

    def delete_mib_interface_max(self) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_mib_interface_max_delete())

    # =======================================================================
    # Script extensions (tag node)
    # =======================================================================

    def set_script_extension(self, name: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_script_extension(name))

    def delete_script_extension(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_script_extension_delete(name))

    def set_script_extension_script(self, name: str, script: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_script_extension_script(name, script))

    def delete_script_extension_script(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_script_extension_script_delete(name))

    # =======================================================================
    # Trap-target (tag node) — SNMPv1/v2c
    # =======================================================================

    def set_trap_target(self, address: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_trap_target(address))

    def delete_trap_target(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_trap_target_delete(address))

    def set_trap_target_community(self, address: str, community: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_trap_target_community(address, community))

    def delete_trap_target_community(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_trap_target_community_delete(address))

    def set_trap_target_port(self, address: str, port: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_trap_target_port(address, port))

    def delete_trap_target_port(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_trap_target_port_delete(address))

    # =======================================================================
    # SNMPv3
    # =======================================================================

    def delete_v3(self) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_delete())

    def set_v3_engineid(self, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_engineid(value))

    def delete_v3_engineid(self) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_engineid_delete())

    # ----------------------------------------------------------- v3 group (tag)
    def set_v3_group(self, name: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_group(name))

    def delete_v3_group(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_group_delete(name))

    def set_v3_group_mode(self, name: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_group_mode(name, value))

    def delete_v3_group_mode(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_group_mode_delete(name))

    def set_v3_group_seclevel(self, name: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_group_seclevel(name, value))

    def delete_v3_group_seclevel(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_group_seclevel_delete(name))

    def set_v3_group_view(self, name: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_group_view(name, value))

    def delete_v3_group_view(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_group_view_delete(name))

    # ------------------------------------------------------------ v3 user (tag)
    def set_v3_user(self, name: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_user(name))

    def delete_v3_user(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_user_delete(name))

    def set_v3_user_group(self, name: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_user_group(name, value))

    def delete_v3_user_group(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_user_group_delete(name))

    def set_v3_user_mode(self, name: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_user_mode(name, value))

    def delete_v3_user_mode(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_user_mode_delete(name))

    def set_v3_user_auth_type(self, name: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_user_auth_type(name, value))

    def delete_v3_user_auth_type(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_user_auth_type_delete(name))

    def set_v3_user_auth_plaintext_password(self, name: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_user_auth_plaintext_password(name, value))

    def delete_v3_user_auth_plaintext_password(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_user_auth_plaintext_password_delete(name))

    def set_v3_user_auth_encrypted_password(self, name: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_user_auth_encrypted_password(name, value))

    def delete_v3_user_auth_encrypted_password(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_user_auth_encrypted_password_delete(name))

    def set_v3_user_privacy_type(self, name: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_user_privacy_type(name, value))

    def delete_v3_user_privacy_type(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_user_privacy_type_delete(name))

    def set_v3_user_privacy_plaintext_password(self, name: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_user_privacy_plaintext_password(name, value))

    def delete_v3_user_privacy_plaintext_password(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_user_privacy_plaintext_password_delete(name))

    def set_v3_user_privacy_encrypted_password(self, name: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_user_privacy_encrypted_password(name, value))

    def delete_v3_user_privacy_encrypted_password(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_user_privacy_encrypted_password_delete(name))

    # ------------------------------------------------------------ v3 view (tag)
    def set_v3_view(self, name: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_view(name))

    def delete_v3_view(self, name: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_view_delete(name))

    def set_v3_view_oid(self, view: str, oid: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_view_oid(view, oid))

    def delete_v3_view_oid(self, view: str, oid: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_view_oid_delete(view, oid))

    def set_v3_view_oid_mask(self, view: str, oid: str, mask: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_view_oid_mask(view, oid, mask))

    def delete_v3_view_oid_mask(self, view: str, oid: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_view_oid_mask_delete(view, oid))

    def set_v3_view_oid_exclude(self, view: str, oid: str, exclude: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_view_oid_exclude(view, oid, exclude))

    def delete_v3_view_oid_exclude(self, view: str, oid: str, exclude: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_view_oid_exclude_delete(view, oid, exclude))

    def delete_all_v3_view_oid_excludes(self, view: str, oid: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_all_v3_view_oid_excludes_delete(view, oid))

    # ----------------------------------------------------- v3 trap-target (tag)
    def set_v3_trap_target(self, address: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_trap_target(address))

    def delete_v3_trap_target(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_trap_target_delete(address))

    def set_v3_trap_target_port(self, address: str, port: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_trap_target_port(address, port))

    def delete_v3_trap_target_port(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_trap_target_port_delete(address))

    def set_v3_trap_target_protocol(self, address: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_trap_target_protocol(address, value))

    def delete_v3_trap_target_protocol(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_trap_target_protocol_delete(address))

    def set_v3_trap_target_type(self, address: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_trap_target_type(address, value))

    def delete_v3_trap_target_type(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_trap_target_type_delete(address))

    def set_v3_trap_target_user(self, address: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_trap_target_user(address, value))

    def delete_v3_trap_target_user(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_trap_target_user_delete(address))

    def set_v3_trap_target_auth_type(self, address: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_trap_target_auth_type(address, value))

    def delete_v3_trap_target_auth_type(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_trap_target_auth_type_delete(address))

    def set_v3_trap_target_auth_plaintext_password(self, address: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_trap_target_auth_plaintext_password(address, value))

    def delete_v3_trap_target_auth_plaintext_password(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_trap_target_auth_plaintext_password_delete(address))

    def set_v3_trap_target_auth_encrypted_password(self, address: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_trap_target_auth_encrypted_password(address, value))

    def delete_v3_trap_target_auth_encrypted_password(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_trap_target_auth_encrypted_password_delete(address))

    def set_v3_trap_target_privacy_type(self, address: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_trap_target_privacy_type(address, value))

    def delete_v3_trap_target_privacy_type(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_trap_target_privacy_type_delete(address))

    def set_v3_trap_target_privacy_plaintext_password(self, address: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_trap_target_privacy_plaintext_password(address, value))

    def delete_v3_trap_target_privacy_plaintext_password(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_trap_target_privacy_plaintext_password_delete(address))

    def set_v3_trap_target_privacy_encrypted_password(self, address: str, value: str) -> "SNMPBatchBuilder":
        return self.add_set(self.m.get_v3_trap_target_privacy_encrypted_password(address, value))

    def delete_v3_trap_target_privacy_encrypted_password(self, address: str) -> "SNMPBatchBuilder":
        return self.add_delete(self.m.get_v3_trap_target_privacy_encrypted_password_delete(address))
