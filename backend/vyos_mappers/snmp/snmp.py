"""SNMP Service Command Mapper.

Maps SNMP configuration attributes to VyOS config paths under: service snmp

Structure (identical on VyOS 1.4 and 1.5):
  service snmp
    contact <txt>
    description <txt>
    location <txt>
    protocol <udp|tcp>
    trap-source <ip>
    smux-peer <oid>                       # multi
    oid-enable <oid-name>                 # multi
    vrf <name>
    listen-address <ip>                   # tag
      port <1-65535>
    community <name>                      # tag
      authorization <ro|rw>
      client <ip>                         # multi
      network <ipnet>                     # multi
    mib
      interface <prefix>                  # multi
      interface-max <1-4294967295>
    script-extensions
      extension-name <name>               # tag
        script <path>
    trap-target <ip>                      # tag
      community <txt>
      port <1-65535>
    v3
      engineid <hex>
      group <name>                        # tag
        mode <ro|rw>
        seclevel <noauth|auth|priv>
        view <name>
      user <name>                         # tag
        auth { type, plaintext-password, encrypted-password }
        privacy { type, plaintext-password, encrypted-password }
        group <name>
        mode <ro|rw>
      view <name>                         # tag
        oid <oid>                         # tag
          exclude <oid>                   # multi
          mask <hex>
      trap-target <ip>                    # tag
        auth { type, plaintext-password, encrypted-password }
        privacy { type, plaintext-password, encrypted-password }
        port <1-65535>
        protocol <udp|tcp>
        type <inform|trap>
        user <name>
"""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "snmp"]


class SNMPMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Global service
    # ========================================================================

    def get_snmp_delete(self) -> List[str]:
        return BASE

    # ------------------------------------------------------------------ contact
    def get_contact(self, value: str) -> List[str]:
        return BASE + ["contact", value]

    def get_contact_delete(self) -> List[str]:
        return BASE + ["contact"]

    # -------------------------------------------------------------- description
    def get_description(self, value: str) -> List[str]:
        return BASE + ["description", value]

    def get_description_delete(self) -> List[str]:
        return BASE + ["description"]

    # ----------------------------------------------------------------- location
    def get_location(self, value: str) -> List[str]:
        return BASE + ["location", value]

    def get_location_delete(self) -> List[str]:
        return BASE + ["location"]

    # ----------------------------------------------------------------- protocol
    def get_protocol(self, value: str) -> List[str]:
        return BASE + ["protocol", value]

    def get_protocol_delete(self) -> List[str]:
        return BASE + ["protocol"]

    # -------------------------------------------------------------- trap-source
    def get_trap_source(self, value: str) -> List[str]:
        return BASE + ["trap-source", value]

    def get_trap_source_delete(self) -> List[str]:
        return BASE + ["trap-source"]

    # ---------------------------------------------------------------------- vrf
    def get_vrf(self, value: str) -> List[str]:
        return BASE + ["vrf", value]

    def get_vrf_delete(self) -> List[str]:
        return BASE + ["vrf"]

    # ---------------------------------------------------------- smux-peer (multi)
    def get_smux_peer(self, oid: str) -> List[str]:
        return BASE + ["smux-peer", oid]

    def get_smux_peer_delete(self, oid: str) -> List[str]:
        return BASE + ["smux-peer", oid]

    def get_all_smux_peers_delete(self) -> List[str]:
        return BASE + ["smux-peer"]

    # -------------------------------------------------------- oid-enable (multi)
    def get_oid_enable(self, value: str) -> List[str]:
        return BASE + ["oid-enable", value]

    def get_oid_enable_delete(self, value: str) -> List[str]:
        return BASE + ["oid-enable", value]

    def get_all_oid_enable_delete(self) -> List[str]:
        return BASE + ["oid-enable"]

    # ========================================================================
    # Listen-address (tag node)
    # ========================================================================

    def get_listen_address(self, address: str) -> List[str]:
        return BASE + ["listen-address", address]

    def get_listen_address_delete(self, address: str) -> List[str]:
        return BASE + ["listen-address", address]

    def get_listen_address_port(self, address: str, port: str) -> List[str]:
        return BASE + ["listen-address", address, "port", port]

    def get_listen_address_port_delete(self, address: str) -> List[str]:
        return BASE + ["listen-address", address, "port"]

    # ========================================================================
    # Community (tag node)
    # ========================================================================

    def get_community(self, name: str) -> List[str]:
        return BASE + ["community", name]

    def get_community_delete(self, name: str) -> List[str]:
        return BASE + ["community", name]

    def get_community_authorization(self, name: str, value: str) -> List[str]:
        return BASE + ["community", name, "authorization", value]

    def get_community_authorization_delete(self, name: str) -> List[str]:
        return BASE + ["community", name, "authorization"]

    def get_community_client(self, name: str, client: str) -> List[str]:
        return BASE + ["community", name, "client", client]

    def get_community_client_delete(self, name: str, client: str) -> List[str]:
        return BASE + ["community", name, "client", client]

    def get_all_community_clients_delete(self, name: str) -> List[str]:
        return BASE + ["community", name, "client"]

    def get_community_network(self, name: str, network: str) -> List[str]:
        return BASE + ["community", name, "network", network]

    def get_community_network_delete(self, name: str, network: str) -> List[str]:
        return BASE + ["community", name, "network", network]

    def get_all_community_networks_delete(self, name: str) -> List[str]:
        return BASE + ["community", name, "network"]

    # ========================================================================
    # MIB
    # ========================================================================

    def get_mib_interface(self, prefix: str) -> List[str]:
        return BASE + ["mib", "interface", prefix]

    def get_mib_interface_delete(self, prefix: str) -> List[str]:
        return BASE + ["mib", "interface", prefix]

    def get_all_mib_interfaces_delete(self) -> List[str]:
        return BASE + ["mib", "interface"]

    def get_mib_interface_max(self, value: str) -> List[str]:
        return BASE + ["mib", "interface-max", value]

    def get_mib_interface_max_delete(self) -> List[str]:
        return BASE + ["mib", "interface-max"]

    # ========================================================================
    # Script extensions (tag node)
    # ========================================================================

    def get_script_extension(self, name: str) -> List[str]:
        return BASE + ["script-extensions", "extension-name", name]

    def get_script_extension_delete(self, name: str) -> List[str]:
        return BASE + ["script-extensions", "extension-name", name]

    def get_script_extension_script(self, name: str, script: str) -> List[str]:
        return BASE + ["script-extensions", "extension-name", name, "script", script]

    def get_script_extension_script_delete(self, name: str) -> List[str]:
        return BASE + ["script-extensions", "extension-name", name, "script"]

    # ========================================================================
    # Trap-target (tag node) — SNMPv1/v2c
    # ========================================================================

    def get_trap_target(self, address: str) -> List[str]:
        return BASE + ["trap-target", address]

    def get_trap_target_delete(self, address: str) -> List[str]:
        return BASE + ["trap-target", address]

    def get_trap_target_community(self, address: str, community: str) -> List[str]:
        return BASE + ["trap-target", address, "community", community]

    def get_trap_target_community_delete(self, address: str) -> List[str]:
        return BASE + ["trap-target", address, "community"]

    def get_trap_target_port(self, address: str, port: str) -> List[str]:
        return BASE + ["trap-target", address, "port", port]

    def get_trap_target_port_delete(self, address: str) -> List[str]:
        return BASE + ["trap-target", address, "port"]

    # ========================================================================
    # SNMPv3
    # ========================================================================

    def get_v3_delete(self) -> List[str]:
        return BASE + ["v3"]

    # ------------------------------------------------------------- v3 engineid
    def get_v3_engineid(self, value: str) -> List[str]:
        return BASE + ["v3", "engineid", value]

    def get_v3_engineid_delete(self) -> List[str]:
        return BASE + ["v3", "engineid"]

    # ----------------------------------------------------------- v3 group (tag)
    def get_v3_group(self, name: str) -> List[str]:
        return BASE + ["v3", "group", name]

    def get_v3_group_delete(self, name: str) -> List[str]:
        return BASE + ["v3", "group", name]

    def get_v3_group_mode(self, name: str, value: str) -> List[str]:
        return BASE + ["v3", "group", name, "mode", value]

    def get_v3_group_mode_delete(self, name: str) -> List[str]:
        return BASE + ["v3", "group", name, "mode"]

    def get_v3_group_seclevel(self, name: str, value: str) -> List[str]:
        return BASE + ["v3", "group", name, "seclevel", value]

    def get_v3_group_seclevel_delete(self, name: str) -> List[str]:
        return BASE + ["v3", "group", name, "seclevel"]

    def get_v3_group_view(self, name: str, value: str) -> List[str]:
        return BASE + ["v3", "group", name, "view", value]

    def get_v3_group_view_delete(self, name: str) -> List[str]:
        return BASE + ["v3", "group", name, "view"]

    # ------------------------------------------------------------ v3 user (tag)
    def get_v3_user(self, name: str) -> List[str]:
        return BASE + ["v3", "user", name]

    def get_v3_user_delete(self, name: str) -> List[str]:
        return BASE + ["v3", "user", name]

    def get_v3_user_group(self, name: str, value: str) -> List[str]:
        return BASE + ["v3", "user", name, "group", value]

    def get_v3_user_group_delete(self, name: str) -> List[str]:
        return BASE + ["v3", "user", name, "group"]

    def get_v3_user_mode(self, name: str, value: str) -> List[str]:
        return BASE + ["v3", "user", name, "mode", value]

    def get_v3_user_mode_delete(self, name: str) -> List[str]:
        return BASE + ["v3", "user", name, "mode"]

    def get_v3_user_auth_type(self, name: str, value: str) -> List[str]:
        return BASE + ["v3", "user", name, "auth", "type", value]

    def get_v3_user_auth_type_delete(self, name: str) -> List[str]:
        return BASE + ["v3", "user", name, "auth", "type"]

    def get_v3_user_auth_plaintext_password(self, name: str, value: str) -> List[str]:
        return BASE + ["v3", "user", name, "auth", "plaintext-password", value]

    def get_v3_user_auth_plaintext_password_delete(self, name: str) -> List[str]:
        return BASE + ["v3", "user", name, "auth", "plaintext-password"]

    def get_v3_user_auth_encrypted_password(self, name: str, value: str) -> List[str]:
        return BASE + ["v3", "user", name, "auth", "encrypted-password", value]

    def get_v3_user_auth_encrypted_password_delete(self, name: str) -> List[str]:
        return BASE + ["v3", "user", name, "auth", "encrypted-password"]

    def get_v3_user_privacy_type(self, name: str, value: str) -> List[str]:
        return BASE + ["v3", "user", name, "privacy", "type", value]

    def get_v3_user_privacy_type_delete(self, name: str) -> List[str]:
        return BASE + ["v3", "user", name, "privacy", "type"]

    def get_v3_user_privacy_plaintext_password(self, name: str, value: str) -> List[str]:
        return BASE + ["v3", "user", name, "privacy", "plaintext-password", value]

    def get_v3_user_privacy_plaintext_password_delete(self, name: str) -> List[str]:
        return BASE + ["v3", "user", name, "privacy", "plaintext-password"]

    def get_v3_user_privacy_encrypted_password(self, name: str, value: str) -> List[str]:
        return BASE + ["v3", "user", name, "privacy", "encrypted-password", value]

    def get_v3_user_privacy_encrypted_password_delete(self, name: str) -> List[str]:
        return BASE + ["v3", "user", name, "privacy", "encrypted-password"]

    # ------------------------------------------------------------ v3 view (tag)
    def get_v3_view(self, name: str) -> List[str]:
        return BASE + ["v3", "view", name]

    def get_v3_view_delete(self, name: str) -> List[str]:
        return BASE + ["v3", "view", name]

    def get_v3_view_oid(self, view: str, oid: str) -> List[str]:
        return BASE + ["v3", "view", view, "oid", oid]

    def get_v3_view_oid_delete(self, view: str, oid: str) -> List[str]:
        return BASE + ["v3", "view", view, "oid", oid]

    def get_v3_view_oid_mask(self, view: str, oid: str, mask: str) -> List[str]:
        return BASE + ["v3", "view", view, "oid", oid, "mask", mask]

    def get_v3_view_oid_mask_delete(self, view: str, oid: str) -> List[str]:
        return BASE + ["v3", "view", view, "oid", oid, "mask"]

    def get_v3_view_oid_exclude(self, view: str, oid: str, exclude: str) -> List[str]:
        return BASE + ["v3", "view", view, "oid", oid, "exclude", exclude]

    def get_v3_view_oid_exclude_delete(self, view: str, oid: str, exclude: str) -> List[str]:
        return BASE + ["v3", "view", view, "oid", oid, "exclude", exclude]

    def get_all_v3_view_oid_excludes_delete(self, view: str, oid: str) -> List[str]:
        return BASE + ["v3", "view", view, "oid", oid, "exclude"]

    # ----------------------------------------------------- v3 trap-target (tag)
    def get_v3_trap_target(self, address: str) -> List[str]:
        return BASE + ["v3", "trap-target", address]

    def get_v3_trap_target_delete(self, address: str) -> List[str]:
        return BASE + ["v3", "trap-target", address]

    def get_v3_trap_target_port(self, address: str, port: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "port", port]

    def get_v3_trap_target_port_delete(self, address: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "port"]

    def get_v3_trap_target_protocol(self, address: str, value: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "protocol", value]

    def get_v3_trap_target_protocol_delete(self, address: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "protocol"]

    def get_v3_trap_target_type(self, address: str, value: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "type", value]

    def get_v3_trap_target_type_delete(self, address: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "type"]

    def get_v3_trap_target_user(self, address: str, value: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "user", value]

    def get_v3_trap_target_user_delete(self, address: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "user"]

    def get_v3_trap_target_auth_type(self, address: str, value: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "auth", "type", value]

    def get_v3_trap_target_auth_type_delete(self, address: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "auth", "type"]

    def get_v3_trap_target_auth_plaintext_password(self, address: str, value: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "auth", "plaintext-password", value]

    def get_v3_trap_target_auth_plaintext_password_delete(self, address: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "auth", "plaintext-password"]

    def get_v3_trap_target_auth_encrypted_password(self, address: str, value: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "auth", "encrypted-password", value]

    def get_v3_trap_target_auth_encrypted_password_delete(self, address: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "auth", "encrypted-password"]

    def get_v3_trap_target_privacy_type(self, address: str, value: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "privacy", "type", value]

    def get_v3_trap_target_privacy_type_delete(self, address: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "privacy", "type"]

    def get_v3_trap_target_privacy_plaintext_password(self, address: str, value: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "privacy", "plaintext-password", value]

    def get_v3_trap_target_privacy_plaintext_password_delete(self, address: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "privacy", "plaintext-password"]

    def get_v3_trap_target_privacy_encrypted_password(self, address: str, value: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "privacy", "encrypted-password", value]

    def get_v3_trap_target_privacy_encrypted_password_delete(self, address: str) -> List[str]:
        return BASE + ["v3", "trap-target", address, "privacy", "encrypted-password"]
