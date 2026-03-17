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
"""
from typing import List


class NAT66Mapper:
    """Base NAT66 mapper with path generation for all common nat66 commands."""

    def __init__(self, version: str):
        self.version = version

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

    def get_source_rule_outbound_interface_name_path(self, rule_number: int) -> List[str]:
        return ["nat66", "source", "rule", str(rule_number), "outbound-interface", "name"]

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

    def get_destination_rule_inbound_interface_name_path(self, rule_number: int) -> List[str]:
        return ["nat66", "destination", "rule", str(rule_number), "inbound-interface", "name"]

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
