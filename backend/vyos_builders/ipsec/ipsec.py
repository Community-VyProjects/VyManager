"""
IPSec VPN Batch Builder

Provides all batch operations for IPSec VPN configuration.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class IPSecBatchBuilder:
    """Complete batch builder for IPSec VPN operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "ipsec"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "IPSecBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "IPSecBatchBuilder":
        if path:
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

    # ========================================================================
    # Global Settings
    # ========================================================================

    def set_disable_uniqreqids(self) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_disable_uniqreqids_path())

    def delete_disable_uniqreqids(self) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_disable_uniqreqids_path())

    def set_interface(self, interface: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_interface_path(interface))

    def delete_interface(self, interface: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_interface_path(interface))

    # ========================================================================
    # Logging
    # ========================================================================

    def set_log_level(self, level: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_log_level_path(level))

    def delete_log_level(self, level: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_log_level_path(level))

    def set_log_subsystem(self, subsystem: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_log_subsystem_path(subsystem))

    def delete_log_subsystem(self, subsystem: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_log_subsystem_path(subsystem))

    # ========================================================================
    # Options
    # ========================================================================

    def set_options_disable_route_autoinstall(self) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_options_disable_route_autoinstall_path())

    def delete_options_disable_route_autoinstall(self) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_options_disable_route_autoinstall_path())

    def set_options_flexvpn(self) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_options_flexvpn_path())

    def delete_options_flexvpn(self) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_options_flexvpn_path())

    def set_options_interface(self, interface: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_options_interface_path(interface))

    def delete_options_interface(self, interface: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_options_interface_path(interface))

    def set_options_virtual_ip(self) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_options_virtual_ip_path())

    def delete_options_virtual_ip(self) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_options_virtual_ip_path())

    # Options - Retransmission (1.5 only)
    def set_options_retransmission_attempts(self, attempts: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_options_retransmission_attempts_path(attempts))

    def delete_options_retransmission_attempts(self, attempts: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_options_retransmission_attempts_path(attempts))

    def set_options_retransmission_base(self, base: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_options_retransmission_base_path(base))

    def delete_options_retransmission_base(self, base: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_options_retransmission_base_path(base))

    def set_options_retransmission_timeout(self, timeout: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_options_retransmission_timeout_path(timeout))

    def delete_options_retransmission_timeout(self, timeout: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_options_retransmission_timeout_path(timeout))

    # ========================================================================
    # Authentication - PSK
    # ========================================================================

    def create_auth_psk(self, name: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_auth_psk_path(name))

    def delete_auth_psk(self, name: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_auth_psk_path(name))

    def set_auth_psk_id(self, name: str, identity: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_auth_psk_id_path(name, identity))

    def delete_auth_psk_id(self, name: str, identity: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_auth_psk_id_path(name, identity))

    def set_auth_psk_secret(self, name: str, secret: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_auth_psk_secret_path(name, secret))

    def set_auth_psk_secret_type(self, name: str, secret_type: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_auth_psk_secret_type_path(name, secret_type))

    def set_auth_psk_dhcp_interface(self, name: str, interface: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_auth_psk_dhcp_interface_path(name, interface))

    # Authentication - PPK (1.5 only)
    def create_auth_ppk(self, name: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_auth_ppk_path(name))

    def delete_auth_ppk(self, name: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_auth_ppk_path(name))

    def set_auth_ppk_id(self, name: str, identity: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_auth_ppk_id_path(name, identity))

    def set_auth_ppk_secret(self, name: str, secret: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_auth_ppk_secret_path(name, secret))

    def set_auth_ppk_secret_type(self, name: str, secret_type: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_auth_ppk_secret_type_path(name, secret_type))

    # ========================================================================
    # ESP Group
    # ========================================================================

    def create_esp_group(self, name: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_esp_group_path(name))

    def delete_esp_group(self, name: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_esp_group_path(name))

    def set_esp_group_compression(self, name: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_esp_group_compression_path(name))

    def delete_esp_group_compression(self, name: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_esp_group_compression_path(name))

    def set_esp_group_disable_rekey(self, name: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_esp_group_disable_rekey_path(name))

    def delete_esp_group_disable_rekey(self, name: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_esp_group_disable_rekey_path(name))

    def set_esp_group_life_bytes(self, name: str, value: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_esp_group_life_bytes_path(name, value))

    def set_esp_group_life_packets(self, name: str, value: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_esp_group_life_packets_path(name, value))

    def set_esp_group_lifetime(self, name: str, value: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_esp_group_lifetime_path(name, value))

    def set_esp_group_mode(self, name: str, mode: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_esp_group_mode_path(name, mode))

    def set_esp_group_pfs(self, name: str, pfs: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_esp_group_pfs_path(name, pfs))

    def create_esp_group_proposal(self, name: str, proposal: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_esp_group_proposal_path(name, proposal))

    def delete_esp_group_proposal(self, name: str, proposal: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_esp_group_proposal_path(name, proposal))

    def set_esp_group_proposal_encryption(self, name: str, proposal: str, encryption: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_esp_group_proposal_encryption_path(name, proposal, encryption))

    def set_esp_group_proposal_hash(self, name: str, proposal: str, hash_alg: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_esp_group_proposal_hash_path(name, proposal, hash_alg))

    # ========================================================================
    # IKE Group
    # ========================================================================

    def create_ike_group(self, name: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_path(name))

    def delete_ike_group(self, name: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ike_group_path(name))

    def set_ike_group_close_action(self, name: str, action: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_close_action_path(name, action))

    def set_ike_group_dpd_action(self, name: str, action: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_dpd_action_path(name, action))

    def set_ike_group_dpd_interval(self, name: str, interval: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_dpd_interval_path(name, interval))

    def set_ike_group_dpd_timeout(self, name: str, timeout: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_dpd_timeout_path(name, timeout))

    def set_ike_group_disable_mobike(self, name: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_disable_mobike_path(name))

    def delete_ike_group_disable_mobike(self, name: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ike_group_disable_mobike_path(name))

    def set_ike_group_ikev2_reauth(self, name: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_ikev2_reauth_path(name))

    def delete_ike_group_ikev2_reauth(self, name: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ike_group_ikev2_reauth_path(name))

    def set_ike_group_key_exchange(self, name: str, key_exchange: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_key_exchange_path(name, key_exchange))

    def set_ike_group_lifetime(self, name: str, lifetime: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_lifetime_path(name, lifetime))

    def set_ike_group_mode(self, name: str, mode: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_mode_path(name, mode))

    def create_ike_group_proposal(self, name: str, proposal: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_proposal_path(name, proposal))

    def delete_ike_group_proposal(self, name: str, proposal: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ike_group_proposal_path(name, proposal))

    def set_ike_group_proposal_dh_group(self, name: str, proposal: str, dh_group: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_proposal_dh_group_path(name, proposal, dh_group))

    def set_ike_group_proposal_encryption(self, name: str, proposal: str, encryption: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_proposal_encryption_path(name, proposal, encryption))

    def set_ike_group_proposal_hash(self, name: str, proposal: str, hash_alg: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_proposal_hash_path(name, proposal, hash_alg))

    def set_ike_group_proposal_prf(self, name: str, proposal: str, prf: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ike_group_proposal_prf_path(name, proposal, prf))

    # ========================================================================
    # Site-to-Site Peer
    # ========================================================================

    def create_s2s_peer(self, peer: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_path(peer))

    def delete_s2s_peer(self, peer: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_s2s_peer_path(peer))

    def set_s2s_peer_description(self, peer: str, description: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_description_path(peer, description))

    def set_s2s_peer_disable(self, peer: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_disable_path(peer))

    def delete_s2s_peer_disable(self, peer: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_s2s_peer_disable_path(peer))

    def set_s2s_peer_ike_group(self, peer: str, ike_group: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_ike_group_path(peer, ike_group))

    def set_s2s_peer_default_esp_group(self, peer: str, esp_group: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_default_esp_group_path(peer, esp_group))

    def set_s2s_peer_local_address(self, peer: str, address: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_local_address_path(peer, address))

    def set_s2s_peer_remote_address(self, peer: str, address: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_remote_address_path(peer, address))

    def delete_s2s_peer_remote_address(self, peer: str, address: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_s2s_peer_remote_address_path(peer, address))

    def set_s2s_peer_dhcp_interface(self, peer: str, interface: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_dhcp_interface_path(peer, interface))

    def set_s2s_peer_connection_type(self, peer: str, conn_type: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_connection_type_path(peer, conn_type))

    def set_s2s_peer_force_udp_encapsulation(self, peer: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_force_udp_encapsulation_path(peer))

    def delete_s2s_peer_force_udp_encapsulation(self, peer: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_s2s_peer_force_udp_encapsulation_path(peer))

    def set_s2s_peer_ikev2_reauth(self, peer: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_ikev2_reauth_path(peer))

    def delete_s2s_peer_ikev2_reauth(self, peer: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_s2s_peer_ikev2_reauth_path(peer))

    def set_s2s_peer_replay_window(self, peer: str, value: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_replay_window_path(peer, value))

    def set_s2s_peer_virtual_address(self, peer: str, address: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_virtual_address_path(peer, address))

    def delete_s2s_peer_virtual_address(self, peer: str, address: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_s2s_peer_virtual_address_path(peer, address))

    # Site-to-Site Peer Authentication
    def set_s2s_peer_auth_mode(self, peer: str, mode: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_auth_mode_path(peer, mode))

    def set_s2s_peer_auth_local_id(self, peer: str, local_id: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_auth_local_id_path(peer, local_id))

    def set_s2s_peer_auth_remote_id(self, peer: str, remote_id: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_auth_remote_id_path(peer, remote_id))

    def set_s2s_peer_auth_use_x509_id(self, peer: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_auth_use_x509_id_path(peer))

    def delete_s2s_peer_auth_use_x509_id(self, peer: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_s2s_peer_auth_use_x509_id_path(peer))

    def set_s2s_peer_auth_x509_ca_cert(self, peer: str, ca_cert: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_auth_x509_ca_cert_path(peer, ca_cert))

    def set_s2s_peer_auth_x509_cert(self, peer: str, cert: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_auth_x509_cert_path(peer, cert))

    def set_s2s_peer_auth_x509_passphrase(self, peer: str, passphrase: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_auth_x509_passphrase_path(peer, passphrase))

    def set_s2s_peer_auth_rsa_local_key(self, peer: str, key: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_auth_rsa_local_key_path(peer, key))

    def set_s2s_peer_auth_rsa_remote_key(self, peer: str, key: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_auth_rsa_remote_key_path(peer, key))

    def set_s2s_peer_auth_rsa_passphrase(self, peer: str, passphrase: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_auth_rsa_passphrase_path(peer, passphrase))

    # Site-to-Site Peer Authentication - PPK (1.5 only)
    def set_s2s_peer_auth_ppk_id(self, peer: str, ppk_id: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_auth_ppk_id_path(peer, ppk_id))

    def set_s2s_peer_auth_ppk_required(self, peer: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_auth_ppk_required_path(peer))

    def delete_s2s_peer_auth_ppk_required(self, peer: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_s2s_peer_auth_ppk_required_path(peer))

    # Site-to-Site Peer - Childless (1.5 only)
    def set_s2s_peer_childless(self, peer: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_childless_path(peer))

    def delete_s2s_peer_childless(self, peer: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_s2s_peer_childless_path(peer))

    # Site-to-Site Tunnel
    def create_s2s_peer_tunnel(self, peer: str, tunnel: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_tunnel_path(peer, tunnel))

    def delete_s2s_peer_tunnel(self, peer: str, tunnel: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_s2s_peer_tunnel_path(peer, tunnel))

    def set_s2s_peer_tunnel_disable(self, peer: str, tunnel: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_tunnel_disable_path(peer, tunnel))

    def delete_s2s_peer_tunnel_disable(self, peer: str, tunnel: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_s2s_peer_tunnel_disable_path(peer, tunnel))

    def set_s2s_peer_tunnel_esp_group(self, peer: str, tunnel: str, esp_group: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_tunnel_esp_group_path(peer, tunnel, esp_group))

    def set_s2s_peer_tunnel_local_prefix(self, peer: str, tunnel: str, prefix: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_tunnel_local_prefix_path(peer, tunnel, prefix))

    def delete_s2s_peer_tunnel_local_prefix(self, peer: str, tunnel: str, prefix: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_s2s_peer_tunnel_local_prefix_path(peer, tunnel, prefix))

    def set_s2s_peer_tunnel_local_port(self, peer: str, tunnel: str, port: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_tunnel_local_port_path(peer, tunnel, port))

    def set_s2s_peer_tunnel_remote_prefix(self, peer: str, tunnel: str, prefix: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_tunnel_remote_prefix_path(peer, tunnel, prefix))

    def delete_s2s_peer_tunnel_remote_prefix(self, peer: str, tunnel: str, prefix: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_s2s_peer_tunnel_remote_prefix_path(peer, tunnel, prefix))

    def set_s2s_peer_tunnel_remote_port(self, peer: str, tunnel: str, port: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_tunnel_remote_port_path(peer, tunnel, port))

    def set_s2s_peer_tunnel_priority(self, peer: str, tunnel: str, priority: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_tunnel_priority_path(peer, tunnel, priority))

    def set_s2s_peer_tunnel_protocol(self, peer: str, tunnel: str, protocol: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_tunnel_protocol_path(peer, tunnel, protocol))

    # Site-to-Site VTI
    def set_s2s_peer_vti_bind(self, peer: str, interface: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_vti_bind_path(peer, interface))

    def set_s2s_peer_vti_esp_group(self, peer: str, esp_group: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_vti_esp_group_path(peer, esp_group))

    def set_s2s_peer_vti_ts_local_prefix(self, peer: str, prefix: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_vti_ts_local_prefix_path(peer, prefix))

    def set_s2s_peer_vti_ts_remote_prefix(self, peer: str, prefix: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_s2s_peer_vti_ts_remote_prefix_path(peer, prefix))

    # ========================================================================
    # Remote Access - Connection
    # ========================================================================

    def create_ra_connection(self, conn: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_path(conn))

    def delete_ra_connection(self, conn: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_path(conn))

    def set_ra_connection_description(self, conn: str, description: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_description_path(conn, description))

    def set_ra_connection_disable(self, conn: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_disable_path(conn))

    def delete_ra_connection_disable(self, conn: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_disable_path(conn))

    def delete_ra_connection_description(self, conn: str, description: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_description_path(conn, description))

    def set_ra_connection_esp_group(self, conn: str, esp_group: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_esp_group_path(conn, esp_group))

    def delete_ra_connection_esp_group(self, conn: str, esp_group: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_esp_group_path(conn, esp_group))

    def set_ra_connection_ike_group(self, conn: str, ike_group: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_ike_group_path(conn, ike_group))

    def delete_ra_connection_ike_group(self, conn: str, ike_group: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_ike_group_path(conn, ike_group))

    def set_ra_connection_local_address(self, conn: str, address: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_local_address_path(conn, address))

    def delete_ra_connection_local_address(self, conn: str, address: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_local_address_path(conn, address))

    def set_ra_connection_dhcp_interface(self, conn: str, interface: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_dhcp_interface_path(conn, interface))

    def set_ra_connection_pool(self, conn: str, pool: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_pool_path(conn, pool))

    def delete_ra_connection_pool(self, conn: str, pool: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_pool_path(conn, pool))

    def set_ra_connection_replay_window(self, conn: str, value: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_replay_window_path(conn, value))

    def set_ra_connection_timeout(self, conn: str, value: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_timeout_path(conn, value))

    def set_ra_connection_unique(self, conn: str, value: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_unique_path(conn, value))

    def set_ra_connection_local_prefix(self, conn: str, prefix: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_local_prefix_path(conn, prefix))

    def delete_ra_connection_local_prefix(self, conn: str, prefix: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_local_prefix_path(conn, prefix))

    def set_ra_connection_local_port(self, conn: str, port: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_local_port_path(conn, port))

    # Remote Access Connection Authentication
    def set_ra_connection_auth_server_mode(self, conn: str, mode: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_auth_server_mode_path(conn, mode))

    def delete_ra_connection_auth_server_mode(self, conn: str, mode: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_auth_server_mode_path(conn, mode))

    def set_ra_connection_auth_client_mode(self, conn: str, mode: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_auth_client_mode_path(conn, mode))

    def delete_ra_connection_auth_client_mode(self, conn: str, mode: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_auth_client_mode_path(conn, mode))

    def set_ra_connection_auth_local_id(self, conn: str, local_id: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_auth_local_id_path(conn, local_id))

    def delete_ra_connection_auth_local_id(self, conn: str, local_id: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_auth_local_id_path(conn, local_id))

    def set_ra_connection_auth_eap_id(self, conn: str, eap_id: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_auth_eap_id_path(conn, eap_id))

    def set_ra_connection_auth_psk(self, conn: str, secret: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_auth_psk_path(conn, secret))

    def set_ra_connection_auth_x509_ca_cert(self, conn: str, ca_cert: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_auth_x509_ca_cert_path(conn, ca_cert))

    def delete_ra_connection_auth_x509_ca_cert(self, conn: str, ca_cert: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_auth_x509_ca_cert_path(conn, ca_cert))

    def set_ra_connection_auth_x509_cert(self, conn: str, cert: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_auth_x509_cert_path(conn, cert))

    def delete_ra_connection_auth_x509_cert(self, conn: str, cert: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_auth_x509_cert_path(conn, cert))

    def set_ra_connection_auth_x509_passphrase(self, conn: str, passphrase: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_auth_x509_passphrase_path(conn, passphrase))

    def create_ra_connection_auth_local_user(self, conn: str, username: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_auth_local_user_path(conn, username))

    def delete_ra_connection_auth_local_user(self, conn: str, username: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_auth_local_user_path(conn, username))

    def set_ra_connection_auth_local_user_password(self, conn: str, username: str, password: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_auth_local_user_password_path(conn, username, password))

    def set_ra_connection_auth_local_user_disable(self, conn: str, username: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_auth_local_user_disable_path(conn, username))

    def delete_ra_connection_auth_local_user_disable(self, conn: str, username: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_auth_local_user_disable_path(conn, username))

    # Remote Access Connection - 1.5 only features
    def set_ra_connection_bind(self, conn: str, interface: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_bind_path(conn, interface))

    def set_ra_connection_childless(self, conn: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_childless_path(conn))

    def delete_ra_connection_childless(self, conn: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_childless_path(conn))

    def set_ra_connection_auth_always_send_cert(self, conn: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_auth_always_send_cert_path(conn))

    def delete_ra_connection_auth_always_send_cert(self, conn: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_auth_always_send_cert_path(conn))

    def set_ra_connection_auth_ppk_id(self, conn: str, ppk_id: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_auth_ppk_id_path(conn, ppk_id))

    def set_ra_connection_auth_ppk_required(self, conn: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_connection_auth_ppk_required_path(conn))

    def delete_ra_connection_auth_ppk_required(self, conn: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_connection_auth_ppk_required_path(conn))

    # ========================================================================
    # Remote Access - Pool
    # ========================================================================

    def create_ra_pool(self, pool: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_pool_path(pool))

    def delete_ra_pool(self, pool: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_pool_path(pool))

    def set_ra_pool_prefix(self, pool: str, prefix: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_pool_prefix_path(pool, prefix))

    def delete_ra_pool_prefix(self, pool: str, prefix: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_pool_prefix_path(pool, prefix))

    def set_ra_pool_name_server(self, pool: str, server: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_pool_name_server_path(pool, server))

    def delete_ra_pool_name_server(self, pool: str, server: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_pool_name_server_path(pool, server))

    def set_ra_pool_exclude(self, pool: str, exclude: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_pool_exclude_path(pool, exclude))

    def delete_ra_pool_exclude(self, pool: str, exclude: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_pool_exclude_path(pool, exclude))

    # Pool Range (1.5 only)
    def set_ra_pool_range_start(self, pool: str, start: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_pool_range_start_path(pool, start))

    def set_ra_pool_range_stop(self, pool: str, stop: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_pool_range_stop_path(pool, stop))

    # ========================================================================
    # Remote Access - DHCP
    # ========================================================================

    def set_ra_dhcp_interface(self, interface: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_dhcp_interface_path(interface))

    def set_ra_dhcp_server(self, server: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_dhcp_server_path(server))

    # ========================================================================
    # Remote Access - RADIUS
    # ========================================================================

    def set_ra_radius_nas_identifier(self, identifier: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_radius_nas_identifier_path(identifier))

    def set_ra_radius_timeout(self, timeout: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_radius_timeout_path(timeout))

    def create_ra_radius_server(self, server: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_radius_server_path(server))

    def delete_ra_radius_server(self, server: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_radius_server_path(server))

    def set_ra_radius_server_key(self, server: str, key: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_radius_server_key_path(server, key))

    def set_ra_radius_server_port(self, server: str, port: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_radius_server_port_path(server, port))

    def set_ra_radius_server_disable(self, server: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_radius_server_disable_path(server))

    def delete_ra_radius_server_disable(self, server: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_radius_server_disable_path(server))

    def set_ra_radius_server_disable_accounting(self, server: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_ra_radius_server_disable_accounting_path(server))

    def delete_ra_radius_server_disable_accounting(self, server: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_ra_radius_server_disable_accounting_path(server))

    # ========================================================================
    # Profile
    # ========================================================================

    def create_profile(self, name: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_profile_path(name))

    def delete_profile(self, name: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_profile_path(name))

    def set_profile_disable(self, name: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_profile_disable_path(name))

    def delete_profile_disable(self, name: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_profile_disable_path(name))

    def set_profile_ike_group(self, name: str, ike_group: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_profile_ike_group_path(name, ike_group))

    def set_profile_esp_group(self, name: str, esp_group: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_profile_esp_group_path(name, esp_group))

    def set_profile_auth_mode(self, name: str, mode: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_profile_auth_mode_path(name, mode))

    def set_profile_auth_psk(self, name: str, secret: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_profile_auth_psk_path(name, secret))

    def set_profile_bind_tunnel(self, name: str, tunnel: str) -> "IPSecBatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_profile_bind_tunnel_path(name, tunnel))

    def delete_profile_bind_tunnel(self, name: str, tunnel: str) -> "IPSecBatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_profile_bind_tunnel_path(name, tunnel))

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v15 = "1.5" in self.version or "latest" in self.version
        return {
            "version": self.version,
            "features": {
                "ipsec": {
                    "supported": True,
                    "description": "IPSec VPN tunnel support",
                },
                "site_to_site": {
                    "supported": True,
                    "description": "Site-to-site IPSec tunnels",
                },
                "remote_access": {
                    "supported": True,
                    "description": "Remote access IPSec VPN",
                },
                "ike_groups": {
                    "supported": True,
                    "description": "IKE group configuration",
                },
                "esp_groups": {
                    "supported": True,
                    "description": "ESP group configuration",
                },
                "profiles": {
                    "supported": True,
                    "description": "IPSec VPN profiles",
                },
                "ppk": {
                    "supported": is_v15,
                    "description": "Post-quantum Pre-shared Keys (VyOS 1.5+)",
                },
                "retransmission_options": {
                    "supported": is_v15,
                    "description": "Retransmission tuning (VyOS 1.5+)",
                },
                "childless": {
                    "supported": is_v15,
                    "description": "Childless IKE SA (VyOS 1.5+)",
                },
                "pool_range": {
                    "supported": is_v15,
                    "description": "Pool address range with start/stop (VyOS 1.5+)",
                },
                "connection_bind": {
                    "supported": is_v15,
                    "description": "Bind remote-access connection to interface (VyOS 1.5+)",
                },
                "always_send_cert": {
                    "supported": is_v15,
                    "description": "Always send certificate (VyOS 1.5+)",
                },
            },
            "version_notes": {
                "is_1_4": "1.4" in self.version,
                "is_1_5": is_v15,
            },
        }
