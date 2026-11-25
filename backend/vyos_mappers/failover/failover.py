"""
Failover Routing Command Mapper

One class holds the ``protocols failover`` commands both VyOS versions
have. ``dhcp-interface`` and the ``interface``/``vrf`` children of a check
target exist only on 1.5; those paths live on
``failover_versions.v1_5.FailoverMapperV1_5``.

Config tree (both versions):
  protocols failover/
    route/<DEST>/
      next-hop/<NH>/
        check/{policy, port, target, timeout, type}
        interface
        metric
        onlink

``check target`` is ``multi:`` on 1.4 and a tag node on 1.5. The set and
delete paths of one target are the same on both.
"""

from typing import Any, Dict, FrozenSet, List, Tuple

from ..base import BaseFeatureMapper

# Lab `allowed:` lines, the same on 1.4 and 1.5.
CHECK_POLICIES = ["any-available", "all-available"]
CHECK_TYPES = ["arp", "icmp", "tcp"]


class FailoverMapper(BaseFeatureMapper):
    """Failover paths shared by VyOS 1.4 and 1.5."""

    # Version-only CLI node -> every path method under it (on the subclass).
    _VERSIONED_NODES: Dict[str, Tuple[str, ...]] = {
        "dhcp-interface": (
            "get_dhcp_interface_path",
            "get_dhcp_interface_check_policy",
            "get_dhcp_interface_check_policy_path",
            "get_dhcp_interface_check_port",
            "get_dhcp_interface_check_port_path",
            "get_dhcp_interface_check_target",
            "get_dhcp_interface_check_target_path",
            "get_dhcp_interface_check_target_interface",
            "get_dhcp_interface_check_target_interface_path",
            "get_dhcp_interface_check_target_vrf",
            "get_dhcp_interface_check_target_vrf_path",
            "get_dhcp_interface_check_timeout",
            "get_dhcp_interface_check_timeout_path",
            "get_dhcp_interface_check_type",
            "get_dhcp_interface_check_type_path",
            "get_dhcp_interface_interface",
            "get_dhcp_interface_interface_path",
            "get_dhcp_interface_metric",
            "get_dhcp_interface_metric_path",
            "get_dhcp_interface_onlink",
        ),
        "check target interface": (
            "get_next_hop_check_target_interface",
            "get_next_hop_check_target_interface_path",
            "get_dhcp_interface_check_target_interface",
            "get_dhcp_interface_check_target_interface_path",
        ),
        "check target vrf": (
            "get_next_hop_check_target_vrf",
            "get_next_hop_check_target_vrf_path",
            "get_dhcp_interface_check_target_vrf",
            "get_dhcp_interface_check_target_vrf_path",
        ),
    }

    def _base(self) -> List[str]:
        return ["protocols", "failover"]

    # ========================================================================
    # Version allowlist
    # ========================================================================

    def versioned_nodes(self) -> FrozenSet[str]:
        """Failover nodes only some VyOS versions have.

        A node counts when every path method below it is on this mapper.
        Capabilities and the builder read this set instead of the version
        string.
        """
        return frozenset(
            node
            for node, methods in self._VERSIONED_NODES.items()
            if all(callable(getattr(self, method, None)) for method in methods)
        )

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"failover {node} is not supported on this device")

    # ========================================================================
    # Value lists
    # ========================================================================

    def check_policy_values(self) -> List[str]:
        return list(CHECK_POLICIES)

    def check_type_values(self) -> List[str]:
        return list(CHECK_TYPES)

    # ========================================================================
    # Config read
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_failover_config

        return parse_failover_config(self, full_config)

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
    # Next-Hop Paths
    # ========================================================================

    def get_next_hop_path(self, destination: str, next_hop: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop]

    def get_next_hop_check_policy(self, destination: str, next_hop: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "policy", value]

    def get_next_hop_check_port(self, destination: str, next_hop: str, value: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "port", value]

    def get_next_hop_check_target(self, destination: str, next_hop: str, target: str) -> List[str]:
        """One check target (a multi value on 1.4, a tag node on 1.5)."""
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target", target]

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

    def get_next_hop_check_target_path(self, destination: str, next_hop: str) -> List[str]:
        """Every check target of a next-hop."""
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target"]

    def get_next_hop_check_timeout_path(self, destination: str, next_hop: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "timeout"]

    def get_next_hop_check_type_path(self, destination: str, next_hop: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "type"]

    def get_next_hop_interface_path(self, destination: str, next_hop: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "interface"]

    def get_next_hop_metric_path(self, destination: str, next_hop: str) -> List[str]:
        return self._base() + ["route", destination, "next-hop", next_hop, "metric"]
