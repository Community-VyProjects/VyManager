"""
OpenVPN Interface Batch Builder

Provides all OpenVPN interface batch operations.
OpenVPN supports site-to-site, client, and server modes with TLS,
shared-secret, encryption negotiation lists, and many per-client options.

Version-aware where the underlying command tree differs (1.4 uses
`encryption ncp-ciphers`; 1.5 uses `encryption data-ciphers` +
`encryption data-ciphers-fallback` and `ipv6 address interface-identifier`).
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class OpenvpnInterfaceBuilderMixin:
    """Complete batch builder for OpenVPN interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_openvpn"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "OpenvpnInterfaceBuilderMixin":
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "OpenvpnInterfaceBuilderMixin":
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "OpenvpnInterfaceBuilderMixin":
        for path in paths:
            self.add_set(path)
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
        return self.mappers[self.interface_mapper_key]

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v15 = "1.5" in self.version or "latest" in self.version
        return {
            "version": self.version,
            "version_info": {
                "is_1_4": not is_v15,
                "is_1_5": is_v15,
            },
            "features": {
                "description": {"supported": True, "description": "Interface description"},
                "disable": {"supported": True, "description": "Administratively disable interface"},
                "device_type": {"supported": True, "description": "Device type: tun (layer 3) or tap (layer 2)"},
                "mode": {"supported": True, "description": "Mode: site-to-site, client, or server"},
                "protocol": {"supported": True, "description": "Protocol: udp, tcp-passive, tcp-active"},
                "vrf": {"supported": True, "description": "VRF instance assignment"},
                "authentication": {"supported": True, "description": "Username / password for client mode"},
                "local_address": {"supported": True, "description": "Local tunnel address (with optional subnet-mask)"},
                "local_host": {"supported": True, "description": "Local IP to bind to"},
                "local_port": {"supported": True, "description": "Local UDP/TCP port"},
                "remote_address": {"supported": True, "description": "Remote tunnel address"},
                "remote_host": {"supported": True, "description": "Remote host(s) to connect to"},
                "remote_port": {"supported": True, "description": "Remote UDP/TCP port"},
                "keep_alive": {"supported": True, "description": "Keep-alive interval/failure-count"},
                "encryption_cipher": {"supported": True, "description": "Legacy cipher (3des/aes128/aes256/...)"},
                "encryption_data_ciphers": {
                    "supported": True,
                    "description": (
                        "Data cipher negotiation list "
                        f"({'data-ciphers (1.5)' if is_v15 else 'ncp-ciphers (1.4)'})"
                    ),
                    "syntax": "data-ciphers" if is_v15 else "ncp-ciphers",
                },
                "encryption_data_ciphers_fallback": {
                    "supported": is_v15,
                    "description": "Fallback cipher for site-to-site tunnels (VyOS 1.5+)",
                },
                "hash": {"supported": True, "description": "Hash algorithm: md5, sha1, sha256, sha384, sha512"},
                "tls": {"supported": True, "description": "TLS (CA, certificate, dh-params, role, peer-fingerprint, ...)"},
                "shared_secret_key": {"supported": True, "description": "Shared secret key reference"},
                "openvpn_options": {"supported": True, "description": "Additional raw OpenVPN options"},
                "persistent_tunnel": {"supported": True, "description": "Keep TUN/TAP open across client restarts"},
                "use_lzo_compression": {"supported": True, "description": "Enable LZO compression"},
                "redirect": {"supported": True, "description": "Redirect incoming packets to destination interface"},
                "replace_default_route": {"supported": True, "description": "Replace default route via this tunnel"},
                "offload_dco": {"supported": True, "description": "Enable Data Channel Offload (DCO)"},
                "server": {"supported": True, "description": "Server mode configuration"},
                "server_bridge": {"supported": True, "description": "Server bridge (tap) settings"},
                "server_client_ip_pool": {"supported": True, "description": "IPv4 client address pool"},
                "server_client_ipv6_pool": {"supported": True, "description": "IPv6 client prefix delegation"},
                "server_clients": {"supported": True, "description": "Per-client static config (ip, push-route, subnet)"},
                "server_mfa_totp": {"supported": True, "description": "TOTP multi-factor auth for server"},
                "server_push_route": {"supported": True, "description": "Routes pushed to all clients"},
                "ip_settings": {"supported": True, "description": "IPv4 settings (ARP, forwarding, source-validation, ...)"},
                "ipv6_settings": {"supported": True, "description": "IPv6 settings (DAD, forwarding, autoconf, ...)"},
                "ipv6_address_interface_identifier": {
                    "supported": is_v15,
                    "description": "Manual IPv6 interface identifier (VyOS 1.5+)",
                },
                "mirror": {"supported": True, "description": "Mirror ingress/egress traffic"},
            },
        }

    # ========================================================================
    # Basic Interface Operations
    # ========================================================================

    def delete_interface(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_interface(interface))

    def set_interface_description(self, interface: str, description: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_description(interface, description))

    def delete_interface_description(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_description_path(interface))

    def set_interface_disable(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_disable(interface))

    def delete_interface_disable(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_disable(interface))

    def set_device_type(self, interface: str, device_type: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_device_type(interface, device_type))

    def delete_device_type(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_device_type_path(interface))

    def set_mode(self, interface: str, mode: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mode(interface, mode))

    def delete_mode(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mode_path(interface))

    def set_protocol(self, interface: str, protocol: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_protocol(interface, protocol))

    def delete_protocol(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_protocol_path(interface))

    def set_vrf(self, interface: str, vrf: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vrf(interface, vrf))

    def delete_vrf(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vrf_path(interface))

    def set_persistent_tunnel(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_persistent_tunnel(interface))

    def delete_persistent_tunnel(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_persistent_tunnel(interface))

    def set_use_lzo_compression(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_use_lzo_compression(interface))

    def delete_use_lzo_compression(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_use_lzo_compression(interface))

    def set_redirect(self, interface: str, destination: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_redirect(interface, destination))

    def delete_redirect(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_redirect_path(interface))

    def set_replace_default_route(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_replace_default_route(interface))

    def delete_replace_default_route(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_replace_default_route(interface))

    def set_replace_default_route_local(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_replace_default_route_local(interface))

    def delete_replace_default_route_local(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_replace_default_route_local(interface))

    def set_offload_dco(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_offload_dco(interface))

    def delete_offload_dco(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_offload_dco(interface))

    def set_openvpn_option(self, interface: str, option: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_openvpn_option(interface, option))

    def delete_openvpn_option(self, interface: str, option: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_openvpn_option(interface, option))

    def delete_openvpn_options(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_openvpn_option_path(interface))

    # ========================================================================
    # Authentication
    # ========================================================================

    def set_authentication_username(self, interface: str, username: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_authentication_username(interface, username))

    def delete_authentication_username(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_authentication_username_path(interface))

    def set_authentication_password(self, interface: str, password: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_authentication_password(interface, password))

    def delete_authentication_password(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_authentication_password_path(interface))

    def delete_authentication(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_authentication_path(interface))

    # ========================================================================
    # Local / Remote
    # ========================================================================

    def set_local_address(self, interface: str, address: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_local_address(interface, address))

    def delete_local_address(self, interface: str, address: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_local_address(interface, address))

    def set_local_address_subnet_mask(self, interface: str, address: str, mask: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_local_address_subnet_mask(interface, address, mask))

    def delete_local_address_subnet_mask(self, interface: str, address: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_local_address_subnet_mask_path(interface, address))

    def set_local_host(self, interface: str, host: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_local_host(interface, host))

    def delete_local_host(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_local_host_path(interface))

    def set_local_port(self, interface: str, port: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_local_port(interface, port))

    def delete_local_port(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_local_port_path(interface))

    def set_remote_address(self, interface: str, address: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_remote_address(interface, address))

    def delete_remote_address(self, interface: str, address: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_remote_address(interface, address))

    def set_remote_host(self, interface: str, host: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_remote_host(interface, host))

    def delete_remote_host(self, interface: str, host: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_remote_host(interface, host))

    def set_remote_port(self, interface: str, port: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_remote_port(interface, port))

    def delete_remote_port(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_remote_port_path(interface))

    # ========================================================================
    # Keep-alive
    # ========================================================================

    def set_keep_alive_failure_count(self, interface: str, count: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_keep_alive_failure_count(interface, count))

    def delete_keep_alive_failure_count(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_keep_alive_failure_count_path(interface))

    def set_keep_alive_interval(self, interface: str, interval: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_keep_alive_interval(interface, interval))

    def delete_keep_alive_interval(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_keep_alive_interval_path(interface))

    def delete_keep_alive(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_keep_alive_path(interface))

    # ========================================================================
    # Encryption
    # ========================================================================

    def set_encryption_cipher(self, interface: str, cipher: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_encryption_cipher(interface, cipher))

    def delete_encryption_cipher(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_encryption_cipher_path(interface))

    def set_hash(self, interface: str, hash_algo: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_hash(interface, hash_algo))

    def delete_hash(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_hash_path(interface))

    def set_encryption_data_cipher(self, interface: str, cipher: str) -> "OpenvpnInterfaceBuilderMixin":
        """Add a cipher to the negotiation list (ncp-ciphers on 1.4, data-ciphers on 1.5)."""
        return self.add_set(self._mapper().get_encryption_data_cipher(interface, cipher))

    def delete_encryption_data_cipher(self, interface: str, cipher: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_encryption_data_cipher(interface, cipher))

    def delete_encryption_data_ciphers(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_encryption_data_ciphers_path(interface))

    def set_encryption_data_ciphers_fallback(self, interface: str, cipher: str) -> "OpenvpnInterfaceBuilderMixin":
        """VyOS 1.5+ only."""
        return self.add_set(self._mapper().get_encryption_data_ciphers_fallback(interface, cipher))

    def delete_encryption_data_ciphers_fallback(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        """VyOS 1.5+ only."""
        return self.add_delete(self._mapper().get_encryption_data_ciphers_fallback_path(interface))

    # ========================================================================
    # TLS
    # ========================================================================

    def set_tls_auth_key(self, interface: str, key: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_tls_auth_key(interface, key))

    def delete_tls_auth_key(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_tls_auth_key_path(interface))

    def set_tls_ca_certificate(self, interface: str, cert: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_tls_ca_certificate(interface, cert))

    def delete_tls_ca_certificate(self, interface: str, cert: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_tls_ca_certificate(interface, cert))

    def set_tls_certificate(self, interface: str, cert: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_tls_certificate(interface, cert))

    def delete_tls_certificate(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_tls_certificate_path(interface))

    def set_tls_crypt_key(self, interface: str, key: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_tls_crypt_key(interface, key))

    def delete_tls_crypt_key(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_tls_crypt_key_path(interface))

    def set_tls_dh_params(self, interface: str, dh: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_tls_dh_params(interface, dh))

    def delete_tls_dh_params(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_tls_dh_params_path(interface))

    def set_tls_peer_fingerprint(self, interface: str, fingerprint: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_tls_peer_fingerprint(interface, fingerprint))

    def delete_tls_peer_fingerprint(self, interface: str, fingerprint: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_tls_peer_fingerprint(interface, fingerprint))

    def set_tls_role(self, interface: str, role: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_tls_role(interface, role))

    def delete_tls_role(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_tls_role_path(interface))

    def set_tls_version_min(self, interface: str, version: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_tls_version_min(interface, version))

    def delete_tls_version_min(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_tls_version_min_path(interface))

    def delete_tls(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_tls_path(interface))

    def set_shared_secret_key(self, interface: str, key: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_shared_secret_key(interface, key))

    def delete_shared_secret_key(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_shared_secret_key_path(interface))

    # ========================================================================
    # Server
    # ========================================================================

    def delete_server(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_path(interface))

    def set_server_subnet(self, interface: str, subnet: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_subnet(interface, subnet))

    def delete_server_subnet(self, interface: str, subnet: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_subnet(interface, subnet))

    def set_server_topology(self, interface: str, topology: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_topology(interface, topology))

    def delete_server_topology(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_topology_path(interface))

    def set_server_domain_name(self, interface: str, domain: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_domain_name(interface, domain))

    def delete_server_domain_name(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_domain_name_path(interface))

    def set_server_max_connections(self, interface: str, count: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_max_connections(interface, count))

    def delete_server_max_connections(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_max_connections_path(interface))

    def set_server_name_server(self, interface: str, ns: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_name_server(interface, ns))

    def delete_server_name_server(self, interface: str, ns: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_name_server(interface, ns))

    def set_server_reject_unconfigured_clients(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_reject_unconfigured_clients(interface))

    def delete_server_reject_unconfigured_clients(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_reject_unconfigured_clients(interface))

    def set_server_push_route(self, interface: str, route: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_push_route(interface, route))

    def delete_server_push_route(self, interface: str, route: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_push_route(interface, route))

    def set_server_push_route_metric(self, interface: str, route: str, metric: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_push_route_metric(interface, route, metric))

    def delete_server_push_route_metric(self, interface: str, route: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_push_route_metric_path(interface, route))

    # --- Server Bridge ---
    def set_server_bridge_gateway(self, interface: str, gateway: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_bridge_gateway(interface, gateway))

    def delete_server_bridge_gateway(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_bridge_gateway_path(interface))

    def set_server_bridge_start(self, interface: str, start: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_bridge_start(interface, start))

    def delete_server_bridge_start(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_bridge_start_path(interface))

    def set_server_bridge_stop(self, interface: str, stop: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_bridge_stop(interface, stop))

    def delete_server_bridge_stop(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_bridge_stop_path(interface))

    def set_server_bridge_subnet_mask(self, interface: str, mask: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_bridge_subnet_mask(interface, mask))

    def delete_server_bridge_subnet_mask(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_bridge_subnet_mask_path(interface))

    def set_server_bridge_disable(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_bridge_disable(interface))

    def delete_server_bridge_disable(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_bridge_disable(interface))

    def delete_server_bridge(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_bridge_path(interface))

    # --- Server Client IP Pool ---
    def set_server_client_ip_pool_start(self, interface: str, ip: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_client_ip_pool_start(interface, ip))

    def delete_server_client_ip_pool_start(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_client_ip_pool_start_path(interface))

    def set_server_client_ip_pool_stop(self, interface: str, ip: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_client_ip_pool_stop(interface, ip))

    def delete_server_client_ip_pool_stop(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_client_ip_pool_stop_path(interface))

    def set_server_client_ip_pool_subnet_mask(self, interface: str, mask: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_client_ip_pool_subnet_mask(interface, mask))

    def delete_server_client_ip_pool_subnet_mask(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_client_ip_pool_subnet_mask_path(interface))

    def set_server_client_ip_pool_disable(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_client_ip_pool_disable(interface))

    def delete_server_client_ip_pool_disable(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_client_ip_pool_disable(interface))

    def delete_server_client_ip_pool(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_client_ip_pool_path(interface))

    # --- Server Client IPv6 Pool ---
    def set_server_client_ipv6_pool_base(self, interface: str, prefix: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_client_ipv6_pool_base(interface, prefix))

    def delete_server_client_ipv6_pool_base(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_client_ipv6_pool_base_path(interface))

    def set_server_client_ipv6_pool_disable(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_client_ipv6_pool_disable(interface))

    def delete_server_client_ipv6_pool_disable(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_client_ipv6_pool_disable(interface))

    def delete_server_client_ipv6_pool(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_client_ipv6_pool_path(interface))

    # --- Server Client (per-client) ---
    def set_server_client(self, interface: str, client: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_client(interface, client))

    def delete_server_client(self, interface: str, client: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_client(interface, client))

    def set_server_client_disable(self, interface: str, client: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_client_disable(interface, client))

    def delete_server_client_disable(self, interface: str, client: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_client_disable(interface, client))

    def set_server_client_ip(self, interface: str, client: str, ip: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_client_ip(interface, client, ip))

    def delete_server_client_ip(self, interface: str, client: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_client_ip_path(interface, client))

    def set_server_client_push_route(self, interface: str, client: str, route: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_client_push_route(interface, client, route))

    def delete_server_client_push_route(self, interface: str, client: str, route: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_client_push_route(interface, client, route))

    def set_server_client_subnet(self, interface: str, client: str, subnet: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_client_subnet(interface, client, subnet))

    def delete_server_client_subnet(self, interface: str, client: str, subnet: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_client_subnet(interface, client, subnet))

    # --- Server MFA (TOTP) ---
    def set_server_mfa_totp_challenge(self, interface: str, challenge: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_mfa_totp_challenge(interface, challenge))

    def delete_server_mfa_totp_challenge(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_mfa_totp_challenge_path(interface))

    def set_server_mfa_totp_digits(self, interface: str, digits: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_mfa_totp_digits(interface, digits))

    def delete_server_mfa_totp_digits(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_mfa_totp_digits_path(interface))

    def set_server_mfa_totp_drift(self, interface: str, drift: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_mfa_totp_drift(interface, drift))

    def delete_server_mfa_totp_drift(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_mfa_totp_drift_path(interface))

    def set_server_mfa_totp_slop(self, interface: str, slop: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_mfa_totp_slop(interface, slop))

    def delete_server_mfa_totp_slop(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_mfa_totp_slop_path(interface))

    def set_server_mfa_totp_step(self, interface: str, step: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server_mfa_totp_step(interface, step))

    def delete_server_mfa_totp_step(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_mfa_totp_step_path(interface))

    def delete_server_mfa(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_mfa_path(interface))

    # ========================================================================
    # IP settings
    # ========================================================================

    def set_ip_adjust_mss(self, interface: str, mss: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_adjust_mss(interface, mss))

    def set_ip_adjust_mss_clamp_to_pmtu(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_adjust_mss_clamp_mss_to_pmtu(interface))

    def delete_ip_adjust_mss(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_adjust_mss_path(interface))

    def set_ip_arp_cache_timeout(self, interface: str, timeout: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_arp_cache_timeout(interface, timeout))

    def delete_ip_arp_cache_timeout(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_arp_cache_timeout_path(interface))

    def set_ip_disable_arp_filter(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_disable_arp_filter(interface))

    def delete_ip_disable_arp_filter(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_disable_arp_filter(interface))

    def set_ip_disable_forwarding(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_disable_forwarding(interface))

    def delete_ip_disable_forwarding(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_disable_forwarding(interface))

    def set_ip_enable_arp_accept(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_arp_accept(interface))

    def delete_ip_enable_arp_accept(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_arp_accept(interface))

    def set_ip_enable_arp_announce(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_arp_announce(interface))

    def delete_ip_enable_arp_announce(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_arp_announce(interface))

    def set_ip_enable_arp_ignore(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_arp_ignore(interface))

    def delete_ip_enable_arp_ignore(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_arp_ignore(interface))

    def set_ip_enable_directed_broadcast(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_directed_broadcast(interface))

    def delete_ip_enable_directed_broadcast(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_directed_broadcast(interface))

    def set_ip_enable_proxy_arp(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_enable_proxy_arp(interface))

    def delete_ip_enable_proxy_arp(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_enable_proxy_arp(interface))

    def set_ip_proxy_arp_pvlan(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_proxy_arp_pvlan(interface))

    def delete_ip_proxy_arp_pvlan(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_proxy_arp_pvlan(interface))

    def set_ip_source_validation(self, interface: str, mode: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ip_source_validation(interface, mode))

    def delete_ip_source_validation(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_source_validation_path(interface))

    def delete_ip_settings(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ip_path(interface))

    # ========================================================================
    # IPv6 settings
    # ========================================================================

    def set_ipv6_accept_dad(self, interface: str, count: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_accept_dad(interface, count))

    def delete_ipv6_accept_dad(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_accept_dad_path(interface))

    def set_ipv6_address_autoconf(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_address_autoconf(interface))

    def delete_ipv6_address_autoconf(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_address_autoconf(interface))

    def set_ipv6_address_eui64(self, interface: str, prefix: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_address_eui64(interface, prefix))

    def delete_ipv6_address_eui64(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_address_eui64_path(interface))

    def set_ipv6_address_no_default_link_local(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_address_no_default_link_local(interface))

    def delete_ipv6_address_no_default_link_local(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_address_no_default_link_local(interface))

    def set_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> "OpenvpnInterfaceBuilderMixin":
        """VyOS 1.5+ only."""
        return self.add_set(self._mapper().get_ipv6_address_interface_identifier(interface, identifier))

    def delete_ipv6_address_interface_identifier(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        """VyOS 1.5+ only."""
        return self.add_delete(self._mapper().get_ipv6_address_interface_identifier_path(interface))

    def set_ipv6_adjust_mss(self, interface: str, mss: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_adjust_mss(interface, mss))

    def set_ipv6_adjust_mss_clamp_to_pmtu(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_adjust_mss_clamp_mss_to_pmtu(interface))

    def delete_ipv6_adjust_mss(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_adjust_mss_path(interface))

    def set_ipv6_base_reachable_time(self, interface: str, time: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_base_reachable_time(interface, time))

    def delete_ipv6_base_reachable_time(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_base_reachable_time_path(interface))

    def set_ipv6_disable_forwarding(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_disable_forwarding(interface))

    def delete_ipv6_disable_forwarding(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_disable_forwarding(interface))

    def set_ipv6_dup_addr_detect_transmits(self, interface: str, count: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_dup_addr_detect_transmits(interface, count))

    def delete_ipv6_dup_addr_detect_transmits(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_dup_addr_detect_transmits_path(interface))

    def set_ipv6_source_validation(self, interface: str, mode: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ipv6_source_validation(interface, mode))

    def delete_ipv6_source_validation(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_source_validation_path(interface))

    def delete_ipv6_settings(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ipv6_path(interface))

    # ========================================================================
    # Mirror
    # ========================================================================

    def set_mirror_ingress(self, interface: str, destination: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mirror_ingress(interface, destination))

    def delete_mirror_ingress(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mirror_ingress_path(interface))

    def set_mirror_egress(self, interface: str, destination: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mirror_egress(interface, destination))

    def delete_mirror_egress(self, interface: str) -> "OpenvpnInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mirror_egress_path(interface))
