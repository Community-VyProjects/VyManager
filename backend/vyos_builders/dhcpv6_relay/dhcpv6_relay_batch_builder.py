"""
DHCPv6 Relay Service Batch Builder

Generates VyOS set/delete operations for the dhcpv6-relay service.

Configuration lives under: service dhcpv6-relay

Structure:
  service dhcpv6-relay
    disable                                       # Disable relay (presence flag)
    max-hop-count <1-255>                         # Max hop count (default: 10)
    use-interface-id-option                       # Enable interface-ID option (presence flag)
    listen-interface <iface>                      # Listen interfaces (tagged node)
      address <ipv6>                              # IPv6 address to listen on (optional)
    upstream-interface <iface>                    # Upstream interfaces (tagged node)
      address <ipv6>                              # IPv6 server address(es) (multi-value)

The template structure is identical between VyOS 1.4 and 1.5.
Multi-argument batch operations encode compound values as "arg1,arg2"
(comma-separated), matching the project's standard batch dispatch pattern.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class DHCPv6RelayBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["dhcpv6_relay"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "DHCPv6RelayBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "DHCPv6RelayBatchBuilder":
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
                "dhcpv6_relay": {
                    "supported": True,
                    "description": "DHCPv6 Relay Agent service",
                },
                "disable": {
                    "supported": True,
                    "description": "Disable the DHCPv6 relay service",
                },
                "max_hop_count": {
                    "supported": True,
                    "description": "Maximum hop count before discarding packets (1-255, default 10)",
                    "min": 1,
                    "max": 255,
                    "default": 10,
                },
                "use_interface_id_option": {
                    "supported": True,
                    "description": "Add interface-ID option to relayed packets",
                },
                "listen_interface": {
                    "supported": True,
                    "description": "Interface(s) for the relay agent to listen for client requests",
                },
                "listen_interface_address": {
                    "supported": True,
                    "description": "IPv6 address on the listen interface to accept requests on",
                },
                "upstream_interface": {
                    "supported": True,
                    "description": "Interface(s) for the relay agent to forward requests out",
                },
                "upstream_interface_address": {
                    "supported": True,
                    "description": "IPv6 server address(es) to forward requests to",
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

    def set_disable(self) -> "DHCPv6RelayBatchBuilder":
        return self.add_set(self.m.get_global_disable())

    def delete_disable(self) -> "DHCPv6RelayBatchBuilder":
        return self.add_delete(self.m.get_global_disable())

    def delete_dhcpv6_relay(self) -> "DHCPv6RelayBatchBuilder":
        return self.add_delete(self.m.get_dhcpv6_relay_delete())

    def set_use_interface_id_option(self) -> "DHCPv6RelayBatchBuilder":
        return self.add_set(self.m.get_use_interface_id_option())

    def delete_use_interface_id_option(self) -> "DHCPv6RelayBatchBuilder":
        return self.add_delete(self.m.get_use_interface_id_option())

    def set_max_hop_count(self, value: str) -> "DHCPv6RelayBatchBuilder":
        return self.add_set(self.m.get_max_hop_count(value))

    def delete_max_hop_count(self) -> "DHCPv6RelayBatchBuilder":
        return self.add_delete(self.m.get_max_hop_count_delete())

    # -----------------------------------------------------------------------
    # Listen interface operations
    # -----------------------------------------------------------------------

    def set_listen_interface(self, interface: str) -> "DHCPv6RelayBatchBuilder":
        return self.add_set(self.m.get_listen_interface(interface))

    def delete_listen_interface(self, interface: str) -> "DHCPv6RelayBatchBuilder":
        return self.add_delete(self.m.get_listen_interface_delete(interface))

    def delete_listen_interfaces(self) -> "DHCPv6RelayBatchBuilder":
        return self.add_delete(self.m.get_listen_interfaces_delete())

    def set_listen_interface_address(self, interface: str, address: str) -> "DHCPv6RelayBatchBuilder":
        return self.add_set(self.m.get_listen_interface_address(interface, address))

    def delete_listen_interface_address(self, interface: str) -> "DHCPv6RelayBatchBuilder":
        return self.add_delete(self.m.get_listen_interface_address_delete(interface))

    # -----------------------------------------------------------------------
    # Upstream interface operations
    # -----------------------------------------------------------------------

    def set_upstream_interface(self, interface: str) -> "DHCPv6RelayBatchBuilder":
        return self.add_set(self.m.get_upstream_interface(interface))

    def delete_upstream_interface(self, interface: str) -> "DHCPv6RelayBatchBuilder":
        return self.add_delete(self.m.get_upstream_interface_delete(interface))

    def delete_upstream_interfaces(self) -> "DHCPv6RelayBatchBuilder":
        return self.add_delete(self.m.get_upstream_interfaces_delete())

    def set_upstream_interface_address(self, interface: str, address: str) -> "DHCPv6RelayBatchBuilder":
        return self.add_set(self.m.get_upstream_interface_address(interface, address))

    def delete_upstream_interface_address(self, interface: str, address: str) -> "DHCPv6RelayBatchBuilder":
        return self.add_delete(self.m.get_upstream_interface_address_delete(interface, address))

    def delete_upstream_interface_addresses(self, interface: str) -> "DHCPv6RelayBatchBuilder":
        return self.add_delete(self.m.get_upstream_interface_addresses_delete(interface))
