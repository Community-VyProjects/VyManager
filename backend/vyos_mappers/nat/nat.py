"""Base NAT mapper for all VyOS versions."""
from typing import List
from ..base import BaseFeatureMapper


class NATMapper(BaseFeatureMapper):
    """Base mapper for NAT configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)

    # ==================== Source NAT Commands ====================

    def get_source_rule(self, rule_number: int) -> List[str]:
        """Get command path for source NAT rule."""
        return ["nat", "source", "rule", str(rule_number)]

    def get_source_rule_packet_type(self, rule_number: int, packet_type: str) -> List[str]:
        """Get command path for source rule packet-type."""
        return ["nat", "source", "rule", str(rule_number), "packet-type", packet_type]

    def get_source_rule_packet_type_path(self, rule_number: int) -> List[str]:
        """Get command path for source rule packet-type (for deletion)."""
        return ["nat", "source", "rule", str(rule_number), "packet-type"]

    def get_source_rule_description(self, rule_number: int, description: str) -> List[str]:
        """Get command path for source rule description."""
        return ["nat", "source", "rule", str(rule_number), "description", description]

    def get_source_rule_description_path(self, rule_number: int) -> List[str]:
        """Get command path for source rule description (for deletion)."""
        return ["nat", "source", "rule", str(rule_number), "description"]

    def get_source_rule_destination_address(self, rule_number: int, address: str) -> List[str]:
        """Get command path for source rule destination address."""
        return ["nat", "source", "rule", str(rule_number), "destination", "address", address]

    def get_source_rule_destination_address_path(self, rule_number: int) -> List[str]:
        """Get command path for source rule destination address (for deletion)."""
        return ["nat", "source", "rule", str(rule_number), "destination", "address"]

    def get_source_rule_destination_group(self, rule_number: int, group_type: str, group_name: str) -> List[str]:
        """Get command path for source rule destination group."""
        return ["nat", "source", "rule", str(rule_number), "destination", "group", group_type, group_name]

    def get_source_rule_destination_group_path(self, rule_number: int, group_type: str) -> List[str]:
        """Get command path for source rule destination group (for deletion)."""
        return ["nat", "source", "rule", str(rule_number), "destination", "group", group_type]

    def get_source_rule_destination_port(self, rule_number: int, port: str) -> List[str]:
        """Get command path for source rule destination port."""
        return ["nat", "source", "rule", str(rule_number), "destination", "port", port]

    def get_source_rule_destination_port_path(self, rule_number: int) -> List[str]:
        """Get command path for source rule destination port (for deletion)."""
        return ["nat", "source", "rule", str(rule_number), "destination", "port"]

    def get_source_rule_disable(self, rule_number: int) -> List[str]:
        """Get command path for source rule disable."""
        return ["nat", "source", "rule", str(rule_number), "disable"]

    def get_source_rule_exclude(self, rule_number: int) -> List[str]:
        """Get command path for source rule exclude."""
        return ["nat", "source", "rule", str(rule_number), "exclude"]

    def get_source_rule_load_balance_hash(self, rule_number: int, hash_type: str) -> List[str]:
        """Get command path for source rule load-balance hash."""
        return ["nat", "source", "rule", str(rule_number), "load-balance", "hash", hash_type]

    def get_source_rule_load_balance_hash_path(self, rule_number: int) -> List[str]:
        """Get command path for source rule load-balance hash (for deletion)."""
        return ["nat", "source", "rule", str(rule_number), "load-balance", "hash"]

    def get_source_rule_load_balance_backend(self, rule_number: int, backend: str) -> List[str]:
        """Get command path for source rule load-balance backend."""
        return ["nat", "source", "rule", str(rule_number), "load-balance", "backend", backend]

    def get_source_rule_load_balance_backend_path(self, rule_number: int, backend: str) -> List[str]:
        """Get command path for source rule load-balance backend (for deletion)."""
        return ["nat", "source", "rule", str(rule_number), "load-balance", "backend", backend]

    def get_source_rule_log(self, rule_number: int) -> List[str]:
        """Get command path for source rule log."""
        return ["nat", "source", "rule", str(rule_number), "log"]

    def get_source_rule_outbound_interface_name(self, rule_number: int, interface: str) -> List[str]:
        """Get command path for source rule outbound-interface name."""
        return ["nat", "source", "rule", str(rule_number), "outbound-interface", "name", interface]

    def get_source_rule_outbound_interface_name_path(self, rule_number: int) -> List[str]:
        """Get command path for source rule outbound-interface name (for deletion)."""
        return ["nat", "source", "rule", str(rule_number), "outbound-interface", "name"]

    def get_source_rule_outbound_interface_group(self, rule_number: int, group: str) -> List[str]:
        """Get command path for source rule outbound-interface group."""
        return ["nat", "source", "rule", str(rule_number), "outbound-interface", "group", group]

    def get_source_rule_outbound_interface_group_path(self, rule_number: int) -> List[str]:
        """Get command path for source rule outbound-interface group (for deletion)."""
        return ["nat", "source", "rule", str(rule_number), "outbound-interface", "group"]

    def get_source_rule_protocol(self, rule_number: int, protocol: str) -> List[str]:
        """Get command path for source rule protocol."""
        return ["nat", "source", "rule", str(rule_number), "protocol", protocol]

    def get_source_rule_protocol_path(self, rule_number: int) -> List[str]:
        """Get command path for source rule protocol (for deletion)."""
        return ["nat", "source", "rule", str(rule_number), "protocol"]

    def get_source_rule_source_address(self, rule_number: int, address: str) -> List[str]:
        """Get command path for source rule source address."""
        return ["nat", "source", "rule", str(rule_number), "source", "address", address]

    def get_source_rule_source_address_path(self, rule_number: int) -> List[str]:
        """Get command path for source rule source address (for deletion)."""
        return ["nat", "source", "rule", str(rule_number), "source", "address"]

    def get_source_rule_source_group(self, rule_number: int, group_type: str, group_name: str) -> List[str]:
        """Get command path for source rule source group."""
        return ["nat", "source", "rule", str(rule_number), "source", "group", group_type, group_name]

    def get_source_rule_source_group_path(self, rule_number: int, group_type: str) -> List[str]:
        """Get command path for source rule source group (for deletion)."""
        return ["nat", "source", "rule", str(rule_number), "source", "group", group_type]

    def get_source_rule_source_port(self, rule_number: int, port: str) -> List[str]:
        """Get command path for source rule source port."""
        return ["nat", "source", "rule", str(rule_number), "source", "port", port]

    def get_source_rule_source_port_path(self, rule_number: int) -> List[str]:
        """Get command path for source rule source port (for deletion)."""
        return ["nat", "source", "rule", str(rule_number), "source", "port"]

    def get_source_rule_translation_address(self, rule_number: int, address: str) -> List[str]:
        """Get command path for source rule translation address."""
        return ["nat", "source", "rule", str(rule_number), "translation", "address", address]

    def get_source_rule_translation_address_path(self, rule_number: int) -> List[str]:
        """Get command path for source rule translation address (for deletion)."""
        return ["nat", "source", "rule", str(rule_number), "translation", "address"]

    # ==================== Destination NAT Commands ====================

    def get_destination_rule(self, rule_number: int) -> List[str]:
        """Get command path for destination NAT rule."""
        return ["nat", "destination", "rule", str(rule_number)]

    def get_destination_rule_packet_type(self, rule_number: int, packet_type: str) -> List[str]:
        """Get command path for destination rule packet-type."""
        return ["nat", "destination", "rule", str(rule_number), "packet-type", packet_type]

    def get_destination_rule_packet_type_path(self, rule_number: int) -> List[str]:
        """Get command path for destination rule packet-type (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "packet-type"]

    def get_destination_rule_description(self, rule_number: int, description: str) -> List[str]:
        """Get command path for destination rule description."""
        return ["nat", "destination", "rule", str(rule_number), "description", description]

    def get_destination_rule_description_path(self, rule_number: int) -> List[str]:
        """Get command path for destination rule description (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "description"]

    def get_destination_rule_destination_address(self, rule_number: int, address: str) -> List[str]:
        """Get command path for destination rule destination address."""
        return ["nat", "destination", "rule", str(rule_number), "destination", "address", address]

    def get_destination_rule_destination_address_path(self, rule_number: int) -> List[str]:
        """Get command path for destination rule destination address (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "destination", "address"]

    def get_destination_rule_destination_group(self, rule_number: int, group_type: str, group_name: str) -> List[str]:
        """Get command path for destination rule destination group."""
        return ["nat", "destination", "rule", str(rule_number), "destination", "group", group_type, group_name]

    def get_destination_rule_destination_group_path(self, rule_number: int, group_type: str) -> List[str]:
        """Get command path for destination rule destination group (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "destination", "group", group_type]

    def get_destination_rule_destination_port(self, rule_number: int, port: str) -> List[str]:
        """Get command path for destination rule destination port."""
        return ["nat", "destination", "rule", str(rule_number), "destination", "port", port]

    def get_destination_rule_destination_port_path(self, rule_number: int) -> List[str]:
        """Get command path for destination rule destination port (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "destination", "port"]

    def get_destination_rule_disable(self, rule_number: int) -> List[str]:
        """Get command path for destination rule disable."""
        return ["nat", "destination", "rule", str(rule_number), "disable"]

    def get_destination_rule_exclude(self, rule_number: int) -> List[str]:
        """Get command path for destination rule exclude."""
        return ["nat", "destination", "rule", str(rule_number), "exclude"]

    def get_destination_rule_load_balance_hash(self, rule_number: int, hash_type: str) -> List[str]:
        """Get command path for destination rule load-balance hash."""
        return ["nat", "destination", "rule", str(rule_number), "load-balance", "hash", hash_type]

    def get_destination_rule_load_balance_hash_path(self, rule_number: int) -> List[str]:
        """Get command path for destination rule load-balance hash (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "load-balance", "hash"]

    def get_destination_rule_load_balance_backend(self, rule_number: int, backend: str) -> List[str]:
        """Get command path for destination rule load-balance backend."""
        return ["nat", "destination", "rule", str(rule_number), "load-balance", "backend", backend]

    def get_destination_rule_load_balance_backend_path(self, rule_number: int, backend: str) -> List[str]:
        """Get command path for destination rule load-balance backend (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "load-balance", "backend", backend]

    def get_destination_rule_log(self, rule_number: int) -> List[str]:
        """Get command path for destination rule log."""
        return ["nat", "destination", "rule", str(rule_number), "log"]

    def get_destination_rule_inbound_interface_name(self, rule_number: int, interface: str) -> List[str]:
        """Get command path for destination rule inbound-interface name."""
        return ["nat", "destination", "rule", str(rule_number), "inbound-interface", "name", interface]

    def get_destination_rule_inbound_interface_name_path(self, rule_number: int) -> List[str]:
        """Get command path for destination rule inbound-interface name (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "inbound-interface", "name"]

    def get_destination_rule_inbound_interface_group(self, rule_number: int, group: str) -> List[str]:
        """Get command path for destination rule inbound-interface group."""
        return ["nat", "destination", "rule", str(rule_number), "inbound-interface", "group", group]

    def get_destination_rule_inbound_interface_group_path(self, rule_number: int) -> List[str]:
        """Get command path for destination rule inbound-interface group (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "inbound-interface", "group"]

    def get_destination_rule_protocol(self, rule_number: int, protocol: str) -> List[str]:
        """Get command path for destination rule protocol."""
        return ["nat", "destination", "rule", str(rule_number), "protocol", protocol]

    def get_destination_rule_protocol_path(self, rule_number: int) -> List[str]:
        """Get command path for destination rule protocol (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "protocol"]

    def get_destination_rule_source_address(self, rule_number: int, address: str) -> List[str]:
        """Get command path for destination rule source address."""
        return ["nat", "destination", "rule", str(rule_number), "source", "address", address]

    def get_destination_rule_source_address_path(self, rule_number: int) -> List[str]:
        """Get command path for destination rule source address (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "source", "address"]

    def get_destination_rule_source_group(self, rule_number: int, group_type: str, group_name: str) -> List[str]:
        """Get command path for destination rule source group."""
        return ["nat", "destination", "rule", str(rule_number), "source", "group", group_type, group_name]

    def get_destination_rule_source_group_path(self, rule_number: int, group_type: str) -> List[str]:
        """Get command path for destination rule source group (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "source", "group", group_type]

    def get_destination_rule_source_port(self, rule_number: int, port: str) -> List[str]:
        """Get command path for destination rule source port."""
        return ["nat", "destination", "rule", str(rule_number), "source", "port", port]

    def get_destination_rule_source_port_path(self, rule_number: int) -> List[str]:
        """Get command path for destination rule source port (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "source", "port"]

    def get_destination_rule_translation_address(self, rule_number: int, address: str) -> List[str]:
        """Get command path for destination rule translation address."""
        return ["nat", "destination", "rule", str(rule_number), "translation", "address", address]

    def get_destination_rule_translation_address_path(self, rule_number: int) -> List[str]:
        """Get command path for destination rule translation address (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "translation", "address"]

    def get_destination_rule_translation_port(self, rule_number: int, port: str) -> List[str]:
        """Get command path for destination rule translation port."""
        return ["nat", "destination", "rule", str(rule_number), "translation", "port", port]

    def get_destination_rule_translation_port_path(self, rule_number: int) -> List[str]:
        """Get command path for destination rule translation port (for deletion)."""
        return ["nat", "destination", "rule", str(rule_number), "translation", "port"]

    # ==================== Static NAT Commands ====================

    def get_static_rule(self, rule_number: int) -> List[str]:
        """Get command path for static NAT rule."""
        return ["nat", "static", "rule", str(rule_number)]

    def get_static_rule_description(self, rule_number: int, description: str) -> List[str]:
        """Get command path for static rule description."""
        return ["nat", "static", "rule", str(rule_number), "description", description]

    def get_static_rule_description_path(self, rule_number: int) -> List[str]:
        """Get command path for static rule description (for deletion)."""
        return ["nat", "static", "rule", str(rule_number), "description"]

    def get_static_rule_destination_address(self, rule_number: int, address: str) -> List[str]:
        """Get command path for static rule destination address."""
        return ["nat", "static", "rule", str(rule_number), "destination", "address", address]

    def get_static_rule_destination_address_path(self, rule_number: int) -> List[str]:
        """Get command path for static rule destination address (for deletion)."""
        return ["nat", "static", "rule", str(rule_number), "destination", "address"]

    def get_static_rule_inbound_interface(self, rule_number: int, interface: str) -> List[str]:
        """Get command path for static rule inbound-interface."""
        return ["nat", "static", "rule", str(rule_number), "inbound-interface", interface]

    def get_static_rule_inbound_interface_path(self, rule_number: int) -> List[str]:
        """Get command path for static rule inbound-interface (for deletion)."""
        return ["nat", "static", "rule", str(rule_number), "inbound-interface"]

    def get_static_rule_translation_address(self, rule_number: int, address: str) -> List[str]:
        """Get command path for static rule translation address."""
        return ["nat", "static", "rule", str(rule_number), "translation", "address", address]

    def get_static_rule_translation_address_path(self, rule_number: int) -> List[str]:
        """Get command path for static rule translation address (for deletion)."""
        return ["nat", "static", "rule", str(rule_number), "translation", "address"]
