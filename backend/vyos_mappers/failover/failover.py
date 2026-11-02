"""
Failover Routing Command Mapper

Handles command path generation for protocols failover configuration.
Common paths shared between VyOS 1.4 and 1.5.
Version-specific logic is in failover_versions/.

Config tree (common):
  protocols failover/
    route/<DEST>/
      next-hop/<NH>/
        check/{policy, port, timeout, type}
        interface
        metric
        onlink

Version differences:
  1.4: check/target is a multi-value node (flat list of IPs)
  1.5: check/target is a tag node with interface/vrf sub-properties
  1.5: adds dhcp-interface/<IFACE>/ with same check structure as next-hop
"""

from typing import List
from ..base import BaseFeatureMapper


class FailoverMapper(BaseFeatureMapper):
    """Base mapper with common operations shared between VyOS 1.4 and 1.5."""

    def __init__(self, version: str):
        super().__init__(version)

    def _base(self) -> List[str]:
        return ["protocols", "failover"]

    # ========================================================================
    # Route Paths
    # ========================================================================

    def get_failover_path(self) -> List[str]:
        """Get base failover path."""
        return self._base()

    def get_route_path(self, destination: str) -> List[str]:
        """Get path for a failover route destination."""
        return self._base() + ["route", destination]

    # ========================================================================
    # Next-Hop Paths (common to both 1.4 and 1.5)
    # ========================================================================

    def get_next_hop_path(self, destination: str, next_hop: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop]

    def get_next_hop_check_policy(self, destination: str, next_hop: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "policy", value]

    def get_next_hop_check_port(self, destination: str, next_hop: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "port", value]

    def get_next_hop_check_timeout(self, destination: str, next_hop: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "timeout", value]

    def get_next_hop_check_type(self, destination: str, next_hop: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "type", value]

    def get_next_hop_interface(self, destination: str, next_hop: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "interface", value]

    def get_next_hop_metric(self, destination: str, next_hop: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "metric", value]

    def get_next_hop_onlink(self, destination: str, next_hop: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "onlink"]

    # ========================================================================
    # Delete helper paths (no value leaf)
    # ========================================================================

    def get_next_hop_check_policy_path(self, destination: str, next_hop: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "policy"]

    def get_next_hop_check_port_path(self, destination: str, next_hop: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "port"]

    def get_next_hop_check_timeout_path(self, destination: str, next_hop: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "timeout"]

    def get_next_hop_check_type_path(self, destination: str, next_hop: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "type"]

    def get_next_hop_interface_path(self, destination: str, next_hop: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "interface"]

    def get_next_hop_metric_path(self, destination: str, next_hop: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "metric"]
