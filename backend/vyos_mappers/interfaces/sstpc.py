"""
SSTP Client Interface Command Mapper

Handles SSTP (Secure Socket Tunneling Protocol) client interface commands for VyOS.
SSTPC tunnels PPP over HTTPS to a remote SSTP server, typically used for VPN
connectivity through firewalls that block other VPN protocols.
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class SstpcInterfaceMapper(BaseFeatureMapper):
    """Base SSTPC interface mapper - common paths across all versions."""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "sstpc"

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

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        return self._base(interface) + ["vrf", vrf]

    def get_vrf_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["vrf"]

    # ========================================================================
    # Server / Connection
    # ========================================================================

    def get_server(self, interface: str, server: str) -> List[str]:
        return self._base(interface) + ["server", server]

    def get_server_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["server"]

    def get_port(self, interface: str, port: str) -> List[str]:
        return self._base(interface) + ["port", port]

    def get_port_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["port"]

    # ========================================================================
    # Route behavior
    # ========================================================================

    def get_default_route_distance(self, interface: str, distance: str) -> List[str]:
        return self._base(interface) + ["default-route-distance", distance]

    def get_default_route_distance_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["default-route-distance"]

    def get_no_default_route(self, interface: str) -> List[str]:
        return self._base(interface) + ["no-default-route"]

    def get_no_peer_dns(self, interface: str) -> List[str]:
        return self._base(interface) + ["no-peer-dns"]

    # ========================================================================
    # MTU
    # ========================================================================

    def get_mtu(self, interface: str, mtu: str) -> List[str]:
        return self._base(interface) + ["mtu", mtu]

    def get_mtu_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["mtu"]

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
    # SSL
    # ========================================================================

    def get_ssl_ca_certificate(self, interface: str, ca_cert: str) -> List[str]:
        return self._base(interface) + ["ssl", "ca-certificate", ca_cert]

    def get_ssl_ca_certificate_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ssl", "ca-certificate"]

    def get_ssl_path(self, interface: str) -> List[str]:
        return self._base(interface) + ["ssl"]

    # ========================================================================
    # Config Parsing (normalized for both versions)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single SSTPC interface."""
        auth_config = config.get("authentication", {}) or {}
        ssl_config = config.get("ssl", {}) or {}

        return {
            "name": name,
            "type": self.interface_type,
            "description": config.get("description"),
            "disabled": "disable" in config,
            "server": config.get("server"),
            "port": config.get("port"),
            "default_route_distance": config.get("default-route-distance"),
            "no_default_route": "no-default-route" in config,
            "no_peer_dns": "no-peer-dns" in config,
            "mtu": config.get("mtu"),
            "vrf": config.get("vrf"),
            "authentication": {
                "username": auth_config.get("username"),
                "password": auth_config.get("password"),
            } if auth_config else None,
            "ssl": {
                "ca_certificate": ssl_config.get("ca-certificate"),
            } if ssl_config else None,
        }

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse all SSTPC interfaces from raw config dict."""
        interfaces = []
        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue
            interfaces.append(self.parse_single_interface(iface_name, iface_config))

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
        }
