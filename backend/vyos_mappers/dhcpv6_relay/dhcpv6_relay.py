"""DHCPv6 Relay Service Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "dhcpv6-relay"]


class DHCPv6RelayMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Global service paths
    # ========================================================================

    def get_dhcpv6_relay_delete(self) -> List[str]:
        return BASE

    def get_global_disable(self) -> List[str]:
        return BASE + ["disable"]

    def get_use_interface_id_option(self) -> List[str]:
        return BASE + ["use-interface-id-option"]

    def get_max_hop_count(self, value: str) -> List[str]:
        return BASE + ["max-hop-count", value]

    def get_max_hop_count_delete(self) -> List[str]:
        return BASE + ["max-hop-count"]

    # ========================================================================
    # Listen interface paths (tagged node with optional address)
    # ========================================================================

    def get_listen_interface(self, interface: str) -> List[str]:
        return BASE + ["listen-interface", interface]

    def get_listen_interface_delete(self, interface: str) -> List[str]:
        return BASE + ["listen-interface", interface]

    def get_listen_interfaces_delete(self) -> List[str]:
        return BASE + ["listen-interface"]

    def get_listen_interface_address(self, interface: str, address: str) -> List[str]:
        return BASE + ["listen-interface", interface, "address", address]

    def get_listen_interface_address_delete(self, interface: str) -> List[str]:
        return BASE + ["listen-interface", interface, "address"]

    # ========================================================================
    # Upstream interface paths (tagged node with multi-value address)
    # ========================================================================

    def get_upstream_interface(self, interface: str) -> List[str]:
        return BASE + ["upstream-interface", interface]

    def get_upstream_interface_delete(self, interface: str) -> List[str]:
        return BASE + ["upstream-interface", interface]

    def get_upstream_interfaces_delete(self) -> List[str]:
        return BASE + ["upstream-interface"]

    def get_upstream_interface_address(self, interface: str, address: str) -> List[str]:
        return BASE + ["upstream-interface", interface, "address", address]

    def get_upstream_interface_address_delete(self, interface: str, address: str) -> List[str]:
        return BASE + ["upstream-interface", interface, "address", address]

    def get_upstream_interface_addresses_delete(self, interface: str) -> List[str]:
        return BASE + ["upstream-interface", interface, "address"]
