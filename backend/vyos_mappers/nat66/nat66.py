"""NAT66 mapper - base path definitions for nat66 commands.

Common command tree (VyOS 1.4 and 1.5):
  nat66 source rule <num>
    description <text>
    destination port <port>
    destination prefix <ipv6net>
    disable
    exclude
    log
    outbound-interface name <iface>
    protocol <proto>
    source port <port>
    source prefix <ipv6net>
    translation address <ipv6|ipv6net|masquerade>
    translation port <port>

  nat66 destination rule <num>
    description <text>
    destination address <ipv6>
    destination port <port>
    disable
    exclude
    inbound-interface name <iface>
    log
    protocol <proto>
    source address <ipv6>
    source port <port>
    translation address <ipv6>
    translation port <port>

The ``source group`` and ``destination group`` subtrees on both rule types
exist only on 1.5; their paths live on the 1.5 subclass.
"""
from typing import Any, Dict, FrozenSet, List

from ..base import BaseFeatureMapper


class NAT66Mapper(BaseFeatureMapper):
    """Shared nat66 source and destination rule commands (VyOS 1.4 and 1.5)."""

    # node -> path method that only the version subclass defines
    _VERSIONED_NODES = {
        "source_rule_source_group": "get_source_rule_source_group",
        "source_rule_destination_group": "get_source_rule_destination_group",
        "destination_rule_source_group": "get_destination_rule_source_group",
        "destination_rule_destination_group": "get_destination_rule_destination_group",
    }

    def versioned_nodes(self) -> FrozenSet[str]:
        """Version-only subtrees this device has.

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
            raise ValueError(f"nat66 {node.replace('_', ' ')} is not supported on this device")

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_nat66_config

        return parse_nat66_config(self, full_config)

    # ==================== Allowed values (lab ``allowed:`` lists) ====================

    def protocols(self) -> List[str]:
        """``protocol`` completion on both labs: ``all tcp_udp`` plus list_protocols.sh."""
        return [
            "all", "tcp_udp",
            "ip", "hopopt", "icmp", "igmp", "ggp", "ipencap", "st", "tcp", "egp", "igp",
            "pup", "udp", "hmp", "xns-idp", "rdp", "iso-tp4", "dccp", "xtp", "ddp",
            "idpr-cmtp", "ipv6", "ipv6-route", "ipv6-frag", "idrp", "rsvp", "gre", "esp",
            "ah", "skip", "ipv6-icmp", "ipv6-nonxt", "ipv6-opts", "rspf", "vmtp", "eigrp",
            "ospf", "ax.25", "ipip", "etherip", "encap", "pim", "ipcomp", "vrrp", "l2tp",
            "isis", "sctp", "fc", "mobility-header", "udplite", "mpls-in-ip", "manet",
            "hip", "shim6", "wesp", "rohc", "ethernet", "mptcp",
        ]

    def group_types(self) -> List[str]:
        """Children of a rule's ``source group`` / ``destination group`` (none on 1.4)."""
        return []

    def group_keys(self) -> Dict[str, str]:
        """Parse key of each group match -> its CLI child under ``<side> group``."""
        from .config_parse import GROUP_KEYS

        return dict(GROUP_KEYS)

    # ==================== Source Rule paths ====================

    def get_source_rule(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number)]

    def get_source_rule_path(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number)]

    def get_source_rule_description(self, rule_number: int, description: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "description", description]

    def get_source_rule_description_path(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "description"]

    def get_source_rule_disable(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "disable"]

    def get_source_rule_disable_path(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "disable"]

    def get_source_rule_exclude(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "exclude"]

    def get_source_rule_exclude_path(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "exclude"]

    def get_source_rule_log(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "log"]

    def get_source_rule_log_path(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "log"]

    def get_source_rule_protocol(self, rule_number: int, protocol: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "protocol", protocol]

    def get_source_rule_protocol_path(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "protocol"]

    def get_source_rule_outbound_interface_name(self, rule_number: int, name: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "outbound-interface", "name", name]

    def get_source_rule_outbound_interface_path(self, rule_number: int) -> List[str]:
        # `name` is the only child; deleting it alone leaves an empty node 1.4 cannot render
        return ["nat66", "source", "rule", str(rule_number), "outbound-interface"]

    # Source rule - source
    def get_source_rule_source_prefix(self, rule_number: int, prefix: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "source", "prefix", prefix]

    def get_source_rule_source_prefix_path(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "source", "prefix"]

    def get_source_rule_source_port(self, rule_number: int, port: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "source", "port", port]

    def get_source_rule_source_port_path(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "source", "port"]

    # Source rule - destination
    def get_source_rule_destination_prefix(self, rule_number: int, prefix: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "destination", "prefix", prefix]

    def get_source_rule_destination_prefix_path(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "destination", "prefix"]

    def get_source_rule_destination_port(self, rule_number: int, port: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "destination", "port", port]

    def get_source_rule_destination_port_path(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "destination", "port"]

    # Source rule - translation
    def get_source_rule_translation_address(self, rule_number: int, address: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "translation", "address", address]

    def get_source_rule_translation_address_path(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "translation", "address"]

    def get_source_rule_translation_port(self, rule_number: int, port: str) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "translation", "port", port]

    def get_source_rule_translation_port_path(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "translation", "port"]

    # ==================== Destination Rule paths ====================

    def get_destination_rule(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number)]

    def get_destination_rule_path(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number)]

    def get_destination_rule_description(self, rule_number: int, description: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "description", description]

    def get_destination_rule_description_path(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "description"]

    def get_destination_rule_disable(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "disable"]

    def get_destination_rule_disable_path(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "disable"]

    def get_destination_rule_exclude(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "exclude"]

    def get_destination_rule_exclude_path(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "exclude"]

    def get_destination_rule_log(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "log"]

    def get_destination_rule_log_path(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "log"]

    def get_destination_rule_protocol(self, rule_number: int, protocol: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "protocol", protocol]

    def get_destination_rule_protocol_path(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "protocol"]

    def get_destination_rule_inbound_interface_name(self, rule_number: int, name: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "inbound-interface", "name", name]

    def get_destination_rule_inbound_interface_path(self, rule_number: int) -> List[str]:
        # `name` is the only child; deleting it alone leaves an empty node 1.4 cannot render
        return ["nat66", "destination", "rule", str(rule_number), "inbound-interface"]

    # Destination rule - source
    def get_destination_rule_source_address(self, rule_number: int, address: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "source", "address", address]

    def get_destination_rule_source_address_path(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "source", "address"]

    def get_destination_rule_source_port(self, rule_number: int, port: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "source", "port", port]

    def get_destination_rule_source_port_path(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "source", "port"]

    # Destination rule - destination
    def get_destination_rule_destination_address(self, rule_number: int, address: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "destination", "address", address]

    def get_destination_rule_destination_address_path(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "destination", "address"]

    def get_destination_rule_destination_port(self, rule_number: int, port: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "destination", "port", port]

    def get_destination_rule_destination_port_path(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "destination", "port"]

    # Destination rule - translation
    def get_destination_rule_translation_address(self, rule_number: int, address: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "translation", "address", address]

    def get_destination_rule_translation_address_path(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "translation", "address"]

    def get_destination_rule_translation_port(self, rule_number: int, port: str) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "translation", "port", port]

    def get_destination_rule_translation_port_path(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "translation", "port"]
