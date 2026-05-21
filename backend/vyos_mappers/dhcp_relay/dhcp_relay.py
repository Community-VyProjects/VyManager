"""DHCP Relay Service Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "dhcp-relay"]


class DHCPRelayMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Global service paths
    # ========================================================================

    def get_dhcp_relay_delete(self) -> List[str]:
        return BASE

    def get_global_disable(self) -> List[str]:
        return BASE + ["disable"]

    # ========================================================================
    # Interface paths (multi-value)
    # ========================================================================

    def get_interface(self, interface: str) -> List[str]:
        return BASE + ["interface", interface]

    def get_interface_delete(self, interface: str) -> List[str]:
        return BASE + ["interface", interface]

    def get_interfaces_delete(self) -> List[str]:
        return BASE + ["interface"]

    def get_listen_interface(self, interface: str) -> List[str]:
        return BASE + ["listen-interface", interface]

    def get_listen_interface_delete(self, interface: str) -> List[str]:
        return BASE + ["listen-interface", interface]

    def get_listen_interfaces_delete(self) -> List[str]:
        return BASE + ["listen-interface"]

    def get_upstream_interface(self, interface: str) -> List[str]:
        return BASE + ["upstream-interface", interface]

    def get_upstream_interface_delete(self, interface: str) -> List[str]:
        return BASE + ["upstream-interface", interface]

    def get_upstream_interfaces_delete(self) -> List[str]:
        return BASE + ["upstream-interface"]

    # ========================================================================
    # Server paths (multi-value)
    # ========================================================================

    def get_server(self, address: str) -> List[str]:
        return BASE + ["server", address]

    def get_server_delete(self, address: str) -> List[str]:
        return BASE + ["server", address]

    def get_servers_delete(self) -> List[str]:
        return BASE + ["server"]

    # ========================================================================
    # Relay options paths
    # ========================================================================

    def get_hop_count(self, value: str) -> List[str]:
        return BASE + ["relay-options", "hop-count", value]

    def get_hop_count_delete(self) -> List[str]:
        return BASE + ["relay-options", "hop-count"]

    def get_max_size(self, value: str) -> List[str]:
        return BASE + ["relay-options", "max-size", value]

    def get_max_size_delete(self) -> List[str]:
        return BASE + ["relay-options", "max-size"]

    def get_relay_agents_packets(self, policy: str) -> List[str]:
        return BASE + ["relay-options", "relay-agents-packets", policy]

    def get_relay_agents_packets_delete(self) -> List[str]:
        return BASE + ["relay-options", "relay-agents-packets"]
