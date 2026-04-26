"""
SSTP Client Interface Batch Builder

Provides all SSTPC interface batch operations.
SSTPC tunnels PPP over HTTPS to a remote SSTP server, enabling VPN
connectivity through restrictive firewalls that only allow HTTPS traffic.

No version differences exist between VyOS 1.4 and 1.5 for SSTPC.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class SstpcInterfaceBuilderMixin:
    """Complete batch builder for SSTPC interface operations."""

    _INTERNAL_BUILDER_METHODS = frozenset({
        "add_set", "add_delete", "add_multiple_sets", "clear",
        "get_operations", "operation_count", "is_empty", "get_capabilities",
    })

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_sstpc"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "SstpcInterfaceBuilderMixin":
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "SstpcInterfaceBuilderMixin":
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "SstpcInterfaceBuilderMixin":
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
                "server": {"supported": True, "description": "Remote SSTP server IPv4 address or hostname"},
                "port": {"supported": True, "description": "Server port number (default: 443)"},
                "authentication": {"supported": True, "description": "Username and password for authentication"},
                "ssl_ca_certificate": {"supported": True, "description": "CA certificate from PKI for SSL verification"},
                "default_route_distance": {"supported": True, "description": "Admin distance for default route (1-255, default: 210)"},
                "no_default_route": {"supported": True, "description": "Do not install default route"},
                "no_peer_dns": {"supported": True, "description": "Do not use DNS servers provided by peer"},
                "mtu": {"supported": True, "description": "Maximum Transmission Unit in bytes (68-1500, default: 1452)"},
                "vrf": {"supported": True, "description": "VRF instance assignment"},
            },
        }

    # ========================================================================
    # Basic Interface
    # ========================================================================

    def delete_interface(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_interface(interface))

    def set_interface_description(self, interface: str, description: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_description(interface, description))

    def delete_interface_description(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_description_path(interface))

    def set_interface_disable(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_disable(interface))

    def delete_interface_disable(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_disable(interface))

    def set_vrf(self, interface: str, vrf: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_vrf(interface, vrf))

    def delete_vrf(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_vrf_path(interface))

    # ========================================================================
    # Server / Connection
    # ========================================================================

    def set_server(self, interface: str, server: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_server(interface, server))

    def delete_server(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_server_path(interface))

    def set_port(self, interface: str, port: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_port(interface, port))

    def delete_port(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_port_path(interface))

    # ========================================================================
    # Route behavior
    # ========================================================================

    def set_default_route_distance(self, interface: str, distance: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_default_route_distance(interface, distance))

    def delete_default_route_distance(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_default_route_distance_path(interface))

    def set_no_default_route(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_no_default_route(interface))

    def delete_no_default_route(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_no_default_route(interface))

    def set_no_peer_dns(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_no_peer_dns(interface))

    def delete_no_peer_dns(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_no_peer_dns(interface))

    # ========================================================================
    # MTU
    # ========================================================================

    def set_mtu(self, interface: str, mtu: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_mtu(interface, mtu))

    def delete_mtu(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_mtu_path(interface))

    # ========================================================================
    # Authentication
    # ========================================================================

    def set_authentication_username(self, interface: str, username: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_authentication_username(interface, username))

    def delete_authentication_username(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_authentication_username_path(interface))

    def set_authentication_password(self, interface: str, password: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_authentication_password(interface, password))

    def delete_authentication_password(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_authentication_password_path(interface))

    def delete_authentication(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_authentication_path(interface))

    # ========================================================================
    # SSL
    # ========================================================================

    def set_ssl_ca_certificate(self, interface: str, ca_cert: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_set(self._mapper().get_ssl_ca_certificate(interface, ca_cert))

    def delete_ssl_ca_certificate(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ssl_ca_certificate_path(interface))

    def delete_ssl(self, interface: str) -> "SstpcInterfaceBuilderMixin":
        return self.add_delete(self._mapper().get_ssl_path(interface))
