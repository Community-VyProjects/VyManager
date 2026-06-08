"""
OpenVPN Interface Command Mapper

Handles OpenVPN interface commands for VyOS.
OpenVPN provides secure tunneling with site-to-site, client, and server modes.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class OpenvpnInterfaceMapper(BaseFeatureMapper):
    """OpenVPN interface mapper with all OpenVPN interface operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "openvpn"

    # ========================================================================
    # Internal helpers
    # ========================================================================

    def _base(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface]

    # ========================================================================
    # Basic Interface
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        return self._base(interface)

    def get_description(self, interface: str, description: str) -> List[str]:
        return self._base(interface) + ["description", description]

    def get_description_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["description"]

    def get_disable(self, interface: str) -> List[str]:
        return self._base(interface) + ["disable"]

    def get_device_type(self, interface: str, device_type: str) -> List[str]:
        return self._base(interface) + ["device-type", device_type]

    def get_device_type_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["device-type"]

    def get_mode(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["mode", mode]

    def get_mode_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mode"]

    def get_protocol(self, interface: str, protocol: str) -> List[str]:
        return self._base(interface) + ["protocol", protocol]

    def get_protocol_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["protocol"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        return self._base(interface) + ["vrf", vrf]

    def get_vrf_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["vrf"]

    def get_persistent_tunnel(self, interface: str) -> List[str]:
        return self._base(interface) + ["persistent-tunnel"]

    def get_use_lzo_compression(self, interface: str) -> List[str]:
        return self._base(interface) + ["use-lzo-compression"]

    def get_redirect(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["redirect", destination]

    def get_redirect_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["redirect"]

    def get_replace_default_route(self, interface: str) -> List[str]:
        return self._base(interface) + ["replace-default-route"]

    def get_replace_default_route_local(self, interface: str) -> List[str]:
        return self._base(interface) + ["replace-default-route", "local"]

    def get_offload_dco(self, interface: str) -> List[str]:
        return self._base(interface) + ["offload", "dco"]

    def get_openvpn_option(self, interface: str, option: str) -> List[str]:
        return self._base(interface) + ["openvpn-option", option]

    def get_openvpn_option_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["openvpn-option"]

    # ========================================================================
    # Authentication
    # ========================================================================

    def get_authentication_username(self, interface: str, username: str) -> List[str]:
        return self._base(interface) + ["authentication", "username", username]

    def get_authentication_username_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["authentication", "username"]

    def get_authentication_password(self, interface: str, password: str) -> List[str]:
        return self._base(interface) + ["authentication", "password", password]

    def get_authentication_password_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["authentication", "password"]

    def get_authentication_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["authentication"]

    # ========================================================================
    # Local / Remote Addressing
    # ========================================================================

    def get_local_address(self, interface: str, address: str) -> List[str]:
        return self._base(interface) + ["local-address", address]

    def get_local_address_subnet_mask(self, interface: str, address: str, mask: str) -> List[str]:
        return self._base(interface) + ["local-address", address, "subnet-mask", mask]

    def get_local_address_subnet_mask_path(self, interface: str, address: str) -> List[str]:
        return self._base(interface) + ["local-address", address, "subnet-mask"]

    def get_local_host(self, interface: str, host: str) -> List[str]:
        return self._base(interface) + ["local-host", host]

    def get_local_host_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["local-host"]

    def get_local_port(self, interface: str, port: str) -> List[str]:
        return self._base(interface) + ["local-port", port]

    def get_local_port_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["local-port"]

    def get_remote_address(self, interface: str, address: str) -> List[str]:
        return self._base(interface) + ["remote-address", address]

    def get_remote_address_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["remote-address"]

    def get_remote_host(self, interface: str, host: str) -> List[str]:
        return self._base(interface) + ["remote-host", host]

    def get_remote_host_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["remote-host"]

    def get_remote_port(self, interface: str, port: str) -> List[str]:
        return self._base(interface) + ["remote-port", port]

    def get_remote_port_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["remote-port"]

    # ========================================================================
    # Keep-alive
    # ========================================================================

    def get_keep_alive_failure_count(self, interface: str, count: str) -> List[str]:
        return self._base(interface) + ["keep-alive", "failure-count", count]

    def get_keep_alive_failure_count_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["keep-alive", "failure-count"]

    def get_keep_alive_interval(self, interface: str, interval: str) -> List[str]:
        return self._base(interface) + ["keep-alive", "interval", interval]

    def get_keep_alive_interval_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["keep-alive", "interval"]

    def get_keep_alive_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["keep-alive"]

    # ========================================================================
    # Encryption (common - cipher + hash)
    # Version-specific: data-ciphers / ncp-ciphers / data-ciphers-fallback
    # ========================================================================

    def get_encryption_cipher(self, interface: str, cipher: str) -> List[str]:
        return self._base(interface) + ["encryption", "cipher", cipher]

    def get_encryption_cipher_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["encryption", "cipher"]

    def get_hash(self, interface: str, hash_algo: str) -> List[str]:
        return self._base(interface) + ["hash", hash_algo]

    def get_hash_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["hash"]

    # Version-specific overrides implement data cipher negotiation list:
    # - 1.4: uses "ncp-ciphers" (no fallback)
    # - 1.5: uses "data-ciphers" + "data-ciphers-fallback"
    def get_encryption_data_cipher(self, interface: str, cipher: str) -> List[str]:
        raise NotImplementedError("Override in version-specific mapper")

    def get_encryption_data_ciphers_path(self, interface: str) -> List[str]:
        raise NotImplementedError("Override in version-specific mapper")

    def get_encryption_data_ciphers_fallback(self, interface: str, cipher: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_encryption_data_ciphers_fallback_path(self, interface: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    # ========================================================================
    # TLS
    # ========================================================================

    def get_tls_auth_key(self, interface: str, key: str) -> List[str]:
        return self._base(interface) + ["tls", "auth-key", key]

    def get_tls_auth_key_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["tls", "auth-key"]

    def get_tls_ca_certificate(self, interface: str, cert: str) -> List[str]:
        return self._base(interface) + ["tls", "ca-certificate", cert]

    def get_tls_ca_certificate_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["tls", "ca-certificate"]

    def get_tls_certificate(self, interface: str, cert: str) -> List[str]:
        return self._base(interface) + ["tls", "certificate", cert]

    def get_tls_certificate_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["tls", "certificate"]

    def get_tls_crypt_key(self, interface: str, key: str) -> List[str]:
        return self._base(interface) + ["tls", "crypt-key", key]

    def get_tls_crypt_key_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["tls", "crypt-key"]

    def get_tls_dh_params(self, interface: str, dh: str) -> List[str]:
        return self._base(interface) + ["tls", "dh-params", dh]

    def get_tls_dh_params_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["tls", "dh-params"]

    def get_tls_peer_fingerprint(self, interface: str, fingerprint: str) -> List[str]:
        return self._base(interface) + ["tls", "peer-fingerprint", fingerprint]

    def get_tls_peer_fingerprint_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["tls", "peer-fingerprint"]

    def get_tls_role(self, interface: str, role: str) -> List[str]:
        return self._base(interface) + ["tls", "role", role]

    def get_tls_role_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["tls", "role"]

    def get_tls_version_min(self, interface: str, version: str) -> List[str]:
        return self._base(interface) + ["tls", "tls-version-min", version]

    def get_tls_version_min_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["tls", "tls-version-min"]

    def get_tls_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["tls"]

    def get_shared_secret_key(self, interface: str, key: str) -> List[str]:
        return self._base(interface) + ["shared-secret-key", key]

    def get_shared_secret_key_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["shared-secret-key"]

    # ========================================================================
    # Server
    # ========================================================================

    def get_server_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server"]

    def get_server_subnet(self, interface: str, subnet: str) -> List[str]:
        return self._base(interface) + ["server", "subnet", subnet]

    def get_server_subnet_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "subnet"]

    def get_server_topology(self, interface: str, topology: str) -> List[str]:
        return self._base(interface) + ["server", "topology", topology]

    def get_server_topology_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "topology"]

    def get_server_domain_name(self, interface: str, domain: str) -> List[str]:
        return self._base(interface) + ["server", "domain-name", domain]

    def get_server_domain_name_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "domain-name"]

    def get_server_max_connections(self, interface: str, count: str) -> List[str]:
        return self._base(interface) + ["server", "max-connections", count]

    def get_server_max_connections_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "max-connections"]

    def get_server_name_server(self, interface: str, ns: str) -> List[str]:
        return self._base(interface) + ["server", "name-server", ns]

    def get_server_name_server_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "name-server"]

    def get_server_reject_unconfigured_clients(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "reject-unconfigured-clients"]

    def get_server_push_route(self, interface: str, route: str) -> List[str]:
        return self._base(interface) + ["server", "push-route", route]

    def get_server_push_route_metric(self, interface: str, route: str, metric: str) -> List[str]:
        return self._base(interface) + ["server", "push-route", route, "metric", metric]

    def get_server_push_route_metric_path(self, interface: str, route: str) -> List[str]:
        return self._base(interface) + ["server", "push-route", route, "metric"]

    # --- Server Bridge ---
    def get_server_bridge_gateway(self, interface: str, gateway: str) -> List[str]:
        return self._base(interface) + ["server", "bridge", "gateway", gateway]

    def get_server_bridge_gateway_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "bridge", "gateway"]

    def get_server_bridge_start(self, interface: str, start: str) -> List[str]:
        return self._base(interface) + ["server", "bridge", "start", start]

    def get_server_bridge_start_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "bridge", "start"]

    def get_server_bridge_stop(self, interface: str, stop: str) -> List[str]:
        return self._base(interface) + ["server", "bridge", "stop", stop]

    def get_server_bridge_stop_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "bridge", "stop"]

    def get_server_bridge_subnet_mask(self, interface: str, mask: str) -> List[str]:
        return self._base(interface) + ["server", "bridge", "subnet-mask", mask]

    def get_server_bridge_subnet_mask_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "bridge", "subnet-mask"]

    def get_server_bridge_disable(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "bridge", "disable"]

    def get_server_bridge_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "bridge"]

    # --- Server Client-IP-Pool ---
    def get_server_client_ip_pool_start(self, interface: str, ip: str) -> List[str]:
        return self._base(interface) + ["server", "client-ip-pool", "start", ip]

    def get_server_client_ip_pool_start_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "client-ip-pool", "start"]

    def get_server_client_ip_pool_stop(self, interface: str, ip: str) -> List[str]:
        return self._base(interface) + ["server", "client-ip-pool", "stop", ip]

    def get_server_client_ip_pool_stop_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "client-ip-pool", "stop"]

    def get_server_client_ip_pool_subnet_mask(self, interface: str, mask: str) -> List[str]:
        return self._base(interface) + ["server", "client-ip-pool", "subnet-mask", mask]

    def get_server_client_ip_pool_subnet_mask_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "client-ip-pool", "subnet-mask"]

    def get_server_client_ip_pool_disable(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "client-ip-pool", "disable"]

    def get_server_client_ip_pool_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "client-ip-pool"]

    # --- Server Client-IPv6-Pool ---
    def get_server_client_ipv6_pool_base(self, interface: str, prefix: str) -> List[str]:
        return self._base(interface) + ["server", "client-ipv6-pool", "base", prefix]

    def get_server_client_ipv6_pool_base_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "client-ipv6-pool", "base"]

    def get_server_client_ipv6_pool_disable(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "client-ipv6-pool", "disable"]

    def get_server_client_ipv6_pool_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "client-ipv6-pool"]

    # --- Server Client (per-client config) ---
    def get_server_client(self, interface: str, client: str) -> List[str]:
        return self._base(interface) + ["server", "client", client]

    def get_server_client_disable(self, interface: str, client: str) -> List[str]:
        return self._base(interface) + ["server", "client", client, "disable"]

    def get_server_client_ip(self, interface: str, client: str, ip: str) -> List[str]:
        return self._base(interface) + ["server", "client", client, "ip", ip]

    def get_server_client_ip_path(self, interface: str, client: str) -> List[str]:
        return self._base(interface) + ["server", "client", client, "ip"]

    def get_server_client_push_route(self, interface: str, client: str, route: str) -> List[str]:
        return self._base(interface) + ["server", "client", client, "push-route", route]

    def get_server_client_push_route_path(self, interface: str, client: str) -> List[str]:
        return self._base(interface) + ["server", "client", client, "push-route"]

    def get_server_client_subnet(self, interface: str, client: str, subnet: str) -> List[str]:
        return self._base(interface) + ["server", "client", client, "subnet", subnet]

    def get_server_client_subnet_path(self, interface: str, client: str) -> List[str]:
        return self._base(interface) + ["server", "client", client, "subnet"]

    # --- Server MFA (TOTP) ---
    def get_server_mfa_totp_challenge(self, interface: str, challenge: str) -> List[str]:
        return self._base(interface) + ["server", "mfa", "totp", "challenge", challenge]

    def get_server_mfa_totp_challenge_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "mfa", "totp", "challenge"]

    def get_server_mfa_totp_digits(self, interface: str, digits: str) -> List[str]:
        return self._base(interface) + ["server", "mfa", "totp", "digits", digits]

    def get_server_mfa_totp_digits_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "mfa", "totp", "digits"]

    def get_server_mfa_totp_drift(self, interface: str, drift: str) -> List[str]:
        return self._base(interface) + ["server", "mfa", "totp", "drift", drift]

    def get_server_mfa_totp_drift_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "mfa", "totp", "drift"]

    def get_server_mfa_totp_slop(self, interface: str, slop: str) -> List[str]:
        return self._base(interface) + ["server", "mfa", "totp", "slop", slop]

    def get_server_mfa_totp_slop_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "mfa", "totp", "slop"]

    def get_server_mfa_totp_step(self, interface: str, step: str) -> List[str]:
        return self._base(interface) + ["server", "mfa", "totp", "step", step]

    def get_server_mfa_totp_step_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "mfa", "totp", "step"]

    def get_server_mfa_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server", "mfa"]

    # ========================================================================
    # IP settings
    # ========================================================================

    def get_ip_adjust_mss(self, interface: str, mss: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss", mss]

    def get_ip_adjust_mss_clamp_mss_to_pmtu(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss", "clamp-mss-to-pmtu"]

    def get_ip_adjust_mss_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "adjust-mss"]

    def get_ip_arp_cache_timeout(self, interface: str, timeout: str) -> List[str]:
        return self._base(interface) + ["ip", "arp-cache-timeout", timeout]

    def get_ip_arp_cache_timeout_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "arp-cache-timeout"]

    def get_ip_disable_arp_filter(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "disable-arp-filter"]

    def get_ip_disable_forwarding(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "disable-forwarding"]

    def get_ip_enable_arp_accept(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "enable-arp-accept"]

    def get_ip_enable_arp_announce(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "enable-arp-announce"]

    def get_ip_enable_arp_ignore(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "enable-arp-ignore"]

    def get_ip_enable_directed_broadcast(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "enable-directed-broadcast"]

    def get_ip_enable_proxy_arp(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "enable-proxy-arp"]

    def get_ip_proxy_arp_pvlan(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "proxy-arp-pvlan"]

    def get_ip_source_validation(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation", mode]

    def get_ip_source_validation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip", "source-validation"]

    def get_ip_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ip"]

    # ========================================================================
    # IPv6 settings
    # ========================================================================

    def get_ipv6_accept_dad(self, interface: str, count: str) -> List[str]:
        return self._base(interface) + ["ipv6", "accept-dad", count]

    def get_ipv6_accept_dad_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "accept-dad"]

    def get_ipv6_address_autoconf(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "autoconf"]

    def get_ipv6_address_eui64(self, interface: str, prefix: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "eui64", prefix]

    def get_ipv6_address_eui64_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "eui64"]

    def get_ipv6_address_no_default_link_local(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "address", "no-default-link-local"]

    # Only supported on VyOS 1.5+ - version-specific override raises on 1.4
    def get_ipv6_address_interface_identifier(self, interface: str, identifier: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_ipv6_address_interface_identifier_path(self, interface: str) -> List[str]:
        raise NotImplementedError("Only supported on VyOS 1.5+")

    def get_ipv6_adjust_mss(self, interface: str, mss: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss", mss]

    def get_ipv6_adjust_mss_clamp_mss_to_pmtu(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss", "clamp-mss-to-pmtu"]

    def get_ipv6_adjust_mss_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "adjust-mss"]

    def get_ipv6_base_reachable_time(self, interface: str, time: str) -> List[str]:
        return self._base(interface) + ["ipv6", "base-reachable-time", time]

    def get_ipv6_base_reachable_time_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "base-reachable-time"]

    def get_ipv6_disable_forwarding(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "disable-forwarding"]

    def get_ipv6_dup_addr_detect_transmits(self, interface: str, count: str) -> List[str]:
        return self._base(interface) + ["ipv6", "dup-addr-detect-transmits", count]

    def get_ipv6_dup_addr_detect_transmits_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "dup-addr-detect-transmits"]

    def get_ipv6_source_validation(self, interface: str, mode: str) -> List[str]:
        return self._base(interface) + ["ipv6", "source-validation", mode]

    def get_ipv6_source_validation_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6", "source-validation"]

    def get_ipv6_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ipv6"]

    # ========================================================================
    # Mirror
    # ========================================================================

    def get_mirror_ingress(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress", destination]

    def get_mirror_ingress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "ingress"]

    def get_mirror_egress(self, interface: str, destination: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress", destination]

    def get_mirror_egress_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mirror", "egress"]

    # ========================================================================
    # Config Parsing (normalized for both versions)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single OpenVPN interface. Normalizes 1.4/1.5 differences."""
        ip_config = config.get("ip", {}) or {}
        ipv6_config = config.get("ipv6", {}) or {}
        ipv6_address = ipv6_config.get("address", {}) or {}
        mirror_config = config.get("mirror", {}) or {}
        encryption_config = config.get("encryption", {}) or {}
        tls_config = config.get("tls", {}) or {}
        server_config = config.get("server", {}) or {}
        server_bridge = server_config.get("bridge", {}) or {}
        server_client_ip_pool = server_config.get("client-ip-pool", {}) or {}
        server_client_ipv6_pool = server_config.get("client-ipv6-pool", {}) or {}
        server_mfa = server_config.get("mfa", {}) or {}
        server_mfa_totp = server_mfa.get("totp", {}) or {}
        auth_config = config.get("authentication", {}) or {}
        keep_alive = config.get("keep-alive", {}) or {}
        offload_config = config.get("offload", {}) or {}

        # Encryption normalization: expose both legacy cipher and data-cipher list
        # 1.4 uses "ncp-ciphers", 1.5 uses "data-ciphers" (+ fallback).
        data_ciphers_raw = encryption_config.get("data-ciphers") or encryption_config.get("ncp-ciphers")
        if isinstance(data_ciphers_raw, list):
            data_ciphers = data_ciphers_raw
        elif isinstance(data_ciphers_raw, str):
            data_ciphers = [data_ciphers_raw]
        else:
            data_ciphers = []

        # local-address is a tag - may have subnet-mask as child
        local_addresses = []
        raw_local = config.get("local-address", {}) or {}
        if isinstance(raw_local, dict):
            for addr, addr_cfg in raw_local.items():
                if isinstance(addr_cfg, dict):
                    local_addresses.append({
                        "address": addr,
                        "subnet_mask": addr_cfg.get("subnet-mask"),
                    })
                else:
                    local_addresses.append({"address": addr, "subnet_mask": None})

        # remote-address / remote-host are multi-value lists
        def _as_list(val: Any) -> List[str]:
            if isinstance(val, list):
                return val
            if isinstance(val, str):
                return [val]
            return []

        # Parse per-client config
        clients = []
        raw_clients = server_config.get("client", {}) or {}
        for client_name, client_cfg in raw_clients.items():
            if not isinstance(client_cfg, dict):
                continue
            clients.append({
                "name": client_name,
                "disable": "disable" in client_cfg,
                "ip": client_cfg.get("ip"),
                "push_route": _as_list(client_cfg.get("push-route")),
                "subnet": _as_list(client_cfg.get("subnet")),
            })

        # Parse server push-route (tag nodes with optional metric)
        server_push_routes = []
        raw_server_routes = server_config.get("push-route", {}) or {}
        if isinstance(raw_server_routes, dict):
            for route, route_cfg in raw_server_routes.items():
                if isinstance(route_cfg, dict):
                    server_push_routes.append({
                        "route": route,
                        "metric": route_cfg.get("metric"),
                    })
                else:
                    server_push_routes.append({"route": route, "metric": None})

        # Peer fingerprints (multi)
        peer_fingerprints = _as_list(tls_config.get("peer-fingerprint"))

        return {
            "name": name,
            "type": self.interface_type,
            "description": config.get("description"),
            "disabled": "disable" in config,
            "device_type": config.get("device-type"),
            "mode": config.get("mode"),
            "protocol": config.get("protocol"),
            "vrf": config.get("vrf"),
            "persistent_tunnel": "persistent-tunnel" in config,
            "use_lzo_compression": "use-lzo-compression" in config,
            "redirect": config.get("redirect"),
            "replace_default_route": {
                "enabled": "replace-default-route" in config,
                "local": isinstance(config.get("replace-default-route"), dict)
                    and "local" in (config.get("replace-default-route") or {}),
            } if "replace-default-route" in config else None,
            "offload_dco": "dco" in offload_config,
            "openvpn_options": _as_list(config.get("openvpn-option")),
            "authentication": {
                "username": auth_config.get("username"),
                "password": auth_config.get("password"),
            } if auth_config else None,
            "local_addresses": local_addresses,
            "local_host": config.get("local-host"),
            "local_port": config.get("local-port"),
            "remote_address": _as_list(config.get("remote-address")),
            "remote_host": _as_list(config.get("remote-host")),
            "remote_port": config.get("remote-port"),
            "keep_alive": {
                "failure_count": keep_alive.get("failure-count"),
                "interval": keep_alive.get("interval"),
            } if keep_alive else None,
            "shared_secret_key": config.get("shared-secret-key"),
            "encryption": {
                "cipher": encryption_config.get("cipher"),
                "data_ciphers": data_ciphers,
                "data_ciphers_fallback": encryption_config.get("data-ciphers-fallback"),
            },
            "hash": config.get("hash"),
            "tls": {
                "auth_key": tls_config.get("auth-key"),
                "ca_certificates": _as_list(tls_config.get("ca-certificate")),
                "certificate": tls_config.get("certificate"),
                "crypt_key": tls_config.get("crypt-key"),
                "dh_params": tls_config.get("dh-params"),
                "peer_fingerprints": peer_fingerprints,
                "role": tls_config.get("role"),
                "tls_version_min": tls_config.get("tls-version-min"),
            } if tls_config else None,
            "server": {
                "subnet": _as_list(server_config.get("subnet")),
                "topology": server_config.get("topology"),
                "domain_name": server_config.get("domain-name"),
                "max_connections": server_config.get("max-connections"),
                "name_server": _as_list(server_config.get("name-server")),
                "reject_unconfigured_clients": "reject-unconfigured-clients" in server_config,
                "push_route": server_push_routes,
                "bridge": {
                    "gateway": server_bridge.get("gateway"),
                    "start": server_bridge.get("start"),
                    "stop": server_bridge.get("stop"),
                    "subnet_mask": server_bridge.get("subnet-mask"),
                    "disable": "disable" in server_bridge,
                } if server_bridge else None,
                "client_ip_pool": {
                    "start": server_client_ip_pool.get("start"),
                    "stop": server_client_ip_pool.get("stop"),
                    "subnet_mask": server_client_ip_pool.get("subnet-mask"),
                    "disable": "disable" in server_client_ip_pool,
                } if server_client_ip_pool else None,
                "client_ipv6_pool": {
                    "base": server_client_ipv6_pool.get("base"),
                    "disable": "disable" in server_client_ipv6_pool,
                } if server_client_ipv6_pool else None,
                "clients": clients,
                "mfa_totp": {
                    "challenge": server_mfa_totp.get("challenge"),
                    "digits": server_mfa_totp.get("digits"),
                    "drift": server_mfa_totp.get("drift"),
                    "slop": server_mfa_totp.get("slop"),
                    "step": server_mfa_totp.get("step"),
                } if server_mfa_totp else None,
            } if server_config else None,
            "ip": {
                "adjust_mss": ip_config.get("adjust-mss"),
                "arp_cache_timeout": ip_config.get("arp-cache-timeout"),
                "disable_arp_filter": "disable-arp-filter" in ip_config,
                "disable_forwarding": "disable-forwarding" in ip_config,
                "enable_arp_accept": "enable-arp-accept" in ip_config,
                "enable_arp_announce": "enable-arp-announce" in ip_config,
                "enable_arp_ignore": "enable-arp-ignore" in ip_config,
                "enable_directed_broadcast": "enable-directed-broadcast" in ip_config,
                "enable_proxy_arp": "enable-proxy-arp" in ip_config,
                "proxy_arp_pvlan": "proxy-arp-pvlan" in ip_config,
                "source_validation": ip_config.get("source-validation"),
            },
            "ipv6": {
                "accept_dad": ipv6_config.get("accept-dad"),
                "address_autoconf": "autoconf" in ipv6_address,
                "address_eui64": ipv6_address.get("eui64"),
                "address_no_default_link_local": "no-default-link-local" in ipv6_address,
                "address_interface_identifier": ipv6_address.get("interface-identifier"),
                "adjust_mss": ipv6_config.get("adjust-mss"),
                "base_reachable_time": ipv6_config.get("base-reachable-time"),
                "disable_forwarding": "disable-forwarding" in ipv6_config,
                "dup_addr_detect_transmits": ipv6_config.get("dup-addr-detect-transmits"),
                "source_validation": ipv6_config.get("source-validation"),
            },
            "mirror_ingress": mirror_config.get("ingress"),
            "mirror_egress": mirror_config.get("egress"),
        }

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse all OpenVPN interfaces."""
        interfaces = []
        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue
            interfaces.append(self.parse_single_interface(iface_name, iface_config))

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
        }
