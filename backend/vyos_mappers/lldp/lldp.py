"""LLDP Service Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "lldp"]


class LLDPMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    def _iface(self, name: str) -> List[str]:
        return BASE + ["interface", name]

    # ========================================================================
    # Global
    # ========================================================================

    def get_lldp_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Management address (multi-value)
    # ========================================================================

    def get_management_address(self, ip: str) -> List[str]:
        return BASE + ["management-address", ip]

    def get_management_address_delete(self, ip: str) -> List[str]:
        return BASE + ["management-address", ip]

    def get_all_management_addresses_delete(self) -> List[str]:
        return BASE + ["management-address"]

    # ========================================================================
    # SNMP (presence flag)
    # ========================================================================

    def get_snmp(self) -> List[str]:
        return BASE + ["snmp"]

    # ========================================================================
    # Legacy protocols (presence flags: cdp, edp, fdp, sonmp)
    # ========================================================================

    def get_legacy_protocol(self, protocol: str) -> List[str]:
        return BASE + ["legacy-protocols", protocol]

    def get_legacy_protocols_delete(self) -> List[str]:
        return BASE + ["legacy-protocols"]

    # ========================================================================
    # Interface (tag node)
    # ========================================================================

    def get_interface(self, name: str) -> List[str]:
        return self._iface(name)

    def get_interface_delete(self, name: str) -> List[str]:
        return self._iface(name)

    # Interface mode (1.5): values = disable | rx-tx | rx | tx
    def get_interface_mode(self, name: str, mode: str) -> List[str]:
        return self._iface(name) + ["mode", mode]

    def get_interface_mode_delete(self, name: str) -> List[str]:
        return self._iface(name) + ["mode"]

    # Interface disable (1.4 presence flag)
    def get_interface_disable(self, name: str) -> List[str]:
        return self._iface(name) + ["disable"]

    # ========================================================================
    # Interface location — coordinate-based
    # ========================================================================

    def get_interface_location_coordinate_altitude(self, name: str, value: str) -> List[str]:
        return self._iface(name) + ["location", "coordinate-based", "altitude", value]

    def get_interface_location_coordinate_altitude_delete(self, name: str) -> List[str]:
        return self._iface(name) + ["location", "coordinate-based", "altitude"]

    def get_interface_location_coordinate_datum(self, name: str, value: str) -> List[str]:
        return self._iface(name) + ["location", "coordinate-based", "datum", value]

    def get_interface_location_coordinate_datum_delete(self, name: str) -> List[str]:
        return self._iface(name) + ["location", "coordinate-based", "datum"]

    def get_interface_location_coordinate_latitude(self, name: str, value: str) -> List[str]:
        return self._iface(name) + ["location", "coordinate-based", "latitude", value]

    def get_interface_location_coordinate_latitude_delete(self, name: str) -> List[str]:
        return self._iface(name) + ["location", "coordinate-based", "latitude"]

    def get_interface_location_coordinate_longitude(self, name: str, value: str) -> List[str]:
        return self._iface(name) + ["location", "coordinate-based", "longitude", value]

    def get_interface_location_coordinate_longitude_delete(self, name: str) -> List[str]:
        return self._iface(name) + ["location", "coordinate-based", "longitude"]

    def get_interface_location_coordinate_based_delete(self, name: str) -> List[str]:
        return self._iface(name) + ["location", "coordinate-based"]

    # ========================================================================
    # Interface location — ELIN
    # ========================================================================

    def get_interface_location_elin(self, name: str, value: str) -> List[str]:
        return self._iface(name) + ["location", "elin", value]

    def get_interface_location_elin_delete(self, name: str) -> List[str]:
        return self._iface(name) + ["location", "elin"]

    def get_interface_location_delete(self, name: str) -> List[str]:
        return self._iface(name) + ["location"]
