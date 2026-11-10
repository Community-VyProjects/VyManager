"""
Babel Protocol Command Mapper

Handles command path generation for Babel routing protocol configuration.
Version-specific logic is in version-specific files.
"""

from typing import Any, Dict, FrozenSet, List
from ..base import BaseFeatureMapper


class BabelMapper(BaseFeatureMapper):
    """Base mapper with common operations shared between VyOS 1.4 and 1.5."""

    _REDIST_IPV4 = frozenset(
        {"bgp", "connected", "isis", "kernel", "openfabric", "ospf", "rip", "static"}
    )
    _REDIST_IPV6 = frozenset(
        {"bgp", "connected", "isis", "kernel", "openfabric", "ospfv3", "ripng", "static"}
    )

    def __init__(self, version: str):
        super().__init__(version)

    def redistribute_ipv4_protocols(self) -> FrozenSet[str]:
        return self._REDIST_IPV4

    def redistribute_ipv6_protocols(self) -> FrozenSet[str]:
        return self._REDIST_IPV6

    def _require_redistribute_ipv4(self, protocol: str) -> None:
        if protocol not in self.redistribute_ipv4_protocols():
            raise ValueError(
                f"redistribute {protocol} is not supported on this device")

    def _require_redistribute_ipv6(self, protocol: str) -> None:
        if protocol not in self.redistribute_ipv6_protocols():
            raise ValueError(
                f"redistribute {protocol} is not supported on this device")

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

    def get_interface_type_delete(self, interface: str) -> List[str]:
        return self.get_interface_path(interface) + ["type"]

    def get_interface_channel_delete(self, interface: str) -> List[str]:
        return self.get_interface_path(interface) + ["channel"]

    def get_interface_hello_interval_delete(self, interface: str) -> List[str]:
        return self.get_interface_path(interface) + ["hello-interval"]

    def get_interface_update_interval_delete(self, interface: str) -> List[str]:
        return self.get_interface_path(interface) + ["update-interval"]

    def get_interface_rxcost_delete(self, interface: str) -> List[str]:
        return self.get_interface_path(interface) + ["rxcost"]

    def get_interface_split_horizon_delete(self, interface: str) -> List[str]:
        return self.get_interface_path(interface) + ["split-horizon"]

    def get_interface_max_rtt_penalty_delete(self, interface: str) -> List[str]:
        return self.get_interface_path(interface) + ["max-rtt-penalty"]

    def get_interface_rtt_decay_delete(self, interface: str) -> List[str]:
        return self.get_interface_path(interface) + ["rtt-decay"]

    def get_interface_rtt_min_delete(self, interface: str) -> List[str]:
        return self.get_interface_path(interface) + ["rtt-min"]

    def get_interface_rtt_max_delete(self, interface: str) -> List[str]:
        return self.get_interface_path(interface) + ["rtt-max"]

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

    def get_parameters_diversity_factor_delete(self) -> List[str]:
        return ["protocols", "babel", "parameters", "diversity-factor"]

    def get_parameters_resend_delay_delete(self) -> List[str]:
        return ["protocols", "babel", "parameters", "resend-delay"]

    def get_parameters_smoothing_half_life_delete(self) -> List[str]:
        return ["protocols", "babel", "parameters", "smoothing-half-life"]

    # ========================================================================
    # Redistribute Paths
    # ========================================================================

    def get_redistribute_ipv4(self, protocol: str) -> List[str]:
        self._require_redistribute_ipv4(protocol)
        return ["protocols", "babel", "redistribute", "ipv4", protocol]

    def get_redistribute_ipv4_delete(self, protocol: str) -> List[str]:
        return ["protocols", "babel", "redistribute", "ipv4", protocol]

    def get_redistribute_ipv6(self, protocol: str) -> List[str]:
        self._require_redistribute_ipv6(protocol)
        return ["protocols", "babel", "redistribute", "ipv6", protocol]

    def get_redistribute_ipv6_delete(self, protocol: str) -> List[str]:
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

    def get_distribute_list_ipv4_access_list_in_delete(self) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv4", "access-list", "in"]

    def get_distribute_list_ipv4_access_list_out_delete(self) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv4", "access-list", "out"]

    def get_distribute_list_ipv4_prefix_list_in_delete(self) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv4", "prefix-list", "in"]

    def get_distribute_list_ipv4_prefix_list_out_delete(self) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv4", "prefix-list", "out"]

    def get_distribute_list_ipv6_access_list_in_delete(self) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv6", "access-list", "in"]

    def get_distribute_list_ipv6_access_list_out_delete(self) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv6", "access-list", "out"]

    def get_distribute_list_ipv6_prefix_list_in_delete(self) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv6", "prefix-list", "in"]

    def get_distribute_list_ipv6_prefix_list_out_delete(self) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv6", "prefix-list", "out"]

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

    def get_distribute_list_ipv4_iface_access_list_in_delete(self, interface: str) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv4",
            "interface", interface, "access-list", "in",
        ]

    def get_distribute_list_ipv4_iface_access_list_out_delete(self, interface: str) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv4",
            "interface", interface, "access-list", "out",
        ]

    def get_distribute_list_ipv4_iface_prefix_list_in_delete(self, interface: str) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv4",
            "interface", interface, "prefix-list", "in",
        ]

    def get_distribute_list_ipv4_iface_prefix_list_out_delete(self, interface: str) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv4",
            "interface", interface, "prefix-list", "out",
        ]

    def get_distribute_list_ipv4_iface_delete(self, interface: str) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv4", "interface", interface]

    def get_distribute_list_ipv6_iface_access_list_in_delete(self, interface: str) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv6",
            "interface", interface, "access-list", "in",
        ]

    def get_distribute_list_ipv6_iface_access_list_out_delete(self, interface: str) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv6",
            "interface", interface, "access-list", "out",
        ]

    def get_distribute_list_ipv6_iface_prefix_list_in_delete(self, interface: str) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv6",
            "interface", interface, "prefix-list", "in",
        ]

    def get_distribute_list_ipv6_iface_prefix_list_out_delete(self, interface: str) -> List[str]:
        return [
            "protocols", "babel", "distribute-list", "ipv6",
            "interface", interface, "prefix-list", "out",
        ]

    def get_distribute_list_ipv6_iface_delete(self, interface: str) -> List[str]:
        return ["protocols", "babel", "distribute-list", "ipv6", "interface", interface]

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_babel_config

        return parse_babel_config(self, full_config)
