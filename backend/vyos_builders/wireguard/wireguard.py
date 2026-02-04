"""
WireGuard Batch Builder

Provides all batch operations for WireGuard VPN configuration.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any, Optional
from vyos_mappers import CommandMapperRegistry


class WireGuardBatchBuilder:
    """Complete batch builder for WireGuard operations"""

    def __init__(self, version: str):
        """Initialize builder with VyOS version."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "wireguard"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "WireGuardBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "WireGuardBatchBuilder":
        """Add a 'delete' operation to the batch."""
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        """Get the list of operations."""
        return self._operations.copy()

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

    def is_empty(self) -> bool:
        """Check if the batch is empty."""
        return len(self._operations) == 0

    # ========================================================================
    # Interface Operations
    # ========================================================================

    def create_interface(self, interface: str) -> "WireGuardBatchBuilder":
        """Create a WireGuard interface."""
        path = self.mappers[self.mapper_key].get_interface_path(interface)
        return self.add_set(path)

    def delete_interface(self, interface: str) -> "WireGuardBatchBuilder":
        """Delete a WireGuard interface."""
        path = self.mappers[self.mapper_key].get_interface_path(interface)
        return self.add_delete(path)

    def set_interface_address(self, interface: str, address: str) -> "WireGuardBatchBuilder":
        """Set interface IP address."""
        path = self.mappers[self.mapper_key].get_interface_address(interface, address)
        return self.add_set(path)

    def delete_interface_address(self, interface: str, address: str) -> "WireGuardBatchBuilder":
        """Delete interface IP address."""
        path = self.mappers[self.mapper_key].get_interface_address(interface, address)
        return self.add_delete(path)

    def set_interface_description(self, interface: str, description: str) -> "WireGuardBatchBuilder":
        """Set interface description."""
        path = self.mappers[self.mapper_key].get_interface_description(interface, description)
        return self.add_set(path)

    def delete_interface_description(self, interface: str) -> "WireGuardBatchBuilder":
        """Delete interface description."""
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["description"]
        return self.add_delete(path)

    def set_interface_port(self, interface: str, port: str) -> "WireGuardBatchBuilder":
        """Set interface listen port."""
        path = self.mappers[self.mapper_key].get_interface_port(interface, port)
        return self.add_set(path)

    def delete_interface_port(self, interface: str) -> "WireGuardBatchBuilder":
        """Delete interface listen port."""
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["port"]
        return self.add_delete(path)

    def set_interface_private_key(self, interface: str, private_key: str) -> "WireGuardBatchBuilder":
        """Set interface private key."""
        path = self.mappers[self.mapper_key].get_interface_private_key(interface, private_key)
        return self.add_set(path)

    def delete_interface_private_key(self, interface: str) -> "WireGuardBatchBuilder":
        """Delete interface private key."""
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["private-key"]
        return self.add_delete(path)

    def set_interface_mtu(self, interface: str, mtu: str) -> "WireGuardBatchBuilder":
        """Set interface MTU."""
        path = self.mappers[self.mapper_key].get_interface_mtu(interface, mtu)
        return self.add_set(path)

    def delete_interface_mtu(self, interface: str) -> "WireGuardBatchBuilder":
        """Delete interface MTU."""
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["mtu"]
        return self.add_delete(path)

    def set_interface_fwmark(self, interface: str, fwmark: str) -> "WireGuardBatchBuilder":
        """Set interface firewall mark."""
        path = self.mappers[self.mapper_key].get_interface_fwmark(interface, fwmark)
        return self.add_set(path)

    def delete_interface_fwmark(self, interface: str) -> "WireGuardBatchBuilder":
        """Delete interface firewall mark."""
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["fwmark"]
        return self.add_delete(path)

    def set_interface_per_client_thread(self, interface: str) -> "WireGuardBatchBuilder":
        """Enable per-client threading."""
        path = self.mappers[self.mapper_key].get_interface_per_client_thread(interface)
        return self.add_set(path)

    def delete_interface_per_client_thread(self, interface: str) -> "WireGuardBatchBuilder":
        """Disable per-client threading."""
        path = self.mappers[self.mapper_key].get_interface_per_client_thread(interface)
        return self.add_delete(path)

    def set_interface_disable(self, interface: str) -> "WireGuardBatchBuilder":
        """Disable interface."""
        path = self.mappers[self.mapper_key].get_interface_disable(interface)
        return self.add_set(path)

    def delete_interface_disable(self, interface: str) -> "WireGuardBatchBuilder":
        """Enable interface (remove disable flag)."""
        path = self.mappers[self.mapper_key].get_interface_disable(interface)
        return self.add_delete(path)

    # ========================================================================
    # Peer Operations
    # ========================================================================

    def create_peer(self, interface: str, peer: str) -> "WireGuardBatchBuilder":
        """Create a peer on an interface."""
        path = self.mappers[self.mapper_key].get_peer_path(interface, peer)
        return self.add_set(path)

    def delete_peer(self, interface: str, peer: str) -> "WireGuardBatchBuilder":
        """Delete a peer from an interface."""
        path = self.mappers[self.mapper_key].get_peer_path(interface, peer)
        return self.add_delete(path)

    def set_peer_public_key(self, interface: str, peer: str, public_key: str) -> "WireGuardBatchBuilder":
        """Set peer public key."""
        path = self.mappers[self.mapper_key].get_peer_public_key(interface, peer, public_key)
        return self.add_set(path)

    def delete_peer_public_key(self, interface: str, peer: str) -> "WireGuardBatchBuilder":
        """Delete peer public key."""
        path = self.mappers[self.mapper_key].get_peer_path(interface, peer) + ["public-key"]
        return self.add_delete(path)

    def set_peer_preshared_key(self, interface: str, peer: str, psk: str) -> "WireGuardBatchBuilder":
        """Set peer preshared key."""
        path = self.mappers[self.mapper_key].get_peer_preshared_key(interface, peer, psk)
        return self.add_set(path)

    def delete_peer_preshared_key(self, interface: str, peer: str) -> "WireGuardBatchBuilder":
        """Delete peer preshared key."""
        path = self.mappers[self.mapper_key].get_peer_path(interface, peer) + ["preshared-key"]
        return self.add_delete(path)

    def set_peer_allowed_ips(self, interface: str, peer: str, allowed_ip: str) -> "WireGuardBatchBuilder":
        """Add allowed IP for peer."""
        path = self.mappers[self.mapper_key].get_peer_allowed_ips(interface, peer, allowed_ip)
        return self.add_set(path)

    def delete_peer_allowed_ips(self, interface: str, peer: str, allowed_ip: str) -> "WireGuardBatchBuilder":
        """Remove allowed IP for peer."""
        path = self.mappers[self.mapper_key].get_peer_allowed_ips(interface, peer, allowed_ip)
        return self.add_delete(path)

    def delete_all_peer_allowed_ips(self, interface: str, peer: str) -> "WireGuardBatchBuilder":
        """Remove all allowed IPs for peer."""
        path = self.mappers[self.mapper_key].get_peer_path(interface, peer) + ["allowed-ips"]
        return self.add_delete(path)

    def set_peer_address(self, interface: str, peer: str, address: str) -> "WireGuardBatchBuilder":
        """Set peer endpoint address."""
        path = self.mappers[self.mapper_key].get_peer_address(interface, peer, address)
        return self.add_set(path)

    def delete_peer_address(self, interface: str, peer: str) -> "WireGuardBatchBuilder":
        """Delete peer endpoint address."""
        path = self.mappers[self.mapper_key].get_peer_path(interface, peer) + ["address"]
        return self.add_delete(path)

    def set_peer_port(self, interface: str, peer: str, port: str) -> "WireGuardBatchBuilder":
        """Set peer endpoint port."""
        path = self.mappers[self.mapper_key].get_peer_port(interface, peer, port)
        return self.add_set(path)

    def delete_peer_port(self, interface: str, peer: str) -> "WireGuardBatchBuilder":
        """Delete peer endpoint port."""
        path = self.mappers[self.mapper_key].get_peer_path(interface, peer) + ["port"]
        return self.add_delete(path)

    def set_peer_persistent_keepalive(self, interface: str, peer: str, interval: str) -> "WireGuardBatchBuilder":
        """Set peer persistent keepalive interval."""
        path = self.mappers[self.mapper_key].get_peer_persistent_keepalive(interface, peer, interval)
        return self.add_set(path)

    def delete_peer_persistent_keepalive(self, interface: str, peer: str) -> "WireGuardBatchBuilder":
        """Delete peer persistent keepalive."""
        path = self.mappers[self.mapper_key].get_peer_path(interface, peer) + ["persistent-keepalive"]
        return self.add_delete(path)

    def set_peer_description(self, interface: str, peer: str, description: str) -> "WireGuardBatchBuilder":
        """Set peer description."""
        path = self.mappers[self.mapper_key].get_peer_description(interface, peer, description)
        return self.add_set(path)

    def delete_peer_description(self, interface: str, peer: str) -> "WireGuardBatchBuilder":
        """Delete peer description."""
        path = self.mappers[self.mapper_key].get_peer_path(interface, peer) + ["description"]
        return self.add_delete(path)

    def set_peer_disable(self, interface: str, peer: str) -> "WireGuardBatchBuilder":
        """Disable peer."""
        path = self.mappers[self.mapper_key].get_peer_disable(interface, peer)
        return self.add_set(path)

    def delete_peer_disable(self, interface: str, peer: str) -> "WireGuardBatchBuilder":
        """Enable peer (remove disable flag)."""
        path = self.mappers[self.mapper_key].get_peer_disable(interface, peer)
        return self.add_delete(path)

    def set_peer_host_name(self, interface: str, peer: str, hostname: str) -> "WireGuardBatchBuilder":
        """Set peer endpoint hostname."""
        path = self.mappers[self.mapper_key].get_peer_host_name(interface, peer, hostname)
        return self.add_set(path)

    def delete_peer_host_name(self, interface: str, peer: str) -> "WireGuardBatchBuilder":
        """Delete peer endpoint hostname."""
        path = self.mappers[self.mapper_key].get_peer_path(interface, peer) + ["host-name"]
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        # WireGuard is fully supported on both 1.4 and 1.5
        return {
            "version": self.version,
            "features": {
                "wireguard": {
                    "supported": True,
                    "description": "WireGuard VPN tunnel support",
                },
                "key_generation": {
                    "supported": True,
                    "description": "Generate keypairs and preshared keys",
                },
                "client_config": {
                    "supported": True,
                    "description": "Generate client configuration with QR codes",
                },
                "per_client_thread": {
                    "supported": True,
                    "description": "Per-client threading for performance",
                },
            },
            "version_notes": {
                "full_support": True,
            },
        }
