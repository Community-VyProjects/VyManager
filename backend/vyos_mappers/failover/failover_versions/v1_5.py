"""
VyOS 1.5 Failover Mapper

VyOS 1.5 adds:
  - route <DEST> dhcp-interface <IFACE> (the same check, interface, metric
    and onlink leaves as a next-hop)
  - check target <ADDR> interface / vrf under a next-hop and a
    dhcp-interface (target is a tag node on 1.5)
"""

from typing import List

from ..failover import FailoverMapper


class FailoverMapperV1_5(FailoverMapper):
    """VyOS 1.5 failover mapper with the 1.5-only paths."""

    # ========================================================================
    # Next-Hop Check Target children
    # ========================================================================

    def get_next_hop_check_target_interface(self, destination: str, next_hop: str, target: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target", target, "interface", value]

    def get_next_hop_check_target_vrf(self, destination: str, next_hop: str, target: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target", target, "vrf", value]

    def get_next_hop_check_target_interface_path(self, destination: str, next_hop: str, target: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target", target, "interface"]

    def get_next_hop_check_target_vrf_path(self, destination: str, next_hop: str, target: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target", target, "vrf"]

    # ========================================================================
    # DHCP-Interface Paths
    # ========================================================================

    def get_dhcp_interface_path(self, destination: str, dhcp_interface: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface]

    def get_dhcp_interface_check_policy(self, destination: str, dhcp_interface: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "check", "policy", value]

    def get_dhcp_interface_check_port(self, destination: str, dhcp_interface: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "check", "port", value]

    def get_dhcp_interface_check_target(self, destination: str, dhcp_interface: str, target: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "check", "target", target]

    def get_dhcp_interface_check_target_interface(self, destination: str, dhcp_interface: str, target: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "check", "target", target, "interface", value]

    def get_dhcp_interface_check_target_vrf(self, destination: str, dhcp_interface: str, target: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "check", "target", target, "vrf", value]

    def get_dhcp_interface_check_timeout(self, destination: str, dhcp_interface: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "check", "timeout", value]

    def get_dhcp_interface_check_type(self, destination: str, dhcp_interface: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "check", "type", value]

    def get_dhcp_interface_interface(self, destination: str, dhcp_interface: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "interface", value]

    def get_dhcp_interface_metric(self, destination: str, dhcp_interface: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "metric", value]

    def get_dhcp_interface_onlink(self, destination: str, dhcp_interface: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "onlink"]

    # --- delete helper paths (no value leaf) ---

    def get_dhcp_interface_check_policy_path(self, destination: str, dhcp_interface: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "check", "policy"]

    def get_dhcp_interface_check_port_path(self, destination: str, dhcp_interface: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "check", "port"]

    def get_dhcp_interface_check_target_path(self, destination: str, dhcp_interface: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "check", "target"]

    def get_dhcp_interface_check_target_interface_path(self, destination: str, dhcp_interface: str, target: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "check", "target", target, "interface"]

    def get_dhcp_interface_check_target_vrf_path(self, destination: str, dhcp_interface: str, target: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "check", "target", target, "vrf"]

    def get_dhcp_interface_check_timeout_path(self, destination: str, dhcp_interface: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "check", "timeout"]

    def get_dhcp_interface_check_type_path(self, destination: str, dhcp_interface: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "check", "type"]

    def get_dhcp_interface_interface_path(self, destination: str, dhcp_interface: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "interface"]

    def get_dhcp_interface_metric_path(self, destination: str, dhcp_interface: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "metric"]
