"""
DHCP Relay Service Batch Builder

Generates VyOS set/delete operations for the dhcp-relay service.

Configuration lives under: service dhcp-relay

Structure:
  service dhcp-relay
    disable                              # Disable relay (presence flag)
    interface <iface>                    # Broadcast interfaces (multi-value)
    listen-interface <iface>             # Listen interfaces (multi-value)
    upstream-interface <iface>           # Upstream/forward interfaces (multi-value)
    server <ipv4>                        # DHCP server address(es) (multi-value)
    relay-options
      hop-count <1-255>                  # Hop count limit (default: 10)
      max-size <64-1400>                 # Max packet size (default: 576)
      relay-agents-packets <policy>      # append|replace|forward|discard

The template structure is identical between VyOS 1.4 and 1.5.
Multi-argument batch operations encode compound values as "arg1,arg2"
(comma-separated), matching the project's standard batch dispatch pattern.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class DHCPRelayBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["dhcp_relay"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "DHCPRelayBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "DHCPRelayBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "dhcp_relay": {
                    "supported": True,
                    "description": "DHCP Relay Agent service",
                },
                "disable": {
                    "supported": True,
                    "description": "Disable the DHCP relay service",
                },
                "interface": {
                    "supported": True,
                    "description": "Broadcast interface(s) for relay",
                },
                "listen_interface": {
                    "supported": True,
                    "description": "Interface(s) for the relay agent to listen for requests",
                },
                "upstream_interface": {
                    "supported": True,
                    "description": "Interface(s) for the relay agent to forward requests out",
                },
                "server": {
                    "supported": True,
                    "description": "DHCP server IPv4 address(es)",
                },
                "hop_count": {
                    "supported": True,
                    "description": "Hop-count limit before discarding packets (1-255, default 10)",
                    "min": 1,
                    "max": 255,
                    "default": 10,
                },
                "max_size": {
                    "supported": True,
                    "description": "Maximum packet size sent to DHCP server (64-1400, default 576)",
                    "min": 64,
                    "max": 1400,
                    "default": 576,
                },
                "relay_agents_packets": {
                    "supported": True,
                    "description": "Policy for packets already containing relay agent options",
                    "options": ["append", "replace", "forward", "discard"],
                    "default": "forward",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Global service operations
    # -----------------------------------------------------------------------

    def set_disable(self) -> "DHCPRelayBatchBuilder":
        """Disable the DHCP relay service."""
        return self.add_set(self.m.get_global_disable())

    def delete_disable(self) -> "DHCPRelayBatchBuilder":
        """Re-enable the DHCP relay service."""
        return self.add_delete(self.m.get_global_disable())

    def delete_dhcp_relay(self) -> "DHCPRelayBatchBuilder":
        """Delete the entire DHCP relay configuration."""
        return self.add_delete(self.m.get_dhcp_relay_delete())

    # -----------------------------------------------------------------------
    # Interface operations (multi-value)
    # -----------------------------------------------------------------------

    def set_interface(self, interface: str) -> "DHCPRelayBatchBuilder":
        """Add a broadcast interface."""
        return self.add_set(self.m.get_interface(interface))

    def delete_interface(self, interface: str) -> "DHCPRelayBatchBuilder":
        """Remove a specific broadcast interface."""
        return self.add_delete(self.m.get_interface_delete(interface))

    def delete_interfaces(self) -> "DHCPRelayBatchBuilder":
        """Remove all broadcast interfaces."""
        return self.add_delete(self.m.get_interfaces_delete())

    def set_listen_interface(self, interface: str) -> "DHCPRelayBatchBuilder":
        """Add a listen interface."""
        return self.add_set(self.m.get_listen_interface(interface))

    def delete_listen_interface(self, interface: str) -> "DHCPRelayBatchBuilder":
        """Remove a specific listen interface."""
        return self.add_delete(self.m.get_listen_interface_delete(interface))

    def delete_listen_interfaces(self) -> "DHCPRelayBatchBuilder":
        """Remove all listen interfaces."""
        return self.add_delete(self.m.get_listen_interfaces_delete())

    def set_upstream_interface(self, interface: str) -> "DHCPRelayBatchBuilder":
        """Add an upstream interface."""
        return self.add_set(self.m.get_upstream_interface(interface))

    def delete_upstream_interface(self, interface: str) -> "DHCPRelayBatchBuilder":
        """Remove a specific upstream interface."""
        return self.add_delete(self.m.get_upstream_interface_delete(interface))

    def delete_upstream_interfaces(self) -> "DHCPRelayBatchBuilder":
        """Remove all upstream interfaces."""
        return self.add_delete(self.m.get_upstream_interfaces_delete())

    # -----------------------------------------------------------------------
    # Server operations (multi-value)
    # -----------------------------------------------------------------------

    def set_server(self, address: str) -> "DHCPRelayBatchBuilder":
        """Add a DHCP server address."""
        return self.add_set(self.m.get_server(address))

    def delete_server(self, address: str) -> "DHCPRelayBatchBuilder":
        """Remove a specific DHCP server address."""
        return self.add_delete(self.m.get_server_delete(address))

    def delete_servers(self) -> "DHCPRelayBatchBuilder":
        """Remove all DHCP server addresses."""
        return self.add_delete(self.m.get_servers_delete())

    # -----------------------------------------------------------------------
    # Relay options
    # -----------------------------------------------------------------------

    def set_hop_count(self, value: str) -> "DHCPRelayBatchBuilder":
        """Set the hop-count limit."""
        return self.add_set(self.m.get_hop_count(value))

    def delete_hop_count(self) -> "DHCPRelayBatchBuilder":
        """Reset hop-count to default."""
        return self.add_delete(self.m.get_hop_count_delete())

    def set_max_size(self, value: str) -> "DHCPRelayBatchBuilder":
        """Set the maximum packet size."""
        return self.add_set(self.m.get_max_size(value))

    def delete_max_size(self) -> "DHCPRelayBatchBuilder":
        """Reset max-size to default."""
        return self.add_delete(self.m.get_max_size_delete())

    def set_relay_agents_packets(self, policy: str) -> "DHCPRelayBatchBuilder":
        """Set the relay-agents-packets policy."""
        return self.add_set(self.m.get_relay_agents_packets(policy))

    def delete_relay_agents_packets(self) -> "DHCPRelayBatchBuilder":
        """Reset relay-agents-packets to default."""
        return self.add_delete(self.m.get_relay_agents_packets_delete())
