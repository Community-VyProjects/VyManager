"""
IPSec VPN Command Mapper

Handles command path generation for IPSec VPN configuration.
Version-specific logic is in version-specific files.
"""

from typing import List, Dict, Any


class IPSecMapper:
    """Base mapper with common IPSec operations."""

    def __init__(self, version: str):
        self.version = version

    # ========================================================================
    # Base path
    # ========================================================================

    def get_base_path(self) -> List[str]:
        return ["vpn", "ipsec"]

    # ========================================================================
    # Global settings
    # ========================================================================

    def get_disable_uniqreqids_path(self) -> List[str]:
        return ["vpn", "ipsec", "disable-uniqreqids"]

    def get_interface_path(self, interface: str) -> List[str]:
        return ["vpn", "ipsec", "interface", interface]

    # ========================================================================
    # Logging
    # ========================================================================

    def get_log_level_path(self, level: str) -> List[str]:
        return ["vpn", "ipsec", "log", "level", level]

    def get_log_subsystem_path(self, subsystem: str) -> List[str]:
        return ["vpn", "ipsec", "log", "subsystem", subsystem]

    # ========================================================================
    # Options
    # ========================================================================

    def get_options_disable_route_autoinstall_path(self) -> List[str]:
        return ["vpn", "ipsec", "options", "disable-route-autoinstall"]

    def get_options_flexvpn_path(self) -> List[str]:
        return ["vpn", "ipsec", "options", "flexvpn"]

    def get_options_interface_path(self, interface: str) -> List[str]:
        return ["vpn", "ipsec", "options", "interface", interface]

    def get_options_virtual_ip_path(self) -> List[str]:
        return ["vpn", "ipsec", "options", "virtual-ip"]

    # ========================================================================
    # Authentication - PSK
    # ========================================================================

    def get_auth_psk_path(self, name: str) -> List[str]:
        return ["vpn", "ipsec", "authentication", "psk", name]

    def get_auth_psk_id_path(self, name: str, identity: str) -> List[str]:
        return ["vpn", "ipsec", "authentication", "psk", name, "id", identity]

    def get_auth_psk_secret_path(self, name: str, secret: str) -> List[str]:
        return ["vpn", "ipsec", "authentication", "psk", name, "secret", secret]

    def get_auth_psk_secret_type_path(self, name: str, secret_type: str) -> List[str]:
        return ["vpn", "ipsec", "authentication", "psk", name, "secret-type", secret_type]

    def get_auth_psk_dhcp_interface_path(self, name: str, interface: str) -> List[str]:
        return ["vpn", "ipsec", "authentication", "psk", name, "dhcp-interface", interface]

    # ========================================================================
    # ESP Group
    # ========================================================================

    def get_esp_group_path(self, name: str) -> List[str]:
        return ["vpn", "ipsec", "esp-group", name]

    def get_esp_group_compression_path(self, name: str) -> List[str]:
        return ["vpn", "ipsec", "esp-group", name, "compression"]

    def get_esp_group_disable_rekey_path(self, name: str) -> List[str]:
        return ["vpn", "ipsec", "esp-group", name, "disable-rekey"]

    def get_esp_group_life_bytes_path(self, name: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "esp-group", name, "life-bytes", value]

    def get_esp_group_life_packets_path(self, name: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "esp-group", name, "life-packets", value]

    def get_esp_group_lifetime_path(self, name: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "esp-group", name, "lifetime", value]

    def get_esp_group_mode_path(self, name: str, mode: str) -> List[str]:
        return ["vpn", "ipsec", "esp-group", name, "mode", mode]

    def get_esp_group_pfs_path(self, name: str, pfs: str) -> List[str]:
        return ["vpn", "ipsec", "esp-group", name, "pfs", pfs]

    def get_esp_group_proposal_path(self, name: str, proposal: str) -> List[str]:
        return ["vpn", "ipsec", "esp-group", name, "proposal", proposal]

    def get_esp_group_proposal_encryption_path(self, name: str, proposal: str, encryption: str) -> List[str]:
        return ["vpn", "ipsec", "esp-group", name, "proposal", proposal, "encryption", encryption]

    def get_esp_group_proposal_hash_path(self, name: str, proposal: str, hash_alg: str) -> List[str]:
        return ["vpn", "ipsec", "esp-group", name, "proposal", proposal, "hash", hash_alg]

    # ========================================================================
    # IKE Group
    # ========================================================================

    def get_ike_group_path(self, name: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name]

    def get_ike_group_close_action_path(self, name: str, action: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "close-action", action]

    def get_ike_group_dpd_action_path(self, name: str, action: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "dead-peer-detection", "action", action]

    def get_ike_group_dpd_interval_path(self, name: str, interval: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "dead-peer-detection", "interval", interval]

    def get_ike_group_dpd_timeout_path(self, name: str, timeout: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "dead-peer-detection", "timeout", timeout]

    def get_ike_group_disable_mobike_path(self, name: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "disable-mobike"]

    def get_ike_group_ikev2_reauth_path(self, name: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "ikev2-reauth"]

    def get_ike_group_key_exchange_path(self, name: str, key_exchange: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "key-exchange", key_exchange]

    def get_ike_group_lifetime_path(self, name: str, lifetime: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "lifetime", lifetime]

    def get_ike_group_mode_path(self, name: str, mode: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "mode", mode]

    def get_ike_group_proposal_path(self, name: str, proposal: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "proposal", proposal]

    def get_ike_group_proposal_dh_group_path(self, name: str, proposal: str, dh_group: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "proposal", proposal, "dh-group", dh_group]

    def get_ike_group_proposal_encryption_path(self, name: str, proposal: str, encryption: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "proposal", proposal, "encryption", encryption]

    def get_ike_group_proposal_hash_path(self, name: str, proposal: str, hash_alg: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "proposal", proposal, "hash", hash_alg]

    def get_ike_group_proposal_prf_path(self, name: str, proposal: str, prf: str) -> List[str]:
        return ["vpn", "ipsec", "ike-group", name, "proposal", proposal, "prf", prf]

    # ========================================================================
    # Site-to-Site Peer
    # ========================================================================

    def get_s2s_peer_path(self, peer: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer]

    def get_s2s_peer_description_path(self, peer: str, description: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "description", description]

    def get_s2s_peer_disable_path(self, peer: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "disable"]

    def get_s2s_peer_ike_group_path(self, peer: str, ike_group: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "ike-group", ike_group]

    def get_s2s_peer_default_esp_group_path(self, peer: str, esp_group: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "default-esp-group", esp_group]

    def get_s2s_peer_local_address_path(self, peer: str, address: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "local-address", address]

    def get_s2s_peer_remote_address_path(self, peer: str, address: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "remote-address", address]

    def get_s2s_peer_dhcp_interface_path(self, peer: str, interface: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "dhcp-interface", interface]

    def get_s2s_peer_connection_type_path(self, peer: str, conn_type: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "connection-type", conn_type]

    def get_s2s_peer_force_udp_encapsulation_path(self, peer: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "force-udp-encapsulation"]

    def get_s2s_peer_ikev2_reauth_path(self, peer: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "ikev2-reauth"]

    def get_s2s_peer_replay_window_path(self, peer: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "replay-window", value]

    def get_s2s_peer_virtual_address_path(self, peer: str, address: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "virtual-address", address]

    # Site-to-Site Peer Authentication
    def get_s2s_peer_auth_mode_path(self, peer: str, mode: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "mode", mode]

    def get_s2s_peer_auth_local_id_path(self, peer: str, local_id: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "local-id", local_id]

    def get_s2s_peer_auth_remote_id_path(self, peer: str, remote_id: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "remote-id", remote_id]

    def get_s2s_peer_auth_use_x509_id_path(self, peer: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "use-x509-id"]

    def get_s2s_peer_auth_x509_ca_cert_path(self, peer: str, ca_cert: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "x509", "ca-certificate", ca_cert]

    def get_s2s_peer_auth_x509_cert_path(self, peer: str, cert: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "x509", "certificate", cert]

    def get_s2s_peer_auth_x509_passphrase_path(self, peer: str, passphrase: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "x509", "passphrase", passphrase]

    def get_s2s_peer_auth_rsa_local_key_path(self, peer: str, key: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "rsa", "local-key", key]

    def get_s2s_peer_auth_rsa_remote_key_path(self, peer: str, key: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "rsa", "remote-key", key]

    def get_s2s_peer_auth_rsa_passphrase_path(self, peer: str, passphrase: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "authentication", "rsa", "passphrase", passphrase]

    # Site-to-Site Tunnel
    def get_s2s_peer_tunnel_path(self, peer: str, tunnel: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel]

    def get_s2s_peer_tunnel_disable_path(self, peer: str, tunnel: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel, "disable"]

    def get_s2s_peer_tunnel_esp_group_path(self, peer: str, tunnel: str, esp_group: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel, "esp-group", esp_group]

    def get_s2s_peer_tunnel_local_prefix_path(self, peer: str, tunnel: str, prefix: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel, "local", "prefix", prefix]

    def get_s2s_peer_tunnel_local_port_path(self, peer: str, tunnel: str, port: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel, "local", "port", port]

    def get_s2s_peer_tunnel_remote_prefix_path(self, peer: str, tunnel: str, prefix: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel, "remote", "prefix", prefix]

    def get_s2s_peer_tunnel_remote_port_path(self, peer: str, tunnel: str, port: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel, "remote", "port", port]

    def get_s2s_peer_tunnel_priority_path(self, peer: str, tunnel: str, priority: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel, "priority", priority]

    def get_s2s_peer_tunnel_protocol_path(self, peer: str, tunnel: str, protocol: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "tunnel", tunnel, "protocol", protocol]

    # Site-to-Site VTI
    def get_s2s_peer_vti_bind_path(self, peer: str, interface: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "vti", "bind", interface]

    def get_s2s_peer_vti_esp_group_path(self, peer: str, esp_group: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "vti", "esp-group", esp_group]

    def get_s2s_peer_vti_ts_local_prefix_path(self, peer: str, prefix: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "vti", "traffic-selector", "local", "prefix", prefix]

    def get_s2s_peer_vti_ts_remote_prefix_path(self, peer: str, prefix: str) -> List[str]:
        return ["vpn", "ipsec", "site-to-site", "peer", peer, "vti", "traffic-selector", "remote", "prefix", prefix]

    # ========================================================================
    # Remote Access
    # ========================================================================

    def get_ra_connection_path(self, conn: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn]

    def get_ra_connection_description_path(self, conn: str, description: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "description", description]

    def get_ra_connection_disable_path(self, conn: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "disable"]

    def get_ra_connection_esp_group_path(self, conn: str, esp_group: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "esp-group", esp_group]

    def get_ra_connection_ike_group_path(self, conn: str, ike_group: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "ike-group", ike_group]

    def get_ra_connection_local_address_path(self, conn: str, address: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "local-address", address]

    def get_ra_connection_dhcp_interface_path(self, conn: str, interface: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "dhcp-interface", interface]

    def get_ra_connection_pool_path(self, conn: str, pool: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "pool", pool]

    def get_ra_connection_replay_window_path(self, conn: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "replay-window", value]

    def get_ra_connection_timeout_path(self, conn: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "timeout", value]

    def get_ra_connection_unique_path(self, conn: str, value: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "unique", value]

    def get_ra_connection_local_prefix_path(self, conn: str, prefix: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "local", "prefix", prefix]

    def get_ra_connection_local_port_path(self, conn: str, port: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "local", "port", port]

    # Remote Access Connection Authentication
    def get_ra_connection_auth_server_mode_path(self, conn: str, mode: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "server-mode", mode]

    def get_ra_connection_auth_client_mode_path(self, conn: str, mode: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "client-mode", mode]

    def get_ra_connection_auth_local_id_path(self, conn: str, local_id: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "local-id", local_id]

    def get_ra_connection_auth_eap_id_path(self, conn: str, eap_id: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "eap-id", eap_id]

    def get_ra_connection_auth_psk_path(self, conn: str, secret: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "pre-shared-secret", secret]

    def get_ra_connection_auth_x509_ca_cert_path(self, conn: str, ca_cert: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "x509", "ca-certificate", ca_cert]

    def get_ra_connection_auth_x509_cert_path(self, conn: str, cert: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "x509", "certificate", cert]

    def get_ra_connection_auth_x509_passphrase_path(self, conn: str, passphrase: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "x509", "passphrase", passphrase]

    # Remote Access Connection Authentication - Local Users
    def get_ra_connection_auth_local_user_path(self, conn: str, username: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "local-users", "username", username]

    def get_ra_connection_auth_local_user_password_path(self, conn: str, username: str, password: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "local-users", "username", username, "password", password]

    def get_ra_connection_auth_local_user_disable_path(self, conn: str, username: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "connection", conn, "authentication", "local-users", "username", username, "disable"]

    # ========================================================================
    # Remote Access - Pool
    # ========================================================================

    def get_ra_pool_path(self, pool: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "pool", pool]

    def get_ra_pool_prefix_path(self, pool: str, prefix: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "pool", pool, "prefix", prefix]

    def get_ra_pool_name_server_path(self, pool: str, server: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "pool", pool, "name-server", server]

    def get_ra_pool_exclude_path(self, pool: str, exclude: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "pool", pool, "exclude", exclude]

    # ========================================================================
    # Remote Access - DHCP
    # ========================================================================

    def get_ra_dhcp_interface_path(self, interface: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "dhcp", "interface", interface]

    def get_ra_dhcp_server_path(self, server: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "dhcp", "server", server]

    # ========================================================================
    # Remote Access - RADIUS
    # ========================================================================

    def get_ra_radius_nas_identifier_path(self, identifier: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "radius", "nas-identifier", identifier]

    def get_ra_radius_timeout_path(self, timeout: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "radius", "timeout", timeout]

    def get_ra_radius_server_path(self, server: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "radius", "server", server]

    def get_ra_radius_server_key_path(self, server: str, key: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "radius", "server", server, "key", key]

    def get_ra_radius_server_port_path(self, server: str, port: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "radius", "server", server, "port", port]

    def get_ra_radius_server_disable_path(self, server: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "radius", "server", server, "disable"]

    def get_ra_radius_server_disable_accounting_path(self, server: str) -> List[str]:
        return ["vpn", "ipsec", "remote-access", "radius", "server", server, "disable-accounting"]

    # ========================================================================
    # Profile
    # ========================================================================

    def get_profile_path(self, name: str) -> List[str]:
        return ["vpn", "ipsec", "profile", name]

    def get_profile_disable_path(self, name: str) -> List[str]:
        return ["vpn", "ipsec", "profile", name, "disable"]

    def get_profile_ike_group_path(self, name: str, ike_group: str) -> List[str]:
        return ["vpn", "ipsec", "profile", name, "ike-group", ike_group]

    def get_profile_esp_group_path(self, name: str, esp_group: str) -> List[str]:
        return ["vpn", "ipsec", "profile", name, "esp-group", esp_group]

    def get_profile_auth_mode_path(self, name: str, mode: str) -> List[str]:
        return ["vpn", "ipsec", "profile", name, "authentication", "mode", mode]

    def get_profile_auth_psk_path(self, name: str, secret: str) -> List[str]:
        return ["vpn", "ipsec", "profile", name, "authentication", "pre-shared-secret", secret]

    def get_profile_bind_tunnel_path(self, name: str, tunnel: str) -> List[str]:
        return ["vpn", "ipsec", "profile", name, "bind", "tunnel", tunnel]

    # ========================================================================
    # Config Parsing
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse IPSec configuration from VyOS full config."""
        result = {
            "ike_groups": {},
            "esp_groups": {},
            "site_to_site_peers": {},
            "remote_access": {
                "connections": {},
                "pools": {},
                "radius": {},
                "dhcp": {},
            },
            "profiles": {},
            "authentication": {"psk": {}},
            "options": {},
            "log": {},
            "interfaces": [],
            "disable_uniqreqids": False,
        }

        try:
            vpn_config = full_config.get("vpn", {})
            ipsec_config = vpn_config.get("ipsec", {})

            if not ipsec_config:
                return result

            result["disable_uniqreqids"] = "disable-uniqreqids" in ipsec_config

            # Parse interfaces
            interfaces = ipsec_config.get("interface", {})
            if isinstance(interfaces, list):
                result["interfaces"] = interfaces
            elif isinstance(interfaces, str):
                result["interfaces"] = [interfaces]
            elif isinstance(interfaces, dict):
                result["interfaces"] = list(interfaces.keys())

            # Parse log
            log_config = ipsec_config.get("log", {})
            result["log"] = {
                "level": log_config.get("level"),
                "subsystem": self._normalize_to_list(log_config.get("subsystem")),
            }

            # Parse options
            options = ipsec_config.get("options", {})
            result["options"] = {
                "disable_route_autoinstall": "disable-route-autoinstall" in options,
                "flexvpn": "flexvpn" in options,
                "interface": self._normalize_to_list(options.get("interface")),
                "virtual_ip": "virtual-ip" in options,
            }

            # Parse authentication PSKs
            auth_config = ipsec_config.get("authentication", {})
            psk_config = auth_config.get("psk", {})
            for psk_name, psk_data in psk_config.items():
                result["authentication"]["psk"][psk_name] = {
                    "name": psk_name,
                    "id": self._normalize_to_list(psk_data.get("id")),
                    "secret": psk_data.get("secret"),
                    "secret_type": psk_data.get("secret-type"),
                    "dhcp_interface": psk_data.get("dhcp-interface"),
                }

            # Parse ESP groups
            for name, config in ipsec_config.get("esp-group", {}).items():
                result["esp_groups"][name] = self._parse_esp_group(name, config)

            # Parse IKE groups
            for name, config in ipsec_config.get("ike-group", {}).items():
                result["ike_groups"][name] = self._parse_ike_group(name, config)

            # Parse site-to-site peers
            s2s_config = ipsec_config.get("site-to-site", {})
            for peer_name, peer_config in s2s_config.get("peer", {}).items():
                result["site_to_site_peers"][peer_name] = self._parse_s2s_peer(peer_name, peer_config)

            # Parse remote access
            ra_config = ipsec_config.get("remote-access", {})
            for conn_name, conn_config in ra_config.get("connection", {}).items():
                result["remote_access"]["connections"][conn_name] = self._parse_ra_connection(conn_name, conn_config)

            for pool_name, pool_config in ra_config.get("pool", {}).items():
                result["remote_access"]["pools"][pool_name] = self._parse_ra_pool(pool_name, pool_config)

            # Parse RADIUS
            radius_config = ra_config.get("radius", {})
            if radius_config:
                result["remote_access"]["radius"] = {
                    "nas_identifier": radius_config.get("nas-identifier"),
                    "timeout": radius_config.get("timeout"),
                    "servers": {},
                }
                for srv, srv_config in radius_config.get("server", {}).items():
                    result["remote_access"]["radius"]["servers"][srv] = {
                        "address": srv,
                        "key": srv_config.get("key"),
                        "port": srv_config.get("port"),
                        "disabled": "disable" in srv_config,
                        "disable_accounting": "disable-accounting" in srv_config,
                    }

            # Parse DHCP relay
            dhcp_config = ra_config.get("dhcp", {})
            if dhcp_config:
                result["remote_access"]["dhcp"] = {
                    "interface": dhcp_config.get("interface"),
                    "server": dhcp_config.get("server"),
                }

            # Parse profiles
            for profile_name, profile_config in ipsec_config.get("profile", {}).items():
                auth = profile_config.get("authentication", {})
                result["profiles"][profile_name] = {
                    "name": profile_name,
                    "disabled": "disable" in profile_config,
                    "ike_group": profile_config.get("ike-group"),
                    "esp_group": profile_config.get("esp-group"),
                    "authentication": {
                        "mode": auth.get("mode"),
                        "pre_shared_secret": auth.get("pre-shared-secret"),
                    },
                    "bind": {
                        "tunnel": self._normalize_to_list(profile_config.get("bind", {}).get("tunnel")),
                    },
                }

        except Exception:
            pass

        return result

    def _parse_esp_group(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        proposals = {}
        for prop_num, prop_config in config.get("proposal", {}).items():
            proposals[prop_num] = {
                "number": prop_num,
                "encryption": prop_config.get("encryption"),
                "hash": prop_config.get("hash"),
            }
        return {
            "name": name,
            "compression": "compression" in config,
            "disable_rekey": "disable-rekey" in config,
            "life_bytes": config.get("life-bytes"),
            "life_packets": config.get("life-packets"),
            "lifetime": config.get("lifetime"),
            "mode": config.get("mode"),
            "pfs": config.get("pfs"),
            "proposals": proposals,
        }

    def _parse_ike_group(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        proposals = {}
        for prop_num, prop_config in config.get("proposal", {}).items():
            proposals[prop_num] = {
                "number": prop_num,
                "dh_group": prop_config.get("dh-group"),
                "encryption": prop_config.get("encryption"),
                "hash": prop_config.get("hash"),
                "prf": prop_config.get("prf"),
            }
        dpd = config.get("dead-peer-detection", {})
        return {
            "name": name,
            "close_action": config.get("close-action"),
            "dead_peer_detection": {
                "action": dpd.get("action"),
                "interval": dpd.get("interval"),
                "timeout": dpd.get("timeout"),
            },
            "disable_mobike": "disable-mobike" in config,
            "ikev2_reauth": "ikev2-reauth" in config,
            "key_exchange": config.get("key-exchange"),
            "lifetime": config.get("lifetime"),
            "mode": config.get("mode"),
            "proposals": proposals,
        }

    def _parse_s2s_peer(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        auth = config.get("authentication", {})
        x509 = auth.get("x509", {})
        rsa = auth.get("rsa", {})
        tunnels = {}
        for tunnel_num, tunnel_config in config.get("tunnel", {}).items():
            local = tunnel_config.get("local", {})
            remote = tunnel_config.get("remote", {})
            tunnels[tunnel_num] = {
                "number": tunnel_num,
                "disabled": "disable" in tunnel_config,
                "esp_group": tunnel_config.get("esp-group"),
                "local_prefix": self._normalize_to_list(local.get("prefix")),
                "local_port": local.get("port"),
                "remote_prefix": self._normalize_to_list(remote.get("prefix")),
                "remote_port": remote.get("port"),
                "priority": tunnel_config.get("priority"),
                "protocol": tunnel_config.get("protocol"),
            }
        vti = config.get("vti", {})
        vti_ts = vti.get("traffic-selector", {})
        return {
            "name": name,
            "description": config.get("description"),
            "disabled": "disable" in config,
            "ike_group": config.get("ike-group"),
            "default_esp_group": config.get("default-esp-group"),
            "local_address": config.get("local-address"),
            "remote_address": self._normalize_to_list(config.get("remote-address")),
            "dhcp_interface": config.get("dhcp-interface"),
            "connection_type": config.get("connection-type"),
            "force_udp_encapsulation": "force-udp-encapsulation" in config,
            "ikev2_reauth": "ikev2-reauth" in config,
            "replay_window": config.get("replay-window"),
            "virtual_address": self._normalize_to_list(config.get("virtual-address")),
            "authentication": {
                "mode": auth.get("mode"),
                "local_id": auth.get("local-id"),
                "remote_id": auth.get("remote-id"),
                "use_x509_id": "use-x509-id" in auth,
                "x509": {
                    "ca_certificate": self._normalize_to_list(x509.get("ca-certificate")),
                    "certificate": x509.get("certificate"),
                    "passphrase": x509.get("passphrase"),
                },
                "rsa": {
                    "local_key": rsa.get("local-key"),
                    "remote_key": rsa.get("remote-key"),
                    "passphrase": rsa.get("passphrase"),
                },
            },
            "tunnels": tunnels,
            "vti": {
                "bind": vti.get("bind"),
                "esp_group": vti.get("esp-group"),
                "traffic_selector": {
                    "local_prefix": self._normalize_to_list(vti_ts.get("local", {}).get("prefix")),
                    "remote_prefix": self._normalize_to_list(vti_ts.get("remote", {}).get("prefix")),
                },
            },
        }

    def _parse_ra_connection(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        auth = config.get("authentication", {})
        x509 = auth.get("x509", {})
        local = config.get("local", {})
        local_users = {}
        for username, user_config in auth.get("local-users", {}).get("username", {}).items():
            local_users[username] = {
                "username": username,
                "disabled": "disable" in user_config,
                "password": user_config.get("password"),
            }
        return {
            "name": name,
            "description": config.get("description"),
            "disabled": "disable" in config,
            "esp_group": config.get("esp-group"),
            "ike_group": config.get("ike-group"),
            "local_address": config.get("local-address"),
            "dhcp_interface": config.get("dhcp-interface"),
            "pool": self._normalize_to_list(config.get("pool")),
            "replay_window": config.get("replay-window"),
            "timeout": config.get("timeout"),
            "unique": config.get("unique"),
            "local": {
                "prefix": self._normalize_to_list(local.get("prefix")),
                "port": local.get("port"),
            },
            "authentication": {
                "server_mode": auth.get("server-mode"),
                "client_mode": auth.get("client-mode"),
                "local_id": auth.get("local-id"),
                "eap_id": auth.get("eap-id"),
                "pre_shared_secret": auth.get("pre-shared-secret"),
                "x509": {
                    "ca_certificate": self._normalize_to_list(x509.get("ca-certificate")),
                    "certificate": x509.get("certificate"),
                    "passphrase": x509.get("passphrase"),
                },
                "local_users": local_users,
            },
        }

    def _parse_ra_pool(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "name": name,
            "prefix": self._normalize_to_list(config.get("prefix")),
            "name_server": self._normalize_to_list(config.get("name-server")),
            "exclude": self._normalize_to_list(config.get("exclude")),
        }

    def _normalize_to_list(self, value: Any) -> list:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return [value]
