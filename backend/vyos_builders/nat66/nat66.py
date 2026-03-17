"""NAT66 batch builder for generating VyOS nat66 commands."""
from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class NAT66BatchBuilder:
    """Builder for NAT66 batch operations.

    Generates VyOS set/delete commands for nat66 source and destination rules.
    Source rules use outbound-interface + prefix-based addressing.
    Destination rules use inbound-interface + address-based addressing.
    VyOS 1.5 adds firewall group references on both rule types.
    """

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "nat66"

    def add_set(self, path: List[str]) -> "NAT66BatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "NAT66BatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # ==================== Source Rule operations ====================

    def set_source_rule(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule(rule_number))

    def delete_source_rule(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_path(rule_number))

    def set_source_rule_description(self, rule_number: int, description: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule_description(rule_number, description))

    def delete_source_rule_description(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_description_path(rule_number))

    def set_source_rule_disable(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule_disable(rule_number))

    def delete_source_rule_disable(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_disable_path(rule_number))

    def set_source_rule_exclude(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule_exclude(rule_number))

    def delete_source_rule_exclude(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_exclude_path(rule_number))

    def set_source_rule_log(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule_log(rule_number))

    def delete_source_rule_log(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_log_path(rule_number))

    def set_source_rule_protocol(self, rule_number: int, protocol: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule_protocol(rule_number, protocol))

    def delete_source_rule_protocol(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_protocol_path(rule_number))

    def set_source_rule_outbound_interface_name(self, rule_number: int, name: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule_outbound_interface_name(rule_number, name))

    def delete_source_rule_outbound_interface_name(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_outbound_interface_name_path(rule_number))

    # Source rule - source
    def set_source_rule_source_prefix(self, rule_number: int, prefix: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule_source_prefix(rule_number, prefix))

    def delete_source_rule_source_prefix(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_source_prefix_path(rule_number))

    def set_source_rule_source_port(self, rule_number: int, port: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule_source_port(rule_number, port))

    def delete_source_rule_source_port(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_source_port_path(rule_number))

    # Source rule - destination
    def set_source_rule_destination_prefix(self, rule_number: int, prefix: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule_destination_prefix(rule_number, prefix))

    def delete_source_rule_destination_prefix(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_destination_prefix_path(rule_number))

    def set_source_rule_destination_port(self, rule_number: int, port: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule_destination_port(rule_number, port))

    def delete_source_rule_destination_port(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_destination_port_path(rule_number))

    # Source rule - translation
    def set_source_rule_translation_address(self, rule_number: int, address: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule_translation_address(rule_number, address))

    def delete_source_rule_translation_address(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_translation_address_path(rule_number))

    def set_source_rule_translation_port(self, rule_number: int, port: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule_translation_port(rule_number, port))

    def delete_source_rule_translation_port(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_translation_port_path(rule_number))

    # Source rule - groups (VyOS 1.5 only, mapper will have the method)
    def set_source_rule_source_group(self, rule_number: int, group_type: str, value: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule_source_group(rule_number, group_type, value))

    def delete_source_rule_source_group(self, rule_number: int, group_type: str) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_source_group_path(rule_number, group_type))

    def set_source_rule_destination_group(self, rule_number: int, group_type: str, value: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_source_rule_destination_group(rule_number, group_type, value))

    def delete_source_rule_destination_group(self, rule_number: int, group_type: str) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_source_rule_destination_group_path(rule_number, group_type))

    # ==================== Destination Rule operations ====================

    def set_destination_rule(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule(rule_number))

    def delete_destination_rule(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_path(rule_number))

    def set_destination_rule_description(self, rule_number: int, description: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule_description(rule_number, description))

    def delete_destination_rule_description(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_description_path(rule_number))

    def set_destination_rule_disable(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule_disable(rule_number))

    def delete_destination_rule_disable(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_disable_path(rule_number))

    def set_destination_rule_exclude(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule_exclude(rule_number))

    def delete_destination_rule_exclude(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_exclude_path(rule_number))

    def set_destination_rule_log(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule_log(rule_number))

    def delete_destination_rule_log(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_log_path(rule_number))

    def set_destination_rule_protocol(self, rule_number: int, protocol: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule_protocol(rule_number, protocol))

    def delete_destination_rule_protocol(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_protocol_path(rule_number))

    def set_destination_rule_inbound_interface_name(self, rule_number: int, name: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule_inbound_interface_name(rule_number, name))

    def delete_destination_rule_inbound_interface_name(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_inbound_interface_name_path(rule_number))

    # Destination rule - source
    def set_destination_rule_source_address(self, rule_number: int, address: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule_source_address(rule_number, address))

    def delete_destination_rule_source_address(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_source_address_path(rule_number))

    def set_destination_rule_source_port(self, rule_number: int, port: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule_source_port(rule_number, port))

    def delete_destination_rule_source_port(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_source_port_path(rule_number))

    # Destination rule - destination
    def set_destination_rule_destination_address(self, rule_number: int, address: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule_destination_address(rule_number, address))

    def delete_destination_rule_destination_address(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_destination_address_path(rule_number))

    def set_destination_rule_destination_port(self, rule_number: int, port: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule_destination_port(rule_number, port))

    def delete_destination_rule_destination_port(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_destination_port_path(rule_number))

    # Destination rule - translation
    def set_destination_rule_translation_address(self, rule_number: int, address: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule_translation_address(rule_number, address))

    def delete_destination_rule_translation_address(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_translation_address_path(rule_number))

    def set_destination_rule_translation_port(self, rule_number: int, port: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule_translation_port(rule_number, port))

    def delete_destination_rule_translation_port(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_translation_port_path(rule_number))

    # Destination rule - groups (VyOS 1.5 only)
    def set_destination_rule_source_group(self, rule_number: int, group_type: str, value: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule_source_group(rule_number, group_type, value))

    def delete_destination_rule_source_group(self, rule_number: int, group_type: str) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_source_group_path(rule_number, group_type))

    def set_destination_rule_destination_group(self, rule_number: int, group_type: str, value: str) -> "NAT66BatchBuilder":
        return self.add_set(self.mappers[self.mapper_key].get_destination_rule_destination_group(rule_number, group_type, value))

    def delete_destination_rule_destination_group(self, rule_number: int, group_type: str) -> "NAT66BatchBuilder":
        return self.add_delete(self.mappers[self.mapper_key].get_destination_rule_destination_group_path(rule_number, group_type))

    # ==================== Capabilities ====================

    def get_capabilities(self) -> Dict[str, Any]:
        """Return version-aware capabilities for NAT66."""
        is_v1_5 = "1.5" in self.version
        return {
            "version": self.version,
            "version_info": {
                "is_1_4": "1.4" in self.version,
                "is_1_5": is_v1_5,
            },
            "supported": True,
            "features": {
                "source_nat66": {
                    "supported": True,
                    "description": "IPv6-to-IPv6 source address translation",
                },
                "destination_nat66": {
                    "supported": True,
                    "description": "IPv6-to-IPv6 destination address translation",
                },
                "masquerade": {
                    "supported": True,
                    "description": "NAT66 masquerade (source translation to outbound interface address)",
                },
                "groups": {
                    "supported": is_v1_5,
                    "description": "Firewall group references in source/destination match (VyOS 1.5+)",
                },
            },
            "operations": {
                "source_rule": [
                    "set_source_rule",
                    "delete_source_rule",
                    "set_source_rule_description",
                    "delete_source_rule_description",
                    "set_source_rule_disable",
                    "delete_source_rule_disable",
                    "set_source_rule_exclude",
                    "delete_source_rule_exclude",
                    "set_source_rule_log",
                    "delete_source_rule_log",
                    "set_source_rule_protocol",
                    "delete_source_rule_protocol",
                    "set_source_rule_outbound_interface_name",
                    "delete_source_rule_outbound_interface_name",
                    "set_source_rule_source_prefix",
                    "delete_source_rule_source_prefix",
                    "set_source_rule_source_port",
                    "delete_source_rule_source_port",
                    "set_source_rule_destination_prefix",
                    "delete_source_rule_destination_prefix",
                    "set_source_rule_destination_port",
                    "delete_source_rule_destination_port",
                    "set_source_rule_translation_address",
                    "delete_source_rule_translation_address",
                    "set_source_rule_translation_port",
                    "delete_source_rule_translation_port",
                ],
                "destination_rule": [
                    "set_destination_rule",
                    "delete_destination_rule",
                    "set_destination_rule_description",
                    "delete_destination_rule_description",
                    "set_destination_rule_disable",
                    "delete_destination_rule_disable",
                    "set_destination_rule_exclude",
                    "delete_destination_rule_exclude",
                    "set_destination_rule_log",
                    "delete_destination_rule_log",
                    "set_destination_rule_protocol",
                    "delete_destination_rule_protocol",
                    "set_destination_rule_inbound_interface_name",
                    "delete_destination_rule_inbound_interface_name",
                    "set_destination_rule_source_address",
                    "delete_destination_rule_source_address",
                    "set_destination_rule_source_port",
                    "delete_destination_rule_source_port",
                    "set_destination_rule_destination_address",
                    "delete_destination_rule_destination_address",
                    "set_destination_rule_destination_port",
                    "delete_destination_rule_destination_port",
                    "set_destination_rule_translation_address",
                    "delete_destination_rule_translation_address",
                    "set_destination_rule_translation_port",
                    "delete_destination_rule_translation_port",
                ],
            },
        }
