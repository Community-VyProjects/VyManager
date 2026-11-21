"""NAT66 batch builder for generating VyOS nat66 commands."""
from typing import Any, Dict, List, cast

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.nat66 import NAT66Mapper
from vyos_builders.base import BatchBuilder


class NAT66BatchBuilder(BatchBuilder):
    """Builder for NAT66 batch operations.

    Generates VyOS set/delete commands for nat66 source and destination rules.
    Source rules use outbound-interface + prefix-based addressing.
    Destination rules use inbound-interface + address-based addressing.
    Firewall group matches exist only where the mapper allowlist has them.
    """

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "nat66"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    def _m(self) -> NAT66Mapper:
        return cast(NAT66Mapper, self.mappers[self.mapper_key])

    def _versioned_path(self, node: str, method: str, *args: Any) -> List[str]:
        """Path for a subtree only one VyOS version has; ValueError elsewhere."""
        mapper = self._m()
        mapper.require_node(node)
        return getattr(mapper, method)(*args)

    def _group_path(self, node: str, method: str, rule_number: int, group_type: str, *value: str) -> List[str]:
        """Group match path; the group type must be one the lab template has."""
        path = self._versioned_path(node, method, rule_number, group_type, *value)
        if group_type not in self._m().group_types():
            raise ValueError(f"nat66 group type {group_type!r} is not supported on this device")
        return path

    # ==================== Source Rule operations ====================

    def set_source_rule(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_source_rule(rule_number))

    def delete_source_rule(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_source_rule_path(rule_number))

    def set_source_rule_description(self, rule_number: int, description: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_source_rule_description(rule_number, description))

    def delete_source_rule_description(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_source_rule_description_path(rule_number))

    def set_source_rule_disable(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_source_rule_disable(rule_number))

    def delete_source_rule_disable(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_source_rule_disable_path(rule_number))

    def set_source_rule_exclude(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_source_rule_exclude(rule_number))

    def delete_source_rule_exclude(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_source_rule_exclude_path(rule_number))

    def set_source_rule_log(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_source_rule_log(rule_number))

    def delete_source_rule_log(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_source_rule_log_path(rule_number))

    def set_source_rule_protocol(self, rule_number: int, protocol: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_source_rule_protocol(rule_number, protocol))

    def delete_source_rule_protocol(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_source_rule_protocol_path(rule_number))

    def set_source_rule_outbound_interface_name(self, rule_number: int, name: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_source_rule_outbound_interface_name(rule_number, name))

    def delete_source_rule_outbound_interface_name(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_source_rule_outbound_interface_path(rule_number))

    # Source rule - source
    def set_source_rule_source_prefix(self, rule_number: int, prefix: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_source_rule_source_prefix(rule_number, prefix))

    def delete_source_rule_source_prefix(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_source_rule_source_prefix_path(rule_number))

    def set_source_rule_source_port(self, rule_number: int, port: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_source_rule_source_port(rule_number, port))

    def delete_source_rule_source_port(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_source_rule_source_port_path(rule_number))

    # Source rule - destination
    def set_source_rule_destination_prefix(self, rule_number: int, prefix: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_source_rule_destination_prefix(rule_number, prefix))

    def delete_source_rule_destination_prefix(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_source_rule_destination_prefix_path(rule_number))

    def set_source_rule_destination_port(self, rule_number: int, port: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_source_rule_destination_port(rule_number, port))

    def delete_source_rule_destination_port(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_source_rule_destination_port_path(rule_number))

    # Source rule - translation
    def set_source_rule_translation_address(self, rule_number: int, address: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_source_rule_translation_address(rule_number, address))

    def delete_source_rule_translation_address(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_source_rule_translation_address_path(rule_number))

    def set_source_rule_translation_port(self, rule_number: int, port: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_source_rule_translation_port(rule_number, port))

    def delete_source_rule_translation_port(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_source_rule_translation_port_path(rule_number))

    # Source rule - groups (allowlist: 1.5 only)
    def set_source_rule_source_group(self, rule_number: int, group_type: str, value: str) -> "NAT66BatchBuilder":
        return self.add_set(self._group_path(
            "source_rule_source_group", "get_source_rule_source_group", rule_number, group_type, value))

    def delete_source_rule_source_group(self, rule_number: int, group_type: str) -> "NAT66BatchBuilder":
        return self.add_delete(self._group_path(
            "source_rule_source_group", "get_source_rule_source_group_path", rule_number, group_type))

    def set_source_rule_destination_group(self, rule_number: int, group_type: str, value: str) -> "NAT66BatchBuilder":
        return self.add_set(self._group_path(
            "source_rule_destination_group", "get_source_rule_destination_group", rule_number, group_type, value))

    def delete_source_rule_destination_group(self, rule_number: int, group_type: str) -> "NAT66BatchBuilder":
        return self.add_delete(self._group_path(
            "source_rule_destination_group", "get_source_rule_destination_group_path", rule_number, group_type))

    # ==================== Destination Rule operations ====================

    def set_destination_rule(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_destination_rule(rule_number))

    def delete_destination_rule(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_destination_rule_path(rule_number))

    def set_destination_rule_description(self, rule_number: int, description: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_destination_rule_description(rule_number, description))

    def delete_destination_rule_description(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_destination_rule_description_path(rule_number))

    def set_destination_rule_disable(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_destination_rule_disable(rule_number))

    def delete_destination_rule_disable(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_destination_rule_disable_path(rule_number))

    def set_destination_rule_exclude(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_destination_rule_exclude(rule_number))

    def delete_destination_rule_exclude(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_destination_rule_exclude_path(rule_number))

    def set_destination_rule_log(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_destination_rule_log(rule_number))

    def delete_destination_rule_log(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_destination_rule_log_path(rule_number))

    def set_destination_rule_protocol(self, rule_number: int, protocol: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_destination_rule_protocol(rule_number, protocol))

    def delete_destination_rule_protocol(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_destination_rule_protocol_path(rule_number))

    def set_destination_rule_inbound_interface_name(self, rule_number: int, name: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_destination_rule_inbound_interface_name(rule_number, name))

    def delete_destination_rule_inbound_interface_name(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_destination_rule_inbound_interface_path(rule_number))

    # Destination rule - source
    def set_destination_rule_source_address(self, rule_number: int, address: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_destination_rule_source_address(rule_number, address))

    def delete_destination_rule_source_address(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_destination_rule_source_address_path(rule_number))

    def set_destination_rule_source_port(self, rule_number: int, port: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_destination_rule_source_port(rule_number, port))

    def delete_destination_rule_source_port(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_destination_rule_source_port_path(rule_number))

    # Destination rule - destination
    def set_destination_rule_destination_address(self, rule_number: int, address: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_destination_rule_destination_address(rule_number, address))

    def delete_destination_rule_destination_address(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_destination_rule_destination_address_path(rule_number))

    def set_destination_rule_destination_port(self, rule_number: int, port: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_destination_rule_destination_port(rule_number, port))

    def delete_destination_rule_destination_port(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_destination_rule_destination_port_path(rule_number))

    # Destination rule - translation
    def set_destination_rule_translation_address(self, rule_number: int, address: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_destination_rule_translation_address(rule_number, address))

    def delete_destination_rule_translation_address(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_destination_rule_translation_address_path(rule_number))

    def set_destination_rule_translation_port(self, rule_number: int, port: str) -> "NAT66BatchBuilder":
        return self.add_set(self._m().get_destination_rule_translation_port(rule_number, port))

    def delete_destination_rule_translation_port(self, rule_number: int) -> "NAT66BatchBuilder":
        return self.add_delete(self._m().get_destination_rule_translation_port_path(rule_number))

    # Destination rule - groups (allowlist: 1.5 only)
    def set_destination_rule_source_group(self, rule_number: int, group_type: str, value: str) -> "NAT66BatchBuilder":
        return self.add_set(self._group_path(
            "destination_rule_source_group", "get_destination_rule_source_group", rule_number, group_type, value))

    def delete_destination_rule_source_group(self, rule_number: int, group_type: str) -> "NAT66BatchBuilder":
        return self.add_delete(self._group_path(
            "destination_rule_source_group", "get_destination_rule_source_group_path", rule_number, group_type))

    def set_destination_rule_destination_group(self, rule_number: int, group_type: str, value: str) -> "NAT66BatchBuilder":
        return self.add_set(self._group_path(
            "destination_rule_destination_group", "get_destination_rule_destination_group",
            rule_number, group_type, value))

    def delete_destination_rule_destination_group(self, rule_number: int, group_type: str) -> "NAT66BatchBuilder":
        return self.add_delete(self._group_path(
            "destination_rule_destination_group", "get_destination_rule_destination_group_path",
            rule_number, group_type))

    # ==================== Capabilities ====================

    def get_capabilities(self) -> Dict[str, Any]:
        """Return NAT66 capabilities; group matches follow the mapper allowlist."""
        m = self._m()
        nodes = m.versioned_nodes()
        # allowlist node -> rule type; the node name is also its op suffix
        group_nodes = {
            "source_rule_source_group": "source_rule",
            "source_rule_destination_group": "source_rule",
            "destination_rule_source_group": "destination_rule",
            "destination_rule_destination_group": "destination_rule",
        }
        group_ops: Dict[str, List[str]] = {"source_rule": [], "destination_rule": []}
        for node, rule_type in group_nodes.items():
            if node in nodes:
                group_ops[rule_type] += [f"set_{node}", f"delete_{node}"]
        groups = set(group_nodes) <= nodes
        return {
            "version": self.version,
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
                    "supported": groups,
                    "description": "Firewall group matches on rule source and destination",
                    "group_types": m.group_types(),
                },
            },
            "protocols": m.protocols(),
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
                ] + group_ops["source_rule"],
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
                ] + group_ops["destination_rule"],
            },
        }
