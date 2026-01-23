"""
Local Route Command Mapper

Handles command path generation for VyOS local route policy configuration.
Version-specific logic is in version-specific files.
"""

from typing import List
from ..base import BaseFeatureMapper


class LocalRouteMapper(BaseFeatureMapper):
    """Base mapper with common operations for local route policy"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

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
        """Get command path for IPv4 rule source (for deletion)."""
        return ["policy", "local-route", "rule", str(rule_number), "source"]

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
        """Get command path for IPv4 rule destination (for deletion)."""
        return ["policy", "local-route", "rule", str(rule_number), "destination"]

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

    def get_local_route_rule_set_table(
        self, rule_number: int, table: str
    ) -> List[str]:
        """Get command path for IPv4 rule routing table."""
        return ["policy", "local-route", "rule", str(rule_number), "set", "table", table]

    def get_local_route_rule_set_table_path(self, rule_number: int) -> List[str]:
        """Get command path for IPv4 rule table (for deletion)."""
        return ["policy", "local-route", "rule", str(rule_number), "set", "table"]

    def get_local_route_rule_set_vrf(
        self, rule_number: int, vrf: str
    ) -> List[str]:
        """Get command path for IPv4 rule VRF (VyOS 1.5+)."""
        return ["policy", "local-route", "rule", str(rule_number), "set", "vrf", vrf]

    def get_local_route_rule_set_vrf_path(self, rule_number: int) -> List[str]:
        """Get command path for IPv4 rule VRF (for deletion)."""
        return ["policy", "local-route", "rule", str(rule_number), "set", "vrf"]

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
        """Get command path for IPv6 rule source (for deletion)."""
        return ["policy", "local-route6", "rule", str(rule_number), "source"]

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
        """Get command path for IPv6 rule destination (for deletion)."""
        return ["policy", "local-route6", "rule", str(rule_number), "destination"]

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

    def get_local_route6_rule_set_vrf(
        self, rule_number: int, vrf: str
    ) -> List[str]:
        """Get command path for IPv6 rule VRF (VyOS 1.5+)."""
        return ["policy", "local-route6", "rule", str(rule_number), "set", "vrf", vrf]

    def get_local_route6_rule_set_vrf_path(self, rule_number: int) -> List[str]:
        """Get command path for IPv6 rule VRF (for deletion)."""
        return ["policy", "local-route6", "rule", str(rule_number), "set", "vrf"]
