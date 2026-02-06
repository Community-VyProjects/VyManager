"""
Babel Protocol Command Mapper

Handles command path generation for Babel routing protocol configuration.
Version-specific logic is in version-specific files.
"""

from typing import List
from ..base import BaseFeatureMapper


class BabelMapper(BaseFeatureMapper):
    """Base mapper with common operations shared between VyOS 1.4 and 1.5."""

    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Interface Paths
    # ========================================================================

    def get_interface_path(self, interface: str) -> List[str]:
        return ["protocols", "babel", "interface", interface]

    def get_interface_type(self, interface: str, iface_type: str) -> List[str]:
        return ["protocols", "babel", "interface", interface, "type", iface_type]

    def get_interface_channel(self, interface: str, channel: str) -> List[str]:
        return ["protocols", "babel", "interface", interface, "channel", channel]

    def get_interface_hello_interval(self, interface: str, interval: str) -> List[str]:
        return ["protocols", "babel", "interface", interface, "hello-interval", interval]

    def get_interface_update_interval(self, interface: str, interval: str) -> List[str]:
        return ["protocols", "babel", "interface", interface, "update-interval", interval]

    def get_interface_rxcost(self, interface: str, rxcost: str) -> List[str]:
        return ["protocols", "babel", "interface", interface, "rxcost", rxcost]

    def get_interface_split_horizon(self, interface: str, mode: str) -> List[str]:
        return ["protocols", "babel", "interface", interface, "split-horizon", mode]

    def get_interface_enable_timestamps(self, interface: str) -> List[str]:
        return ["protocols", "babel", "interface", interface, "enable-timestamps"]

    def get_interface_max_rtt_penalty(self, interface: str, penalty: str) -> List[str]:
        return ["protocols", "babel", "interface", interface, "max-rtt-penalty", penalty]

    def get_interface_rtt_decay(self, interface: str, decay: str) -> List[str]:
        return ["protocols", "babel", "interface", interface, "rtt-decay", decay]

    def get_interface_rtt_min(self, interface: str, rtt_min: str) -> List[str]:
        return ["protocols", "babel", "interface", interface, "rtt-min", rtt_min]

    def get_interface_rtt_max(self, interface: str, rtt_max: str) -> List[str]:
        return ["protocols", "babel", "interface", interface, "rtt-max", rtt_max]

    # ========================================================================
    # Parameters Paths
    # ========================================================================

    def get_parameters_diversity(self) -> List[str]:
        return ["protocols", "babel", "parameters", "diversity"]

    def get_parameters_diversity_factor(self, factor: str) -> List[str]:
        return ["protocols", "babel", "parameters", "diversity-factor", factor]

    def get_parameters_resend_delay(self, delay: str) -> List[str]:
        return ["protocols", "babel", "parameters", "resend-delay", delay]

    def get_parameters_smoothing_half_life(self, half_life: str) -> List[str]:
        return ["protocols", "babel", "parameters", "smoothing-half-life", half_life]

    # ========================================================================
    # Redistribute Paths
    # ========================================================================

    def get_redistribute_ipv4(self, protocol: str) -> List[str]:
        return ["protocols", "babel", "redistribute", "ipv4", protocol]

    def get_redistribute_ipv6(self, protocol: str) -> List[str]:
        return ["protocols", "babel", "redistribute", "ipv6", protocol]

    # ========================================================================
    # Distribute-list Paths (global)
    # ========================================================================

    def get_distribute_list_ipv4_access_list_in(self, acl: str) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv4", "access-list", "in", acl]

    def get_distribute_list_ipv4_access_list_out(self, acl: str) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv4", "access-list", "out", acl]

    def get_distribute_list_ipv4_prefix_list_in(self, prefix_list: str) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv4", "prefix-list", "in", prefix_list]

    def get_distribute_list_ipv4_prefix_list_out(self, prefix_list: str) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv4", "prefix-list", "out", prefix_list]

    def get_distribute_list_ipv6_access_list_in(self, acl: str) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv6", "access-list", "in", acl]

    def get_distribute_list_ipv6_access_list_out(self, acl: str) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv6", "access-list", "out", acl]

    def get_distribute_list_ipv6_prefix_list_in(self, prefix_list: str) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv6", "prefix-list", "in", prefix_list]

    def get_distribute_list_ipv6_prefix_list_out(self, prefix_list: str) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv6", "prefix-list", "out", prefix_list]

    # ========================================================================
    # Distribute-list Paths (per-interface)
    # ========================================================================

    def get_distribute_list_ipv4_iface_access_list_in(
        self, interface: str, acl: str
    ) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv4",
            "interface", interface, "access-list", "in", acl
        ]

    def get_distribute_list_ipv4_iface_access_list_out(
        self, interface: str, acl: str
    ) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv4",
            "interface", interface, "access-list", "out", acl
        ]

    def get_distribute_list_ipv4_iface_prefix_list_in(
        self, interface: str, prefix_list: str
    ) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv4",
            "interface", interface, "prefix-list", "in", prefix_list
        ]

    def get_distribute_list_ipv4_iface_prefix_list_out(
        self, interface: str, prefix_list: str
    ) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv4",
            "interface", interface, "prefix-list", "out", prefix_list
        ]

    def get_distribute_list_ipv6_iface_access_list_in(
        self, interface: str, acl: str
    ) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv6",
            "interface", interface, "access-list", "in", acl
        ]

    def get_distribute_list_ipv6_iface_access_list_out(
        self, interface: str, acl: str
    ) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv6",
            "interface", interface, "access-list", "out", acl
        ]

    def get_distribute_list_ipv6_iface_prefix_list_in(
        self, interface: str, prefix_list: str
    ) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv6",
            "interface", interface, "prefix-list", "in", prefix_list
        ]

    def get_distribute_list_ipv6_iface_prefix_list_out(
        self, interface: str, prefix_list: str
    ) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv6",
            "interface", interface, "prefix-list", "out", prefix_list
        ]
