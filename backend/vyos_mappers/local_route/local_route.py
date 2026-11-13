"""
Local Route Command Mapper

Handles command path generation for VyOS local route policy configuration.
Version-specific logic is in version-specific files.
"""

from typing import Any, Dict, FrozenSet, List, Optional
from ..base import BaseFeatureMapper


def _parse_leaf(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list) and value:
        return _parse_leaf(value[0])
    if isinstance(value, dict) and value:
        return str(next(iter(value.keys())))
    return None


def _parse_container_leaf(container: Any, key: str) -> Optional[str]:
    if not isinstance(container, dict):
        return None
    return _parse_leaf(container.get(key))


def _parse_address(container: Any) -> Optional[str]:
    """``source``/``destination`` hold ``address`` and ``port``."""
    if isinstance(container, str):
        return container
    return _parse_container_leaf(container, "address")


def _parse_rule(rule_number: str, rule: Any) -> Dict[str, Any]:
    rule = rule if isinstance(rule, dict) else {}
    source = rule.get("source")
    destination = rule.get("destination")
    set_data = rule.get("set") if isinstance(rule.get("set"), dict) else {}
    return {
        "rule_number": int(rule_number),
        "source": _parse_address(source),
        "destination": _parse_address(destination),
        "inbound_interface": _parse_leaf(rule.get("inbound-interface")),
        "fwmark": _parse_leaf(rule.get("fwmark")),
        "protocol": _parse_leaf(rule.get("protocol")),
        "source_port": _parse_container_leaf(source, "port"),
        "destination_port": _parse_container_leaf(destination, "port"),
        "table": _parse_leaf(set_data.get("table")),
        "vrf": _parse_leaf(set_data.get("vrf")),
    }


def _parse_rules(family: Any) -> List[Dict[str, Any]]:
    rules = family.get("rule") if isinstance(family, dict) else None
    if not isinstance(rules, dict):
        return []
    parsed = [_parse_rule(number, rule) for number, rule in rules.items()]
    return sorted(parsed, key=lambda row: row["rule_number"])


class LocalRouteMapper(BaseFeatureMapper):
    """Base mapper with common operations for local route policy"""

    # Rule ``set`` actions that exist on 1.5 and not on 1.4 for both
    # local-route and local-route6 (validateTmplPath on both). Version
    # subclasses narrow this set.
    _RULE_SET_VERSIONED = ("vrf",)

    def versioned_rule_set_actions(self) -> FrozenSet[str]:
        """Version-dependent rule ``set`` actions this device has."""
        return frozenset(self._RULE_SET_VERSIONED)

    def _require_rule_set(self, action: str) -> None:
        if action not in self.versioned_rule_set_actions():
            raise ValueError(f"local-route rule set {action} is not supported on this device")

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """Normalise full VyOS config into the GET /vyos/local-route/config payload."""
        policy = full_config.get("policy") if isinstance(full_config, dict) else None
        policy = policy if isinstance(policy, dict) else {}
        ipv4_rules = _parse_rules(policy.get("local-route"))
        ipv6_rules = _parse_rules(policy.get("local-route6"))
        return {
            "ipv4_rules": ipv4_rules,
            "ipv6_rules": ipv6_rules,
            "total_ipv4": len(ipv4_rules),
            "total_ipv6": len(ipv6_rules),
        }

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

    def get_local_route_rule_set_vrf(
        self, rule_number: int, vrf: str
    ) -> List[str]:
        """Get command path for IPv4 rule VRF."""
        self._require_rule_set("vrf")
        return ["policy", "local-route", "rule", str(rule_number), "set", "vrf", vrf]

    def get_local_route_rule_set_vrf_path(self, rule_number: int) -> List[str]:
        """Get command path for IPv4 rule VRF (for deletion)."""
        self._require_rule_set("vrf")
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

    def get_local_route6_rule_set_vrf(
        self, rule_number: int, vrf: str
    ) -> List[str]:
        """Get command path for IPv6 rule VRF."""
        self._require_rule_set("vrf")
        return ["policy", "local-route6", "rule", str(rule_number), "set", "vrf", vrf]

    def get_local_route6_rule_set_vrf_path(self, rule_number: int) -> List[str]:
        """Get command path for IPv6 rule VRF (for deletion)."""
        self._require_rule_set("vrf")
        return ["policy", "local-route6", "rule", str(rule_number), "set", "vrf"]
