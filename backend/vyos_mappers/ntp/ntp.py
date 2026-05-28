"""NTP Service Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "ntp"]


class NTPMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Global
    # ========================================================================

    def get_ntp_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Allow-client address (multi-value)
    # ========================================================================

    def get_allow_client(self, address: str) -> List[str]:
        return BASE + ["allow-client", "address", address]

    def get_allow_client_delete(self, address: str) -> List[str]:
        return BASE + ["allow-client", "address", address]

    def get_all_allow_clients_delete(self) -> List[str]:
        return BASE + ["allow-client"]

    # ========================================================================
    # Interface (multi-value)
    # ========================================================================

    def get_interface(self, name: str) -> List[str]:
        return BASE + ["interface", name]

    def get_interface_delete(self, name: str) -> List[str]:
        return BASE + ["interface", name]

    def get_all_interfaces_delete(self) -> List[str]:
        return BASE + ["interface"]

    # ========================================================================
    # Leap-second (single value: ignore|smear|system|timezone)
    # ========================================================================

    def get_leap_second(self, value: str) -> List[str]:
        return BASE + ["leap-second", value]

    def get_leap_second_delete(self) -> List[str]:
        return BASE + ["leap-second"]

    # ========================================================================
    # Listen-address (multi-value)
    # ========================================================================

    def get_listen_address(self, address: str) -> List[str]:
        return BASE + ["listen-address", address]

    def get_listen_address_delete(self, address: str) -> List[str]:
        return BASE + ["listen-address", address]

    def get_all_listen_addresses_delete(self) -> List[str]:
        return BASE + ["listen-address"]

    # ========================================================================
    # Server (tag node)
    # ========================================================================

    def get_server(self, name: str) -> List[str]:
        return BASE + ["server", name]

    def get_server_delete(self, name: str) -> List[str]:
        return BASE + ["server", name]

    # Server flags (presence nodes)
    def get_server_noselect(self, name: str) -> List[str]:
        return BASE + ["server", name, "noselect"]

    def get_server_nts(self, name: str) -> List[str]:
        return BASE + ["server", name, "nts"]

    def get_server_pool(self, name: str) -> List[str]:
        return BASE + ["server", name, "pool"]

    def get_server_prefer(self, name: str) -> List[str]:
        return BASE + ["server", name, "prefer"]

    # ========================================================================
    # VRF (single value)
    # ========================================================================

    def get_vrf(self, name: str) -> List[str]:
        return BASE + ["vrf", name]

    def get_vrf_delete(self) -> List[str]:
        return BASE + ["vrf"]
