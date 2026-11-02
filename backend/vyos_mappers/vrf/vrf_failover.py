"""
VRF Failover Command Mapper

Handles command path generation for failover route configuration within VRF instances.
Failover is VyOS 1.5-only. Covers: route destinations with dhcp-interface and next-hop
sub-types, including health-check settings (policy, port, target with interface/vrf,
timeout, type), interface binding, metric, and onlink.

Config tree:
  vrf name <NAME> protocols failover/
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


class VrfFailoverMapper:
    """Mapper for VRF failover route paths. VyOS 1.5+ only."""

    def _base(self, name: str) -> List[str]:
        return ["vrf", "name", name, "protocols", "failover"]

    # ========================================================================
    # Failover Route Paths
    # ========================================================================

    def get_failover_route(self, name: str, destination: str) -> List[str]:
        return self._base(name) + ["route", destination]

    # ========================================================================
    # DHCP-Interface Paths
    # ========================================================================

    def get_failover_route_dhcp_interface(
        self, name: str, destination: str, iface: str
    ) -> List[str]:
        return self._base(name) + ["route", destination, "dhcp-interface", iface]

    # --- DHCP-Interface: check settings ---

    def get_failover_route_dhcp_interface_check_policy(
        self, name: str, destination: str, iface: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "dhcp-interface", iface, "check", "policy", value,
        ]

    def get_failover_route_dhcp_interface_check_port(
        self, name: str, destination: str, iface: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "dhcp-interface", iface, "check", "port", value,
        ]

    def get_failover_route_dhcp_interface_check_target(
        self, name: str, destination: str, iface: str, target: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "dhcp-interface", iface, "check", "target", target,
        ]

    def get_failover_route_dhcp_interface_check_target_interface(
        self, name: str, destination: str, iface: str, target: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "dhcp-interface", iface,
            "check", "target", target, "interface", value,
        ]

    def get_failover_route_dhcp_interface_check_target_vrf(
        self, name: str, destination: str, iface: str, target: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "dhcp-interface", iface,
            "check", "target", target, "vrf", value,
        ]

    def get_failover_route_dhcp_interface_check_timeout(
        self, name: str, destination: str, iface: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "dhcp-interface", iface, "check", "timeout", value,
        ]

    def get_failover_route_dhcp_interface_check_type(
        self, name: str, destination: str, iface: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "dhcp-interface", iface, "check", "type", value,
        ]

    # --- DHCP-Interface: direct settings ---

    def get_failover_route_dhcp_interface_interface(
        self, name: str, destination: str, iface: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "dhcp-interface", iface, "interface", value,
        ]

    def get_failover_route_dhcp_interface_metric(
        self, name: str, destination: str, iface: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "dhcp-interface", iface, "metric", value,
        ]

    def get_failover_route_dhcp_interface_onlink(
        self, name: str, destination: str, iface: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "dhcp-interface", iface, "onlink",
        ]

    # ========================================================================
    # Next-Hop Paths
    # ========================================================================

    def get_failover_route_next_hop(
        self, name: str, destination: str, next_hop: str
    ) -> List[str]:
        return self._base(name) + ["route", destination, "next-hop", next_hop]

    # --- Next-Hop: check settings ---

    def get_failover_route_next_hop_check_policy(
        self, name: str, destination: str, next_hop: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "next-hop", next_hop, "check", "policy", value,
        ]

    def get_failover_route_next_hop_check_port(
        self, name: str, destination: str, next_hop: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "next-hop", next_hop, "check", "port", value,
        ]

    def get_failover_route_next_hop_check_target(
        self, name: str, destination: str, next_hop: str, target: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "next-hop", next_hop, "check", "target", target,
        ]

    def get_failover_route_next_hop_check_target_interface(
        self, name: str, destination: str, next_hop: str, target: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "next-hop", next_hop,
            "check", "target", target, "interface", value,
        ]

    def get_failover_route_next_hop_check_target_vrf(
        self, name: str, destination: str, next_hop: str, target: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "next-hop", next_hop,
            "check", "target", target, "vrf", value,
        ]

    def get_failover_route_next_hop_check_timeout(
        self, name: str, destination: str, next_hop: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "next-hop", next_hop, "check", "timeout", value,
        ]

    def get_failover_route_next_hop_check_type(
        self, name: str, destination: str, next_hop: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "next-hop", next_hop, "check", "type", value,
        ]

    # --- Next-Hop: direct settings ---

    def get_failover_route_next_hop_interface(
        self, name: str, destination: str, next_hop: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "next-hop", next_hop, "interface", value,
        ]

    def get_failover_route_next_hop_metric(
        self, name: str, destination: str, next_hop: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "next-hop", next_hop, "metric", value,
        ]

    def get_failover_route_next_hop_onlink(
        self, name: str, destination: str, next_hop: str
    ) -> List[str]:
        return self._base(name) + [
            "route", destination, "next-hop", next_hop, "onlink",
        ]
