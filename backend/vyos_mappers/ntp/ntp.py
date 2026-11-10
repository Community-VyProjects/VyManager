"""NTP Service Command Mapper."""
from typing import Any, Dict, FrozenSet, List
from ..base import BaseFeatureMapper

BASE = ["service", "ntp"]


class NTPMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    def versioned_nodes(self) -> FrozenSet[str]:
        """1.5-only NTP leaves this device has.

        Timestamp receive-filter lives on the 1.5 subclass as path methods.
        Capabilities and builders read this set instead of the version string.
        """
        nodes = []
        if callable(getattr(self, "get_timestamp_interface_receive_filter", None)):
            nodes.append("timestamp_receive_filter")
        return frozenset(nodes)

    def _require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"ntp {node} is not supported on this device")

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_ntp_config

        return parse_ntp_config(self, full_config)

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
