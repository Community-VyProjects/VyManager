"""
WireGuard Command Mapper

Handles command path generation for WireGuard VPN configuration.
Version-specific logic is in version-specific files.
"""

from typing import Any, Dict, FrozenSet, List

from ..base import BaseFeatureMapper


class WireGuardMapper(BaseFeatureMapper):
    """Base mapper with common WireGuard operations"""

    def versioned_nodes(self) -> FrozenSet[str]:
        """1.5-only WireGuard leaves this device has.

        Peer host-name lives on the 1.5 subclass as a path method.
        Capabilities and builders read this set instead of the version string.
        """
        nodes = []
        if callable(getattr(self, "get_peer_host_name", None)):
            nodes.append("peer_host_name")
        return frozenset(nodes)

    def _require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"wireguard {node} is not supported on this device")

    # ========================================================================
    # Interface Commands
    # ========================================================================

    def get_interface_path(self, interface: str) -> List[str]:
        """Get base path for WireGuard interface."""
        return ["interfaces", "wireguard", interface]

    def get_interface_address(self, interface: str, address: str) -> List[str]:
        """Set interface IP address."""
        return ["interfaces", "wireguard", interface, "address", address]

    def get_interface_description(self, interface: str, description: str) -> List[str]:
        """Set interface description."""
        return ["interfaces", "wireguard", interface, "description", description]

    def get_interface_port(self, interface: str, port: str) -> List[str]:
        """Set interface listen port."""
        return ["interfaces", "wireguard", interface, "port", port]

    def get_interface_private_key(self, interface: str, private_key: str) -> List[str]:
        """Set interface private key."""
        return ["interfaces", "wireguard", interface, "private-key", private_key]

    def get_interface_mtu(self, interface: str, mtu: str) -> List[str]:
        """Set interface MTU."""
        return ["interfaces", "wireguard", interface, "mtu", mtu]

    def get_interface_fwmark(self, interface: str, fwmark: str) -> List[str]:
        """Set interface firewall mark."""
        return ["interfaces", "wireguard", interface, "fwmark", fwmark]

    def get_interface_per_client_thread(self, interface: str) -> List[str]:
        """Enable per-client threading."""
        return ["interfaces", "wireguard", interface, "per-client-thread"]

    def get_interface_disable(self, interface: str) -> List[str]:
        """Disable interface."""
        return ["interfaces", "wireguard", interface, "disable"]

    # ========================================================================
    # Peer Commands
    # ========================================================================

    def get_peer_path(self, interface: str, peer: str) -> List[str]:
        """Get base path for peer."""
        return ["interfaces", "wireguard", interface, "peer", peer]

    def get_peer_public_key(self, interface: str, peer: str, public_key: str) -> List[str]:
        """Set peer public key."""
        return ["interfaces", "wireguard", interface, "peer", peer, "public-key", public_key]

    def get_peer_preshared_key(self, interface: str, peer: str, psk: str) -> List[str]:
        """Set peer preshared key."""
        return ["interfaces", "wireguard", interface, "peer", peer, "preshared-key", psk]

    def get_peer_allowed_ips(self, interface: str, peer: str, allowed_ip: str) -> List[str]:
        """Add allowed IP for peer."""
        return ["interfaces", "wireguard", interface, "peer", peer, "allowed-ips", allowed_ip]

    def get_peer_address(self, interface: str, peer: str, address: str) -> List[str]:
        """Set peer endpoint address."""
        return ["interfaces", "wireguard", interface, "peer", peer, "address", address]

    def get_peer_port(self, interface: str, peer: str, port: str) -> List[str]:
        """Set peer endpoint port."""
        return ["interfaces", "wireguard", interface, "peer", peer, "port", port]

    def get_peer_persistent_keepalive(self, interface: str, peer: str, interval: str) -> List[str]:
        """Set peer persistent keepalive interval."""
        return ["interfaces", "wireguard", interface, "peer", peer, "persistent-keepalive", interval]

    def get_peer_description(self, interface: str, peer: str, description: str) -> List[str]:
        """Set peer description."""
        return ["interfaces", "wireguard", interface, "peer", peer, "description", description]

    def get_peer_disable(self, interface: str, peer: str) -> List[str]:
        """Disable peer."""
        return ["interfaces", "wireguard", interface, "peer", peer, "disable"]

    # ========================================================================
    # Operational Commands
    # ========================================================================

    def get_keypair_generate_path(self) -> List[str]:
        """Op-mode path of ``generate pki wireguard key-pair``."""
        return ["pki", "wireguard", "key-pair"]

    def get_preshared_key_generate_path(self) -> List[str]:
        """Op-mode path of ``generate pki wireguard preshared-key``."""
        return ["pki", "wireguard", "preshared-key"]

    def get_interface_summary_show_path(self, interface: str) -> List[str]:
        """Op-mode path of ``show interfaces wireguard <interface> summary``."""
        return ["interfaces", "wireguard", interface, "summary"]

    def get_interface_public_key_show_path(self, interface: str) -> List[str]:
        """Op-mode path of ``show interfaces wireguard <interface> public-key``."""
        return ["interfaces", "wireguard", interface, "public-key"]

    # ========================================================================
    # Config Parsing
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_wireguard_config

        return parse_wireguard_config(self, full_config)
