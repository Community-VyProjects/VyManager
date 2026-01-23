"""
OpenVPN Command Mapper

Handles OpenVPN commands for VyOS configuration.
Supports server mode, site-to-site, and client modes.
"""

from typing import List, Dict, Any, Optional
from ..base import BaseFeatureMapper


class OpenVPNMapper(BaseFeatureMapper):
    """OpenVPN mapper with all OpenVPN operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Interface Commands (vtunX)
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        """Get command path for creating an OpenVPN interface."""
        return ["interfaces", "openvpn", interface]

    def get_mode(self, interface: str, mode: str) -> List[str]:
        """Get command path for mode (server, site-to-site, client)."""
        return ["interfaces", "openvpn", interface, "mode", mode]

    def get_description(self, interface: str, description: str) -> List[str]:
        """Get command path for description."""
        return ["interfaces", "openvpn", interface, "description", description]

    def get_description_path(self, interface: str) -> List[str]:
        """Get command path for description (for deletion)."""
        return ["interfaces", "openvpn", interface, "description"]

    def get_disable(self, interface: str) -> List[str]:
        """Get command path for disabling interface."""
        return ["interfaces", "openvpn", interface, "disable"]

    # ========================================================================
    # Network Configuration
    # ========================================================================

    def get_local_address(self, interface: str, address: str) -> List[str]:
        """Get command path for local address."""
        return ["interfaces", "openvpn", interface, "local-address", address]

    def get_remote_address(self, interface: str, address: str) -> List[str]:
        """Get command path for remote address."""
        return ["interfaces", "openvpn", interface, "remote-address", address]

    def get_local_host(self, interface: str, host: str) -> List[str]:
        """Get command path for local host (bind address)."""
        return ["interfaces", "openvpn", interface, "local-host", host]

    def get_local_port(self, interface: str, port: str) -> List[str]:
        """Get command path for local port."""
        return ["interfaces", "openvpn", interface, "local-port", port]

    def get_remote_host(self, interface: str, host: str) -> List[str]:
        """Get command path for remote host."""
        return ["interfaces", "openvpn", interface, "remote-host", host]

    def get_remote_port(self, interface: str, port: str) -> List[str]:
        """Get command path for remote port."""
        return ["interfaces", "openvpn", interface, "remote-port", port]

    def get_protocol(self, interface: str, protocol: str) -> List[str]:
        """Get command path for protocol (udp, tcp-passive, tcp-active)."""
        return ["interfaces", "openvpn", interface, "protocol", protocol]

    def get_device_type(self, interface: str, device_type: str) -> List[str]:
        """Get command path for device type (tun, tap)."""
        return ["interfaces", "openvpn", interface, "device-type", device_type]

    # ========================================================================
    # Server Mode Configuration
    # ========================================================================

    def get_server_subnet(self, interface: str, subnet: str) -> List[str]:
        """Get command path for server subnet."""
        return ["interfaces", "openvpn", interface, "server", "subnet", subnet]

    def get_server_client(self, interface: str, client: str) -> List[str]:
        """Get command path for server client configuration."""
        return ["interfaces", "openvpn", interface, "server", "client", client]

    def get_server_client_ip(self, interface: str, client: str, ip: str) -> List[str]:
        """Get command path for client IP assignment."""
        return ["interfaces", "openvpn", interface, "server", "client", client, "ip", ip]

    def get_server_client_subnet(self, interface: str, client: str, subnet: str) -> List[str]:
        """Get command path for client subnet (iroute)."""
        return ["interfaces", "openvpn", interface, "server", "client", client, "subnet", subnet]

    def get_server_client_disable(self, interface: str, client: str) -> List[str]:
        """Get command path for disabling a client."""
        return ["interfaces", "openvpn", interface, "server", "client", client, "disable"]

    def get_server_name_server(self, interface: str, ns: str) -> List[str]:
        """Get command path for pushing DNS server to clients."""
        return ["interfaces", "openvpn", interface, "server", "name-server", ns]

    def get_server_domain_name(self, interface: str, domain: str) -> List[str]:
        """Get command path for pushing domain name to clients."""
        return ["interfaces", "openvpn", interface, "server", "domain-name", domain]

    def get_server_push_route(self, interface: str, route: str) -> List[str]:
        """Get command path for pushing route to clients."""
        return ["interfaces", "openvpn", interface, "server", "push-route", route]

    def get_server_max_connections(self, interface: str, max_conn: str) -> List[str]:
        """Get command path for max connections."""
        return ["interfaces", "openvpn", interface, "server", "max-connections", max_conn]

    def get_server_topology(self, interface: str, topology: str) -> List[str]:
        """Get command path for server topology (subnet, net30)."""
        return ["interfaces", "openvpn", interface, "server", "topology", topology]

    def get_server_mfa_totp(self, interface: str) -> List[str]:
        """Get command path for enabling TOTP MFA."""
        return ["interfaces", "openvpn", interface, "server", "mfa", "totp"]

    # ========================================================================
    # Encryption and Security
    # ========================================================================

    def get_encryption(self, interface: str, cipher: str) -> List[str]:
        """Get command path for encryption cipher."""
        return ["interfaces", "openvpn", interface, "encryption", cipher]

    def get_hash(self, interface: str, hash_algo: str) -> List[str]:
        """Get command path for hash algorithm."""
        return ["interfaces", "openvpn", interface, "hash", hash_algo]

    def get_shared_secret_key(self, interface: str, key: str) -> List[str]:
        """Get command path for shared secret key file."""
        return ["interfaces", "openvpn", interface, "shared-secret-key", key]

    # ========================================================================
    # TLS Configuration
    # ========================================================================

    def get_tls_ca_certificate(self, interface: str, ca_cert: str) -> List[str]:
        """Get command path for TLS CA certificate."""
        return ["interfaces", "openvpn", interface, "tls", "ca-certificate", ca_cert]

    def get_tls_certificate(self, interface: str, cert: str) -> List[str]:
        """Get command path for TLS certificate."""
        return ["interfaces", "openvpn", interface, "tls", "certificate", cert]

    def get_tls_dh_params(self, interface: str, dh_params: str) -> List[str]:
        """Get command path for TLS DH parameters."""
        return ["interfaces", "openvpn", interface, "tls", "dh-params", dh_params]

    def get_tls_crl_file(self, interface: str, crl_file: str) -> List[str]:
        """Get command path for TLS CRL file."""
        return ["interfaces", "openvpn", interface, "tls", "crl-file", crl_file]

    def get_tls_auth_key(self, interface: str, key: str) -> List[str]:
        """Get command path for TLS auth key."""
        return ["interfaces", "openvpn", interface, "tls", "auth-key", key]

    def get_tls_crypt_key(self, interface: str, key: str) -> List[str]:
        """Get command path for TLS crypt key."""
        return ["interfaces", "openvpn", interface, "tls", "crypt-key", key]

    def get_tls_role(self, interface: str, role: str) -> List[str]:
        """Get command path for TLS role (active, passive)."""
        return ["interfaces", "openvpn", interface, "tls", "role", role]

    # ========================================================================
    # Authentication
    # ========================================================================

    def get_authentication_username(self, interface: str, username: str) -> List[str]:
        """Get command path for username authentication."""
        return ["interfaces", "openvpn", interface, "authentication", "username", username]

    def get_authentication_password(self, interface: str, password: str) -> List[str]:
        """Get command path for password authentication."""
        return ["interfaces", "openvpn", interface, "authentication", "password", password]

    # ========================================================================
    # Advanced Options
    # ========================================================================

    def get_keep_alive_failure(self, interface: str, failure: str) -> List[str]:
        """Get command path for keepalive failure count."""
        return ["interfaces", "openvpn", interface, "keep-alive", "failure-count", failure]

    def get_keep_alive_interval(self, interface: str, interval: str) -> List[str]:
        """Get command path for keepalive interval."""
        return ["interfaces", "openvpn", interface, "keep-alive", "interval", interval]

    def get_persistent_tunnel(self, interface: str) -> List[str]:
        """Get command path for persistent tunnel."""
        return ["interfaces", "openvpn", interface, "persistent-tunnel"]

    def get_replace_default_route(self, interface: str) -> List[str]:
        """Get command path for replacing default route."""
        return ["interfaces", "openvpn", interface, "replace-default-route"]

    def get_replace_default_route_local(self, interface: str) -> List[str]:
        """Get command path for local traffic when replacing default route."""
        return ["interfaces", "openvpn", interface, "replace-default-route", "local"]

    def get_openvpn_option(self, interface: str, option: str) -> List[str]:
        """Get command path for generic OpenVPN option."""
        return ["interfaces", "openvpn", interface, "openvpn-option", option]

    def get_ip_mtu(self, interface: str, mtu: str) -> List[str]:
        """Get command path for MTU."""
        return ["interfaces", "openvpn", interface, "ip", "mtu", mtu]

    def get_redirect_gateway(self, interface: str) -> List[str]:
        """Get command path for redirect-gateway."""
        return ["interfaces", "openvpn", interface, "server", "redirect-gateway"]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse a single OpenVPN interface configuration.

        Args:
            name: Interface name (vtunX)
            config: Raw config dictionary from VyOS

        Returns:
            Parsed interface data
        """
        # Parse server configuration
        server = None
        server_config = config.get("server", {})
        if isinstance(server_config, dict) and server_config:
            # Parse clients
            clients = []
            clients_config = server_config.get("client", {})
            for client_name, client_data in clients_config.items() if isinstance(clients_config, dict) else []:
                if isinstance(client_data, dict):
                    clients.append({
                        "name": client_name,
                        "ip": client_data.get("ip"),
                        "subnet": client_data.get("subnet"),
                        "disable": "disable" in client_data,
                    })

            # Parse push routes
            push_routes = server_config.get("push-route", [])
            if isinstance(push_routes, str):
                push_routes = [push_routes]

            # Parse name servers
            name_servers = server_config.get("name-server", [])
            if isinstance(name_servers, str):
                name_servers = [name_servers]

            server = {
                "subnet": server_config.get("subnet"),
                "clients": clients,
                "name_servers": name_servers,
                "domain_name": server_config.get("domain-name"),
                "push_routes": push_routes if isinstance(push_routes, list) else [],
                "max_connections": server_config.get("max-connections"),
                "topology": server_config.get("topology"),
                "redirect_gateway": "redirect-gateway" in server_config,
                "mfa_totp": "mfa" in server_config and "totp" in server_config.get("mfa", {}),
            }

        # Parse TLS configuration
        tls = None
        tls_config = config.get("tls", {})
        if isinstance(tls_config, dict) and tls_config:
            tls = {
                "ca_certificate": tls_config.get("ca-certificate"),
                "certificate": tls_config.get("certificate"),
                "dh_params": tls_config.get("dh-params"),
                "crl_file": tls_config.get("crl-file"),
                "auth_key": tls_config.get("auth-key"),
                "crypt_key": tls_config.get("crypt-key"),
                "role": tls_config.get("role"),
            }

        # Parse authentication
        auth = None
        auth_config = config.get("authentication", {})
        if isinstance(auth_config, dict) and auth_config:
            auth = {
                "username": auth_config.get("username"),
                "password": auth_config.get("password") is not None,  # Don't expose password
            }

        # Parse keepalive
        keepalive = None
        ka_config = config.get("keep-alive", {})
        if isinstance(ka_config, dict) and ka_config:
            keepalive = {
                "failure_count": ka_config.get("failure-count"),
                "interval": ka_config.get("interval"),
            }

        # Parse remote hosts
        remote_hosts = config.get("remote-host", [])
        if isinstance(remote_hosts, str):
            remote_hosts = [remote_hosts]

        # Parse openvpn options
        options = config.get("openvpn-option", [])
        if isinstance(options, str):
            options = [options]

        return {
            "name": name,
            "mode": config.get("mode"),
            "description": config.get("description"),
            "disable": "disable" in config,
            "protocol": config.get("protocol"),
            "device_type": config.get("device-type"),
            "local_address": config.get("local-address"),
            "remote_address": config.get("remote-address"),
            "local_host": config.get("local-host"),
            "local_port": config.get("local-port"),
            "remote_hosts": remote_hosts if isinstance(remote_hosts, list) else [],
            "remote_port": config.get("remote-port"),
            "encryption": config.get("encryption"),
            "hash": config.get("hash"),
            "shared_secret_key": config.get("shared-secret-key"),
            "server": server,
            "tls": tls,
            "authentication": auth,
            "keep_alive": keepalive,
            "persistent_tunnel": "persistent-tunnel" in config,
            "replace_default_route": "replace-default-route" in config,
            "openvpn_options": options if isinstance(options, list) else [],
            "mtu": config.get("ip", {}).get("mtu") if isinstance(config.get("ip"), dict) else None,
        }

    def parse_all_interfaces(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse all OpenVPN interfaces from full config.

        Args:
            full_config: Full VyOS config dictionary

        Returns:
            Dictionary with interfaces list and statistics
        """
        interfaces = []
        by_mode = {}

        openvpn_config = full_config.get("interfaces", {}).get("openvpn", {})

        if not openvpn_config:
            return {
                "configured": False,
                "interfaces": [],
                "total": 0,
                "by_mode": {},
            }

        for iface_name, iface_config in openvpn_config.items():
            if not isinstance(iface_config, dict):
                continue

            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

            # Count by mode
            mode = interface.get("mode") or "unknown"
            by_mode[mode] = by_mode.get(mode, 0) + 1

        return {
            "configured": len(interfaces) > 0,
            "interfaces": interfaces,
            "total": len(interfaces),
            "by_mode": by_mode,
        }
