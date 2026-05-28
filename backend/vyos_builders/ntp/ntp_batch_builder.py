"""
NTP Service Batch Builder

Generates VyOS set/delete operations for the NTP service.

Configuration lives under: service ntp

Structure:
  service ntp
    allow-client address <addr>   # Multi-value IPv4/IPv6/CIDR — restrict NTP clients
    interface <name>              # Multi-value — listen on specific interface(s)
    leap-second <value>           # Single value: ignore|smear|system|timezone
    listen-address <addr>         # Multi-value IPv4/IPv6 — bind to specific address(es)
    server <hostname>             # Tag node — upstream NTP server
      noselect                   # Presence flag — mark server as unused
      nts                        # Presence flag — enable Network Time Security
      pool                       # Presence flag — treat as NTP pool
      prefer                     # Presence flag — mark as preferred server
    vrf <name>                   # Single value — VRF instance

Version differences:
  1.4 and 1.5 share identical NTP config paths — no version-specific overrides.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class NTPBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["ntp"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "NTPBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "NTPBatchBuilder":
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
                "ntp": {
                    "supported": True,
                    "description": "Network Time Protocol service",
                },
                "allow_client": {
                    "supported": True,
                    "description": "Restrict NTP service to specific client addresses/subnets",
                    "multi_value": True,
                },
                "interface": {
                    "supported": True,
                    "description": "Bind NTP service to specific network interfaces",
                    "multi_value": True,
                },
                "leap_second": {
                    "supported": True,
                    "description": "Leap second handling behavior",
                    "values": ["ignore", "smear", "system", "timezone"],
                    "default": "timezone",
                },
                "listen_address": {
                    "supported": True,
                    "description": "Bind NTP service to specific local IP addresses",
                    "multi_value": True,
                },
                "server": {
                    "supported": True,
                    "description": "Upstream NTP server configuration",
                    "flags": {
                        "noselect": "Mark server as unused (excluded from sync)",
                        "nts": "Enable Network Time Security (NTS) authentication",
                        "pool": "Treat server as NTP pool (multiple servers behind hostname)",
                        "prefer": "Mark as preferred time source",
                    },
                },
                "vrf": {
                    "supported": True,
                    "description": "Bind NTP service to a VRF instance",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Global
    # -----------------------------------------------------------------------

    def delete_ntp(self) -> "NTPBatchBuilder":
        """Delete the entire NTP service configuration."""
        return self.add_delete(self.m.get_ntp_delete())

    # -----------------------------------------------------------------------
    # Allow-client address
    # -----------------------------------------------------------------------

    def set_allow_client(self, address: str) -> "NTPBatchBuilder":
        """Allow NTP queries from a specific address or subnet."""
        return self.add_set(self.m.get_allow_client(address))

    def delete_allow_client(self, address: str) -> "NTPBatchBuilder":
        """Remove a specific allow-client address."""
        return self.add_delete(self.m.get_allow_client_delete(address))

    def delete_all_allow_clients(self) -> "NTPBatchBuilder":
        """Remove all allow-client restrictions."""
        return self.add_delete(self.m.get_all_allow_clients_delete())

    # -----------------------------------------------------------------------
    # Interface
    # -----------------------------------------------------------------------

    def set_interface(self, name: str) -> "NTPBatchBuilder":
        """Bind NTP service to a specific interface."""
        return self.add_set(self.m.get_interface(name))

    def delete_interface(self, name: str) -> "NTPBatchBuilder":
        """Remove a specific interface binding."""
        return self.add_delete(self.m.get_interface_delete(name))

    def delete_all_interfaces(self) -> "NTPBatchBuilder":
        """Remove all interface bindings."""
        return self.add_delete(self.m.get_all_interfaces_delete())

    # -----------------------------------------------------------------------
    # Leap-second
    # -----------------------------------------------------------------------

    def set_leap_second(self, value: str) -> "NTPBatchBuilder":
        """Set leap second handling (ignore|smear|system|timezone)."""
        return self.add_set(self.m.get_leap_second(value))

    def delete_leap_second(self) -> "NTPBatchBuilder":
        """Remove leap second setting (reverts to default: timezone)."""
        return self.add_delete(self.m.get_leap_second_delete())

    # -----------------------------------------------------------------------
    # Listen-address
    # -----------------------------------------------------------------------

    def set_listen_address(self, address: str) -> "NTPBatchBuilder":
        """Bind NTP service to a specific local IP address."""
        return self.add_set(self.m.get_listen_address(address))

    def delete_listen_address(self, address: str) -> "NTPBatchBuilder":
        """Remove a specific listen address."""
        return self.add_delete(self.m.get_listen_address_delete(address))

    def delete_all_listen_addresses(self) -> "NTPBatchBuilder":
        """Remove all listen address bindings."""
        return self.add_delete(self.m.get_all_listen_addresses_delete())

    # -----------------------------------------------------------------------
    # Server
    # -----------------------------------------------------------------------

    def set_server(self, name: str) -> "NTPBatchBuilder":
        """Add an NTP server entry."""
        return self.add_set(self.m.get_server(name))

    def delete_server(self, name: str) -> "NTPBatchBuilder":
        """Remove an NTP server and all its flags."""
        return self.add_delete(self.m.get_server_delete(name))

    def set_server_noselect(self, name: str) -> "NTPBatchBuilder":
        """Mark a server as unused (excluded from sync selection)."""
        return self.add_set(self.m.get_server_noselect(name))

    def delete_server_noselect(self, name: str) -> "NTPBatchBuilder":
        """Remove the noselect flag from a server."""
        return self.add_delete(self.m.get_server_noselect(name))

    def set_server_nts(self, name: str) -> "NTPBatchBuilder":
        """Enable Network Time Security (NTS) for a server."""
        return self.add_set(self.m.get_server_nts(name))

    def delete_server_nts(self, name: str) -> "NTPBatchBuilder":
        """Disable Network Time Security (NTS) for a server."""
        return self.add_delete(self.m.get_server_nts(name))

    def set_server_pool(self, name: str) -> "NTPBatchBuilder":
        """Mark a server as an NTP pool."""
        return self.add_set(self.m.get_server_pool(name))

    def delete_server_pool(self, name: str) -> "NTPBatchBuilder":
        """Remove the pool flag from a server."""
        return self.add_delete(self.m.get_server_pool(name))

    def set_server_prefer(self, name: str) -> "NTPBatchBuilder":
        """Mark a server as the preferred time source."""
        return self.add_set(self.m.get_server_prefer(name))

    def delete_server_prefer(self, name: str) -> "NTPBatchBuilder":
        """Remove the prefer flag from a server."""
        return self.add_delete(self.m.get_server_prefer(name))

    # -----------------------------------------------------------------------
    # VRF
    # -----------------------------------------------------------------------

    def set_vrf(self, name: str) -> "NTPBatchBuilder":
        """Bind NTP service to a VRF instance."""
        return self.add_set(self.m.get_vrf(name))

    def delete_vrf(self) -> "NTPBatchBuilder":
        """Remove the VRF binding from the NTP service."""
        return self.add_delete(self.m.get_vrf_delete())
