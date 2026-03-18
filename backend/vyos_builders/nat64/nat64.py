"""NAT64 batch builder for generating VyOS nat64 commands."""
from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class NAT64BatchBuilder:
    """Builder for NAT64 batch operations.

    Generates VyOS set/delete commands for nat64 source rules
    and their translation pools.
    """

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "nat64"

    def add_set(self, path: List[str]) -> "NAT64BatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "NAT64BatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # ==================== Rule operations ====================

    def set_source_rule(self, rule_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule(rule_number)
        return self.add_set(path)

    def delete_source_rule(self, rule_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_path(rule_number)
        return self.add_delete(path)

    def set_source_rule_description(self, rule_number: int, description: str) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_description(rule_number, description)
        return self.add_set(path)

    def delete_source_rule_description(self, rule_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_description_path(rule_number)
        return self.add_delete(path)

    def set_source_rule_disable(self, rule_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_disable(rule_number)
        return self.add_set(path)

    def delete_source_rule_disable(self, rule_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_disable_path(rule_number)
        return self.add_delete(path)

    # ==================== Match operations ====================

    def set_source_rule_match_mark(self, rule_number: int, mark: str) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_match_mark(rule_number, mark)
        return self.add_set(path)

    def delete_source_rule_match_mark(self, rule_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_match_mark_path(rule_number)
        return self.add_delete(path)

    # ==================== Source operations ====================

    def set_source_rule_source_prefix(self, rule_number: int, prefix: str) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_source_prefix(rule_number, prefix)
        return self.add_set(path)

    def delete_source_rule_source_prefix(self, rule_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_source_prefix_path(rule_number)
        return self.add_delete(path)

    # ==================== Translation pool operations ====================

    def set_source_rule_translation_pool(self, rule_number: int, pool_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool(rule_number, pool_number)
        return self.add_set(path)

    def delete_source_rule_translation_pool(self, rule_number: int, pool_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_path(rule_number, pool_number)
        return self.add_delete(path)

    def set_source_rule_translation_pool_address(self, rule_number: int, pool_number: int, address: str) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_address(rule_number, pool_number, address)
        return self.add_set(path)

    def delete_source_rule_translation_pool_address(self, rule_number: int, pool_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_address_path(rule_number, pool_number)
        return self.add_delete(path)

    def set_source_rule_translation_pool_description(self, rule_number: int, pool_number: int, description: str) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_description(rule_number, pool_number, description)
        return self.add_set(path)

    def delete_source_rule_translation_pool_description(self, rule_number: int, pool_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_description_path(rule_number, pool_number)
        return self.add_delete(path)

    def set_source_rule_translation_pool_disable(self, rule_number: int, pool_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_disable(rule_number, pool_number)
        return self.add_set(path)

    def delete_source_rule_translation_pool_disable(self, rule_number: int, pool_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_disable_path(rule_number, pool_number)
        return self.add_delete(path)

    def set_source_rule_translation_pool_port(self, rule_number: int, pool_number: int, port: str) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_port(rule_number, pool_number, port)
        return self.add_set(path)

    def delete_source_rule_translation_pool_port(self, rule_number: int, pool_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_port_path(rule_number, pool_number)
        return self.add_delete(path)

    def set_source_rule_translation_pool_protocol_tcp(self, rule_number: int, pool_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_protocol_tcp(rule_number, pool_number)
        return self.add_set(path)

    def delete_source_rule_translation_pool_protocol_tcp(self, rule_number: int, pool_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_protocol_tcp_path(rule_number, pool_number)
        return self.add_delete(path)

    def set_source_rule_translation_pool_protocol_udp(self, rule_number: int, pool_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_protocol_udp(rule_number, pool_number)
        return self.add_set(path)

    def delete_source_rule_translation_pool_protocol_udp(self, rule_number: int, pool_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_protocol_udp_path(rule_number, pool_number)
        return self.add_delete(path)

    def set_source_rule_translation_pool_protocol_icmp(self, rule_number: int, pool_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_protocol_icmp(rule_number, pool_number)
        return self.add_set(path)

    def delete_source_rule_translation_pool_protocol_icmp(self, rule_number: int, pool_number: int) -> "NAT64BatchBuilder":
        path = self.mappers[self.mapper_key].get_source_rule_translation_pool_protocol_icmp_path(rule_number, pool_number)
        return self.add_delete(path)

    # ==================== Capabilities ====================

    def get_capabilities(self) -> Dict[str, Any]:
        """Return version-aware capabilities for NAT64."""
        return {
            "version": self.version,
            "version_info": {
                "is_1_4": "1.4" in self.version,
                "is_1_5": "1.5" in self.version,
            },
            "supported": True,
            "features": {
                "source_nat64": {
                    "supported": True,
                    "description": "IPv6 source to IPv4 destination address translation",
                },
                "match_mark": {
                    "supported": True,
                    "description": "Match firewall mark on packets",
                },
                "translation_pools": {
                    "supported": True,
                    "description": "Multiple translation pools per rule with protocol filtering",
                },
            },
            "operations": {
                "rule": [
                    "set_source_rule",
                    "delete_source_rule",
                    "set_source_rule_description",
                    "delete_source_rule_description",
                    "set_source_rule_disable",
                    "delete_source_rule_disable",
                    "set_source_rule_match_mark",
                    "delete_source_rule_match_mark",
                    "set_source_rule_source_prefix",
                    "delete_source_rule_source_prefix",
                ],
                "translation_pool": [
                    "set_source_rule_translation_pool",
                    "delete_source_rule_translation_pool",
                    "set_source_rule_translation_pool_address",
                    "delete_source_rule_translation_pool_address",
                    "set_source_rule_translation_pool_description",
                    "delete_source_rule_translation_pool_description",
                    "set_source_rule_translation_pool_disable",
                    "delete_source_rule_translation_pool_disable",
                    "set_source_rule_translation_pool_port",
                    "delete_source_rule_translation_pool_port",
                    "set_source_rule_translation_pool_protocol_tcp",
                    "delete_source_rule_translation_pool_protocol_tcp",
                    "set_source_rule_translation_pool_protocol_udp",
                    "delete_source_rule_translation_pool_protocol_udp",
                    "set_source_rule_translation_pool_protocol_icmp",
                    "delete_source_rule_translation_pool_protocol_icmp",
                ],
            },
        }
