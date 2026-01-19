"""
WireGuard Command Mapper

Handles command path generation for WireGuard VPN configuration.
Version-specific logic is in version-specific files.
"""

from typing import List, Dict, Any, Optional


class WireGuardMapper:
    """Base mapper with common WireGuard operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        self.version = version

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

    def get_peer_host_name(self, interface: str, peer: str, hostname: str) -> List[str]:
        """Set peer endpoint hostname."""
        return ["interfaces", "wireguard", interface, "peer", peer, "host-name", hostname]

    # ========================================================================
    # Config Parsing
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse WireGuard configuration from VyOS full config.

        Returns:
            Dictionary with 'interfaces' key containing all WireGuard interfaces
        """
        result = {"interfaces": {}}

        try:
            # Navigate to interfaces -> wireguard
            interfaces = full_config.get("interfaces", {})
            wireguard_interfaces = interfaces.get("wireguard", {})

            if not wireguard_interfaces:
                return result

            for iface_name, iface_config in wireguard_interfaces.items():
                interface_data = {
                    "name": iface_name,
                    "description": iface_config.get("description"),
                    "address": self._normalize_to_list(iface_config.get("address")),
                    "port": iface_config.get("port"),
                    "private_key": iface_config.get("private-key"),
                    "mtu": iface_config.get("mtu"),
                    "fwmark": iface_config.get("fwmark"),
                    "per_client_thread": "per-client-thread" in iface_config,
                    "peers": {}
                }

                # Parse peers
                peers = iface_config.get("peer", {})
                if peers:
                    for peer_name, peer_config in peers.items():
                        interface_data["peers"][peer_name] = {
                            "name": peer_name,
                            "public_key": peer_config.get("public-key"),
                            "preshared_key": peer_config.get("preshared-key"),
                            "allowed_ips": self._normalize_to_list(peer_config.get("allowed-ips")),
                            "address": peer_config.get("address"),
                            "port": peer_config.get("port"),
                            "persistent_keepalive": peer_config.get("persistent-keepalive"),
                            "description": peer_config.get("description"),
                            "disabled": "disable" in peer_config,
                            "host_name": peer_config.get("host-name"),
                        }

                result["interfaces"][iface_name] = interface_data

        except Exception as e:
            print(f"Error parsing WireGuard config: {e}")

        return result

    def _normalize_to_list(self, value: Any) -> List[str]:
        """Convert value to list (handles single values and lists)."""
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return [value]
