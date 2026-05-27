"""
LLDP Service Batch Builder

Generates VyOS set/delete operations for the LLDP service.

Configuration lives under: service lldp

Structure:
  service lldp
    management-address <ip>           # Multi-value IPv4/IPv6
    snmp                              # Presence flag — enable SNMP queries
    legacy-protocols
      cdp                             # Presence flag — Cisco Discovery Protocol
      edp                             # Presence flag — Extreme Discovery Protocol
      fdp                             # Presence flag — Foundry Discovery Protocol
      sonmp                           # Presence flag — Nortel SONMP
    interface <name>                  # Tag node — per-interface config
      mode <disable|rx-tx|rx|tx>      # 1.5 only: operation mode
      disable                         # 1.4 only: presence flag to disable interface
      location
        coordinate-based
          altitude <value>
          datum <WGS84|NAD83|MLLW>
          latitude <value>
          longitude <value>
        elin <value>                  # Emergency location identifier number

Version differences:
  1.4 — per-interface disable is a presence flag: interface <name> disable
  1.5 — per-interface mode supports: disable, rx-tx (default), rx, tx
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class LLDPBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["lldp"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "LLDPBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "LLDPBatchBuilder":
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
                "lldp": {
                    "supported": True,
                    "description": "Link Layer Discovery Protocol service",
                },
                "management_address": {
                    "supported": True,
                    "description": "Management IPv4/IPv6 address(es) advertised via LLDP",
                    "multi_value": True,
                },
                "snmp": {
                    "supported": True,
                    "description": "Enable SNMP queries of the LLDP database",
                },
                "legacy_protocols": {
                    "supported": True,
                    "description": "Vendor-specific legacy discovery protocols",
                    "protocols": {
                        "cdp": "Cisco Discovery Protocol",
                        "edp": "Extreme Discovery Protocol",
                        "fdp": "Foundry Discovery Protocol",
                        "sonmp": "Nortel SONMP",
                    },
                },
                "interface_mode": {
                    "supported": is_1_5,
                    "description": "Per-interface LLDP operation mode (disable, rx-tx, rx, tx)",
                    "values": ["disable", "rx-tx", "rx", "tx"],
                    "default": "rx-tx",
                },
                "interface_disable_flag": {
                    "supported": is_1_4,
                    "description": "Per-interface disable presence flag (1.4 only)",
                },
                "location_coordinate_based": {
                    "supported": True,
                    "description": "LLDP-MED coordinate-based location (altitude, datum, latitude, longitude)",
                    "datum_values": ["WGS84", "NAD83", "MLLW"],
                },
                "location_elin": {
                    "supported": True,
                    "description": "LLDP-MED ELIN emergency location identifier (10-25 digits)",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Global service
    # -----------------------------------------------------------------------

    def delete_lldp(self) -> "LLDPBatchBuilder":
        """Delete the entire LLDP service configuration."""
        return self.add_delete(self.m.get_lldp_delete())

    # -----------------------------------------------------------------------
    # Management address
    # -----------------------------------------------------------------------

    def set_management_address(self, ip: str) -> "LLDPBatchBuilder":
        """Add a management address advertised via LLDP."""
        return self.add_set(self.m.get_management_address(ip))

    def delete_management_address(self, ip: str) -> "LLDPBatchBuilder":
        """Remove a specific management address."""
        return self.add_delete(self.m.get_management_address_delete(ip))

    def delete_all_management_addresses(self) -> "LLDPBatchBuilder":
        """Remove all management addresses."""
        return self.add_delete(self.m.get_all_management_addresses_delete())

    # -----------------------------------------------------------------------
    # SNMP
    # -----------------------------------------------------------------------

    def set_snmp(self) -> "LLDPBatchBuilder":
        """Enable SNMP queries of the LLDP database."""
        return self.add_set(self.m.get_snmp())

    def delete_snmp(self) -> "LLDPBatchBuilder":
        """Disable SNMP queries of the LLDP database."""
        return self.add_delete(self.m.get_snmp())

    # -----------------------------------------------------------------------
    # Legacy protocols
    # -----------------------------------------------------------------------

    def set_legacy_protocol(self, protocol: str) -> "LLDPBatchBuilder":
        """Enable a legacy discovery protocol (cdp, edp, fdp, sonmp)."""
        return self.add_set(self.m.get_legacy_protocol(protocol))

    def delete_legacy_protocol(self, protocol: str) -> "LLDPBatchBuilder":
        """Disable a legacy discovery protocol."""
        return self.add_delete(self.m.get_legacy_protocol(protocol))

    def delete_all_legacy_protocols(self) -> "LLDPBatchBuilder":
        """Remove all legacy protocol settings."""
        return self.add_delete(self.m.get_legacy_protocols_delete())

    # -----------------------------------------------------------------------
    # Interface node
    # -----------------------------------------------------------------------

    def set_interface(self, name: str) -> "LLDPBatchBuilder":
        """Create or touch an interface entry."""
        return self.add_set(self.m.get_interface(name))

    def delete_interface(self, name: str) -> "LLDPBatchBuilder":
        """Remove all LLDP config for an interface."""
        return self.add_delete(self.m.get_interface_delete(name))

    # -----------------------------------------------------------------------
    # Interface mode (1.5 only)
    # -----------------------------------------------------------------------

    def set_interface_mode(self, name: str, mode: str) -> "LLDPBatchBuilder":
        """Set the LLDP operation mode for an interface (1.5: disable|rx-tx|rx|tx)."""
        return self.add_set(self.m.get_interface_mode(name, mode))

    def delete_interface_mode(self, name: str) -> "LLDPBatchBuilder":
        """Remove the interface mode setting (reverts to default rx-tx)."""
        return self.add_delete(self.m.get_interface_mode_delete(name))

    # -----------------------------------------------------------------------
    # Interface disable flag (1.4 only)
    # -----------------------------------------------------------------------

    def set_interface_disable(self, name: str) -> "LLDPBatchBuilder":
        """Disable LLDP on an interface via presence flag (1.4 only)."""
        return self.add_set(self.m.get_interface_disable(name))

    def delete_interface_disable(self, name: str) -> "LLDPBatchBuilder":
        """Re-enable LLDP on an interface by removing the disable flag (1.4 only)."""
        return self.add_delete(self.m.get_interface_disable(name))

    # -----------------------------------------------------------------------
    # Interface location — coordinate-based
    # -----------------------------------------------------------------------

    def set_interface_location_coordinate_altitude(self, name: str, value: str) -> "LLDPBatchBuilder":
        return self.add_set(self.m.get_interface_location_coordinate_altitude(name, value))

    def delete_interface_location_coordinate_altitude(self, name: str) -> "LLDPBatchBuilder":
        return self.add_delete(self.m.get_interface_location_coordinate_altitude_delete(name))

    def set_interface_location_coordinate_datum(self, name: str, value: str) -> "LLDPBatchBuilder":
        return self.add_set(self.m.get_interface_location_coordinate_datum(name, value))

    def delete_interface_location_coordinate_datum(self, name: str) -> "LLDPBatchBuilder":
        return self.add_delete(self.m.get_interface_location_coordinate_datum_delete(name))

    def set_interface_location_coordinate_latitude(self, name: str, value: str) -> "LLDPBatchBuilder":
        return self.add_set(self.m.get_interface_location_coordinate_latitude(name, value))

    def delete_interface_location_coordinate_latitude(self, name: str) -> "LLDPBatchBuilder":
        return self.add_delete(self.m.get_interface_location_coordinate_latitude_delete(name))

    def set_interface_location_coordinate_longitude(self, name: str, value: str) -> "LLDPBatchBuilder":
        return self.add_set(self.m.get_interface_location_coordinate_longitude(name, value))

    def delete_interface_location_coordinate_longitude(self, name: str) -> "LLDPBatchBuilder":
        return self.add_delete(self.m.get_interface_location_coordinate_longitude_delete(name))

    def delete_interface_location_coordinate_based(self, name: str) -> "LLDPBatchBuilder":
        """Remove all coordinate-based location data for an interface."""
        return self.add_delete(self.m.get_interface_location_coordinate_based_delete(name))

    # -----------------------------------------------------------------------
    # Interface location — ELIN
    # -----------------------------------------------------------------------

    def set_interface_location_elin(self, name: str, value: str) -> "LLDPBatchBuilder":
        """Set the ELIN emergency location number for an interface."""
        return self.add_set(self.m.get_interface_location_elin(name, value))

    def delete_interface_location_elin(self, name: str) -> "LLDPBatchBuilder":
        """Remove the ELIN emergency location number for an interface."""
        return self.add_delete(self.m.get_interface_location_elin_delete(name))

    def delete_interface_location(self, name: str) -> "LLDPBatchBuilder":
        """Remove all location data for an interface."""
        return self.add_delete(self.m.get_interface_location_delete(name))
