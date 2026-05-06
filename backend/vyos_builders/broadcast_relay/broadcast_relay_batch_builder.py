"""
Broadcast Relay Service Batch Builder

Generates VyOS set/delete operations for the broadcast-relay service.

Configuration lives under: service broadcast-relay

Structure:
  service broadcast-relay
    disable                        # Global disable (presence flag)
    id <1-99>                      # Relay instance
      address <ipv4>               # Source IP for forwarded packets (optional)
      description <text>           # Instance description
      disable                      # Disable this instance (presence flag)
      interface <iface>            # Interfaces to relay on (multi-value)
      port <1-65535>               # UDP port number

The template structure is identical between VyOS 1.4 and 1.5.
Multi-argument batch operations encode compound values as "arg1,arg2"
(comma-separated), matching the project's standard batch dispatch pattern.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class BroadcastRelayBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["broadcast_relay"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "BroadcastRelayBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "BroadcastRelayBatchBuilder":
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
                "broadcast_relay": {
                    "supported": True,
                    "description": "UDP Broadcast Relay service",
                },
                "global_disable": {
                    "supported": True,
                    "description": "Globally disable all broadcast relay instances",
                },
                "instance_id_range": {
                    "supported": True,
                    "description": "Relay instance ID range 1–99",
                    "min": 1,
                    "max": 99,
                },
                "address": {
                    "supported": True,
                    "description": "Optional source IPv4 address for forwarded packets",
                },
                "description": {
                    "supported": True,
                    "description": "Free-text description for a relay instance",
                },
                "instance_disable": {
                    "supported": True,
                    "description": "Disable a specific relay instance",
                },
                "interface": {
                    "supported": True,
                    "description": "One or more interfaces to relay UDP broadcasts on",
                },
                "port": {
                    "supported": True,
                    "description": "UDP port number (1–65535)",
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

    def set_global_disable(self) -> "BroadcastRelayBatchBuilder":
        """Globally disable all broadcast relay instances."""
        return self.add_set(self.m.get_global_disable())

    def delete_global_disable(self) -> "BroadcastRelayBatchBuilder":
        """Remove the global disable flag (re-enable service)."""
        return self.add_delete(self.m.get_global_disable())

    def delete_broadcast_relay(self) -> "BroadcastRelayBatchBuilder":
        """Delete the entire broadcast-relay configuration."""
        return self.add_delete(self.m.get_broadcast_relay_delete())

    # -----------------------------------------------------------------------
    # Instance CRUD
    # -----------------------------------------------------------------------

    def set_instance(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        """Create or touch a relay instance node."""
        return self.add_set(self.m.get_instance(relay_id))

    def delete_instance(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        """Delete an entire relay instance."""
        return self.add_delete(self.m.get_instance(relay_id))

    # -----------------------------------------------------------------------
    # Instance: address
    # -----------------------------------------------------------------------

    def set_instance_address(self, relay_id: str, address: str) -> "BroadcastRelayBatchBuilder":
        return self.add_set(self.m.get_instance_address(relay_id, address))

    def delete_instance_address(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        return self.add_delete(self.m.get_instance_address_delete(relay_id))

    # -----------------------------------------------------------------------
    # Instance: description
    # -----------------------------------------------------------------------

    def set_instance_description(self, relay_id: str, description: str) -> "BroadcastRelayBatchBuilder":
        return self.add_set(self.m.get_instance_description(relay_id, description))

    def delete_instance_description(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        return self.add_delete(self.m.get_instance_description_delete(relay_id))

    # -----------------------------------------------------------------------
    # Instance: disable flag
    # -----------------------------------------------------------------------

    def set_instance_disable(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        """Disable a specific relay instance."""
        return self.add_set(self.m.get_instance_disable(relay_id))

    def delete_instance_disable(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        """Remove the disable flag (re-enable the instance)."""
        return self.add_delete(self.m.get_instance_disable(relay_id))

    # -----------------------------------------------------------------------
    # Instance: interfaces (multi-value)
    # -----------------------------------------------------------------------

    def set_instance_interface(self, relay_id: str, interface: str) -> "BroadcastRelayBatchBuilder":
        """Add an interface to the relay instance."""
        return self.add_set(self.m.get_instance_interface(relay_id, interface))

    def delete_instance_interface(self, relay_id: str, interface: str) -> "BroadcastRelayBatchBuilder":
        """Remove a specific interface from the relay instance."""
        return self.add_delete(self.m.get_instance_interface_delete(relay_id, interface))

    def delete_instance_interfaces(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        """Remove all interfaces from the relay instance."""
        return self.add_delete(self.m.get_instance_interfaces_delete(relay_id))

    # -----------------------------------------------------------------------
    # Instance: port
    # -----------------------------------------------------------------------

    def set_instance_port(self, relay_id: str, port: str) -> "BroadcastRelayBatchBuilder":
        return self.add_set(self.m.get_instance_port(relay_id, port))

    def delete_instance_port(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        return self.add_delete(self.m.get_instance_port_delete(relay_id))
