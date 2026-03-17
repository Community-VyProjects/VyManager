"""NAT64 mapper - base path definitions for nat64 commands."""
from typing import List


class NAT64Mapper:
    """Base NAT64 mapper with path generation for all nat64 commands.

    Command tree:
      nat64 source rule <num> description <text>
      nat64 source rule <num> disable
      nat64 source rule <num> match mark <u32>
      nat64 source rule <num> source prefix <ipv6net>
      nat64 source rule <num> translation pool <num> address <ipv4/ipv4net>
      nat64 source rule <num> translation pool <num> description <text>
      nat64 source rule <num> translation pool <num> disable
      nat64 source rule <num> translation pool <num> port <port-range>
      nat64 source rule <num> translation pool <num> protocol icmp
      nat64 source rule <num> translation pool <num> protocol tcp
      nat64 source rule <num> translation pool <num> protocol udp
    """

    def __init__(self, version: str):
        self.version = version

    # ==================== Rule-level paths ====================

    def get_source_rule(self, rule_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number)]

    def get_source_rule_path(self, rule_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number)]

    def get_source_rule_description(self, rule_number: int, description: str) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "description", description]

    def get_source_rule_description_path(self, rule_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "description"]

    def get_source_rule_disable(self, rule_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "disable"]

    def get_source_rule_disable_path(self, rule_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "disable"]

    # ==================== Match paths ====================

    def get_source_rule_match_mark(self, rule_number: int, mark: str) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "match", "mark", mark]

    def get_source_rule_match_mark_path(self, rule_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "match", "mark"]

    # ==================== Source paths ====================

    def get_source_rule_source_prefix(self, rule_number: int, prefix: str) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "source", "prefix", prefix]

    def get_source_rule_source_prefix_path(self, rule_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "source", "prefix"]

    # ==================== Translation pool paths ====================

    def get_source_rule_translation_pool(self, rule_number: int, pool_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number)]

    def get_source_rule_translation_pool_path(self, rule_number: int, pool_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number)]

    def get_source_rule_translation_pool_address(self, rule_number: int, pool_number: int, address: str) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number), "address", address]

    def get_source_rule_translation_pool_address_path(self, rule_number: int, pool_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number), "address"]

    def get_source_rule_translation_pool_description(self, rule_number: int, pool_number: int, description: str) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number), "description", description]

    def get_source_rule_translation_pool_description_path(self, rule_number: int, pool_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number), "description"]

    def get_source_rule_translation_pool_disable(self, rule_number: int, pool_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number), "disable"]

    def get_source_rule_translation_pool_disable_path(self, rule_number: int, pool_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number), "disable"]

    def get_source_rule_translation_pool_port(self, rule_number: int, pool_number: int, port: str) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number), "port", port]

    def get_source_rule_translation_pool_port_path(self, rule_number: int, pool_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number), "port"]

    def get_source_rule_translation_pool_protocol_tcp(self, rule_number: int, pool_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number), "protocol", "tcp"]

    def get_source_rule_translation_pool_protocol_tcp_path(self, rule_number: int, pool_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number), "protocol", "tcp"]

    def get_source_rule_translation_pool_protocol_udp(self, rule_number: int, pool_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number), "protocol", "udp"]

    def get_source_rule_translation_pool_protocol_udp_path(self, rule_number: int, pool_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number), "protocol", "udp"]

    def get_source_rule_translation_pool_protocol_icmp(self, rule_number: int, pool_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number), "protocol", "icmp"]

    def get_source_rule_translation_pool_protocol_icmp_path(self, rule_number: int, pool_number: int) -> List[str]:
        return ["nat64", "source", "rule", str(rule_number), "translation", "pool", str(pool_number), "protocol", "icmp"]
