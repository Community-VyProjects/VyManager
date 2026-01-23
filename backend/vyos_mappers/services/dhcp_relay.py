"""
DHCP Relay Service Command Mapper

Handles DHCP relay service commands for VyOS.
Supports both DHCPv4 and DHCPv6 relay configurations.
"""

from typing import List, Dict, Any, Optional
from ..base import BaseFeatureMapper


class DHCPRelayMapper(BaseFeatureMapper):
    """DHCP Relay mapper with all relay operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # DHCPv4 Relay
    # ========================================================================

    def get_dhcp_relay_base(self) -> List[str]:
        """Get base path for DHCP relay."""
        return ["service", "dhcp-relay"]

    def get_dhcp_relay_server(self, server: str) -> List[str]:
        """Get command path for DHCP relay server."""
        return ["service", "dhcp-relay", "server", server]

    def get_dhcp_relay_interface(self, interface: str) -> List[str]:
        """Get command path for DHCP relay interface."""
        return ["service", "dhcp-relay", "interface", interface]

    def get_dhcp_relay_relay_options_hop_count(self, count: str) -> List[str]:
        """Get command path for relay hop count."""
        return ["service", "dhcp-relay", "relay-options", "hop-count", count]

    def get_dhcp_relay_relay_options_max_size(self, size: str) -> List[str]:
        """Get command path for relay max packet size."""
        return ["service", "dhcp-relay", "relay-options", "max-size", size]

    def get_dhcp_relay_relay_options_relay_agents_packets(self, action: str) -> List[str]:
        """Get command path for relay agents packets action (append, discard, forward, replace)."""
        return ["service", "dhcp-relay", "relay-options", "relay-agents-packets", action]

    def get_dhcp_relay_listen_interface(self, interface: str) -> List[str]:
        """Get command path for listen interface."""
        return ["service", "dhcp-relay", "listen-interface", interface]

    def get_dhcp_relay_upstream_interface(self, interface: str) -> List[str]:
        """Get command path for upstream interface."""
        return ["service", "dhcp-relay", "upstream-interface", interface]

    # ========================================================================
    # DHCPv6 Relay
    # ========================================================================

    def get_dhcpv6_relay_base(self) -> List[str]:
        """Get base path for DHCPv6 relay."""
        return ["service", "dhcpv6-relay"]

    def get_dhcpv6_relay_listen_interface(self, interface: str) -> List[str]:
        """Get command path for DHCPv6 relay listen interface."""
        return ["service", "dhcpv6-relay", "listen-interface", interface]

    def get_dhcpv6_relay_listen_interface_address(self, interface: str, address: str) -> List[str]:
        """Get command path for DHCPv6 relay listen interface address."""
        return ["service", "dhcpv6-relay", "listen-interface", interface, "address", address]

    def get_dhcpv6_relay_upstream_interface(self, interface: str) -> List[str]:
        """Get command path for DHCPv6 relay upstream interface."""
        return ["service", "dhcpv6-relay", "upstream-interface", interface]

    def get_dhcpv6_relay_upstream_interface_address(self, interface: str, address: str) -> List[str]:
        """Get command path for DHCPv6 relay upstream interface address."""
        return ["service", "dhcpv6-relay", "upstream-interface", interface, "address", address]

    def get_dhcpv6_relay_max_hop_count(self, count: str) -> List[str]:
        """Get command path for DHCPv6 relay max hop count."""
        return ["service", "dhcpv6-relay", "max-hop-count", count]

    def get_dhcpv6_relay_use_interface_id_option(self) -> List[str]:
        """Get command path for use-interface-id-option."""
        return ["service", "dhcpv6-relay", "use-interface-id-option"]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_dhcp_relay(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse DHCP relay configuration."""
        relay_config = config.get("service", {}).get("dhcp-relay", {})

        if not relay_config:
            return {
                "configured": False,
                "servers": [],
                "interfaces": [],
                "listen_interfaces": [],
                "upstream_interfaces": [],
                "relay_options": None,
            }

        # Parse servers
        servers = relay_config.get("server", [])
        if isinstance(servers, str):
            servers = [servers]

        # Parse interfaces
        interfaces = relay_config.get("interface", [])
        if isinstance(interfaces, str):
            interfaces = [interfaces]

        # Parse listen interfaces
        listen_interfaces = relay_config.get("listen-interface", [])
        if isinstance(listen_interfaces, str):
            listen_interfaces = [listen_interfaces]

        # Parse upstream interfaces
        upstream_interfaces = relay_config.get("upstream-interface", [])
        if isinstance(upstream_interfaces, str):
            upstream_interfaces = [upstream_interfaces]

        # Parse relay options
        relay_options = None
        options_config = relay_config.get("relay-options", {})
        if isinstance(options_config, dict) and options_config:
            relay_options = {
                "hop_count": options_config.get("hop-count"),
                "max_size": options_config.get("max-size"),
                "relay_agents_packets": options_config.get("relay-agents-packets"),
            }

        return {
            "configured": True,
            "servers": servers if isinstance(servers, list) else [],
            "interfaces": interfaces if isinstance(interfaces, list) else [],
            "listen_interfaces": listen_interfaces if isinstance(listen_interfaces, list) else [],
            "upstream_interfaces": upstream_interfaces if isinstance(upstream_interfaces, list) else [],
            "relay_options": relay_options,
        }

    def parse_dhcpv6_relay(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse DHCPv6 relay configuration."""
        relay_config = config.get("service", {}).get("dhcpv6-relay", {})

        if not relay_config:
            return {
                "configured": False,
                "listen_interfaces": [],
                "upstream_interfaces": [],
                "max_hop_count": None,
                "use_interface_id_option": False,
            }

        # Parse listen interfaces
        listen_interfaces = []
        listen_config = relay_config.get("listen-interface", {})
        if isinstance(listen_config, dict):
            for iface, iface_data in listen_config.items():
                entry = {"interface": iface}
                if isinstance(iface_data, dict) and "address" in iface_data:
                    entry["address"] = iface_data["address"]
                listen_interfaces.append(entry)
        elif isinstance(listen_config, list):
            for iface in listen_config:
                listen_interfaces.append({"interface": iface})

        # Parse upstream interfaces
        upstream_interfaces = []
        upstream_config = relay_config.get("upstream-interface", {})
        if isinstance(upstream_config, dict):
            for iface, iface_data in upstream_config.items():
                entry = {"interface": iface}
                if isinstance(iface_data, dict) and "address" in iface_data:
                    entry["address"] = iface_data["address"]
                upstream_interfaces.append(entry)
        elif isinstance(upstream_config, list):
            for iface in upstream_config:
                upstream_interfaces.append({"interface": iface})

        return {
            "configured": True,
            "listen_interfaces": listen_interfaces,
            "upstream_interfaces": upstream_interfaces,
            "max_hop_count": relay_config.get("max-hop-count"),
            "use_interface_id_option": "use-interface-id-option" in relay_config,
        }

    def parse_full_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full DHCP relay configuration from VyOS.

        Args:
            full_config: Full VyOS config dictionary

        Returns:
            Parsed DHCP relay configuration (both v4 and v6)
        """
        return {
            "dhcp_relay": self.parse_dhcp_relay(full_config),
            "dhcpv6_relay": self.parse_dhcpv6_relay(full_config),
        }
