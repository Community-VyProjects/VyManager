"""
Local Route Command Mapper

Handles command path generation for VyOS local route policy configuration.
``set vrf`` under a local-route or local-route6 rule exists only on 1.5; its
path methods live on the 1.5 subclass. ``_VERSIONED_NODES`` maps that node to
the subclass path method that defines it; ``versioned_nodes()`` is the set the
device has.
"""

from typing import Any, Dict, FrozenSet, List
from ..base import BaseFeatureMapper

# Version-only rule node (key of LocalRouteMapper._VERSIONED_NODES).
SET_VRF = "set vrf"


class LocalRouteMapper(BaseFeatureMapper):
    """Local route policy commands both VyOS versions have."""

    _VERSIONED_NODES: Dict[str, str] = {
        SET_VRF: "get_local_route_rule_set_vrf",
    }

    def versioned_nodes(self) -> FrozenSet[str]:
        """Version-only rule nodes this device has.

        Each one is a path method on the version subclass. Capabilities and
        the builder read this set instead of the version string.
        """
        return frozenset(
            node
            for node, method in self._VERSIONED_NODES.items()
            if callable(getattr(self, method, None))
        )

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(
                f"policy local-route/local-route6 rule {node} is not supported on this device"
            )

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_local_route_config

        return parse_local_route_config(self, full_config)

    # ========================================================================
    # IPv4 Local Route - Rule Paths
    # ========================================================================

    def get_local_route_rule(self, rule_number: int) -> List[str]:
        """Get command path for creating IPv4 local route rule."""
        return ["policy", "local-route", "rule", str(rule_number)]

    def get_local_route_rule_path(self, rule_number: int) -> List[str]:
        """Get command path for IPv4 rule (for deletion)."""
        return ["policy", "local-route", "rule", str(rule_number)]

    # ========================================================================
    # IPv4 Local Route - Rule Properties
    # ========================================================================

    def get_local_route_rule_source(
        self, rule_number: int, source: str
    ) -> List[str]:
        """Get command path for IPv4 rule source address/prefix."""
        return ["policy", "local-route", "rule", str(rule_number), "source", "address", source]

    def get_local_route_rule_source_path(self, rule_number: int) -> List[str]:
        """Delete source address only so source port is kept."""
        return ["policy", "local-route", "rule", str(rule_number), "source", "address"]

    def get_local_route_rule_destination(
        self, rule_number: int, destination: str
    ) -> List[str]:
        """Get command path for IPv4 rule destination address/prefix."""
        return [
            "policy",
            "local-route",
            "rule",
            str(rule_number),
            "destination",
            "address",
            destination,
        ]

    def get_local_route_rule_destination_path(self, rule_number: int) -> List[str]:
        """Delete destination address only so destination port is kept."""
        return [
            "policy",
            "local-route",
            "rule",
            str(rule_number),
            "destination",
            "address",
        ]

    def get_local_route_rule_inbound_interface(
        self, rule_number: int, interface: str
    ) -> List[str]:
        """Get command path for IPv4 rule inbound interface."""
        return [
            "policy",
            "local-route",
            "rule",
            str(rule_number),
            "inbound-interface",
            interface,
        ]

    def get_local_route_rule_inbound_interface_path(
        self, rule_number: int
    ) -> List[str]:
        """Get command path for IPv4 rule inbound interface (for deletion)."""
        return ["policy", "local-route", "rule", str(rule_number), "inbound-interface"]

    def get_local_route_rule_fwmark(self, rule_number: int, fwmark: str) -> List[str]:
        return ["policy", "local-route", "rule", str(rule_number), "fwmark", fwmark]

    def get_local_route_rule_fwmark_path(self, rule_number: int) -> List[str]:
        return ["policy", "local-route", "rule", str(rule_number), "fwmark"]

    def get_local_route_rule_protocol(self, rule_number: int, protocol: str) -> List[str]:
        return ["policy", "local-route", "rule", str(rule_number), "protocol", protocol]

    def get_local_route_rule_protocol_path(self, rule_number: int) -> List[str]:
        return ["policy", "local-route", "rule", str(rule_number), "protocol"]

    def get_local_route_rule_source_port(self, rule_number: int, port: str) -> List[str]:
        return ["policy", "local-route", "rule", str(rule_number), "source", "port", port]

    def get_local_route_rule_source_port_path(self, rule_number: int) -> List[str]:
        return ["policy", "local-route", "rule", str(rule_number), "source", "port"]

    def get_local_route_rule_destination_port(
        self, rule_number: int, port: str
    ) -> List[str]:
        return [
            "policy",
            "local-route",
            "rule",
            str(rule_number),
            "destination",
            "port",
            port,
        ]

    def get_local_route_rule_destination_port_path(self, rule_number: int) -> List[str]:
        return ["policy", "local-route", "rule", str(rule_number), "destination", "port"]

    def get_local_route_rule_set_table(
        self, rule_number: int, table: str
    ) -> List[str]:
        """Get command path for IPv4 rule routing table."""
        return ["policy", "local-route", "rule", str(rule_number), "set", "table", table]

    def get_local_route_rule_set_table_path(self, rule_number: int) -> List[str]:
        """Get command path for IPv4 rule table (for deletion)."""
        return ["policy", "local-route", "rule", str(rule_number), "set", "table"]

    # ========================================================================
    # IPv6 Local Route - Rule Paths
    # ========================================================================

    def get_local_route6_rule(self, rule_number: int) -> List[str]:
        """Get command path for creating IPv6 local route rule."""
        return ["policy", "local-route6", "rule", str(rule_number)]

    def get_local_route6_rule_path(self, rule_number: int) -> List[str]:
        """Get command path for IPv6 rule (for deletion)."""
        return ["policy", "local-route6", "rule", str(rule_number)]

    # ========================================================================
    # IPv6 Local Route - Rule Properties
    # ========================================================================

    def get_local_route6_rule_source(
        self, rule_number: int, source: str
    ) -> List[str]:
        """Get command path for IPv6 rule source address/prefix."""
        return ["policy", "local-route6", "rule", str(rule_number), "source", "address", source]

    def get_local_route6_rule_source_path(self, rule_number: int) -> List[str]:
        """Delete source address only so source port is kept."""
        return ["policy", "local-route6", "rule", str(rule_number), "source", "address"]

    def get_local_route6_rule_destination(
        self, rule_number: int, destination: str
    ) -> List[str]:
        """Get command path for IPv6 rule destination address/prefix."""
        return [
            "policy",
            "local-route6",
            "rule",
            str(rule_number),
            "destination",
            "address",
            destination,
        ]

    def get_local_route6_rule_destination_path(self, rule_number: int) -> List[str]:
        """Delete destination address only so destination port is kept."""
        return [
            "policy",
            "local-route6",
            "rule",
            str(rule_number),
            "destination",
            "address",
        ]

    def get_local_route6_rule_inbound_interface(
        self, rule_number: int, interface: str
    ) -> List[str]:
        """Get command path for IPv6 rule inbound interface."""
        return [
            "policy",
            "local-route6",
            "rule",
            str(rule_number),
            "inbound-interface",
            interface,
        ]

    def get_local_route6_rule_inbound_interface_path(
        self, rule_number: int
    ) -> List[str]:
        """Get command path for IPv6 rule inbound interface (for deletion)."""
        return ["policy", "local-route6", "rule", str(rule_number), "inbound-interface"]

    def get_local_route6_rule_fwmark(self, rule_number: int, fwmark: str) -> List[str]:
        return ["policy", "local-route6", "rule", str(rule_number), "fwmark", fwmark]

    def get_local_route6_rule_fwmark_path(self, rule_number: int) -> List[str]:
        return ["policy", "local-route6", "rule", str(rule_number), "fwmark"]

    def get_local_route6_rule_protocol(
        self, rule_number: int, protocol: str
    ) -> List[str]:
        return ["policy", "local-route6", "rule", str(rule_number), "protocol", protocol]

    def get_local_route6_rule_protocol_path(self, rule_number: int) -> List[str]:
        return ["policy", "local-route6", "rule", str(rule_number), "protocol"]

    def get_local_route6_rule_source_port(
        self, rule_number: int, port: str
    ) -> List[str]:
        return ["policy", "local-route6", "rule", str(rule_number), "source", "port", port]

    def get_local_route6_rule_source_port_path(self, rule_number: int) -> List[str]:
        return ["policy", "local-route6", "rule", str(rule_number), "source", "port"]

    def get_local_route6_rule_destination_port(
        self, rule_number: int, port: str
    ) -> List[str]:
        return [
            "policy",
            "local-route6",
            "rule",
            str(rule_number),
            "destination",
            "port",
            port,
        ]

    def get_local_route6_rule_destination_port_path(self, rule_number: int) -> List[str]:
        return ["policy", "local-route6", "rule", str(rule_number), "destination", "port"]

    def get_local_route6_rule_set_table(
        self, rule_number: int, table: str
    ) -> List[str]:
        """Get command path for IPv6 rule routing table."""
        return [
            "policy",
            "local-route6",
            "rule",
            str(rule_number),
            "set",
            "table",
            table,
        ]

    def get_local_route6_rule_set_table_path(self, rule_number: int) -> List[str]:
        """Get command path for IPv6 rule table (for deletion)."""
        return ["policy", "local-route6", "rule", str(rule_number), "set", "table"]
