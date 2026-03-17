"""
VyOS 1.5 Failover Mapper Overrides

1.5 differences:
- dhcp-interface support (new sub-type under route)
- check/target is a tag node with interface and vrf sub-properties

Config tree (1.5):
  protocols failover/
    route/<DEST>/
      dhcp-interface/<IFACE>/
        check/{policy, port, target/<ADDR>/{interface, vrf}, timeout, type}
        interface
        metric
        onlink
      next-hop/<NH>/
        check/{policy, port, target/<ADDR>/{interface, vrf}, timeout, type}
        interface
        metric
        onlink
"""

from typing import List


class FailoverMapperV1_5:
    """VyOS 1.5 specific failover paths."""

    def _base(self) -> List[str]:
        return ["protocols", "failover"]

    # ========================================================================
    # Next-Hop Check Target (tag node in 1.5 — with interface/vrf sub-props)
    # ========================================================================

    def get_next_hop_check_target(self, destination: str, next_hop: str, target: str) -> List[str]:
        """In 1.5, target is a tag node."""
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target", target]

    def get_next_hop_check_target_interface(self, destination: str, next_hop: str, target: str, value: str) -> List[str]:
        """Target interface sub-property (1.5 only)."""
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target", target, "interface", value]

    def get_next_hop_check_target_vrf(self, destination: str, next_hop: str, target: str, value: str) -> List[str]:
        """Target VRF sub-property (1.5 only)."""
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target", target, "vrf", value]

    def get_next_hop_check_target_path(self, destination: str, next_hop: str) -> List[str]:
        """Path for deleting all targets."""
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target"]

    def get_next_hop_check_target_interface_path(self, destination: str, next_hop: str, target: str) -> List[str]:
        """Path for deleting a target's interface."""
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target", target, "interface"]

    def get_next_hop_check_target_vrf_path(self, destination: str, next_hop: str, target: str) -> List[str]:
        """Path for deleting a target's VRF."""
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target", target, "vrf"]

    # ========================================================================
    # DHCP-Interface Paths (1.5 only)
    # ========================================================================

    def get_dhcp_interface_path(self, destination: str, dhcp_interface: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface]

    # --- DHCP-Interface: check settings ---

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

    # --- DHCP-Interface: direct settings ---

    def get_dhcp_interface_interface(self, destination: str, dhcp_interface: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "interface", value]

    def get_dhcp_interface_metric(self, destination: str, dhcp_interface: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "metric", value]

    def get_dhcp_interface_onlink(self, destination: str, dhcp_interface: str) -> List[str]:
        return self._base() + ["route", destination, "dhcp-interface", dhcp_interface, "onlink"]

    # --- DHCP-Interface: delete helper paths ---

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
