"""
NAT Batch Builder

Provides all NAT batch operations following the standard pattern.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class NATBatchBuilder:
    """Complete batch builder for NAT operations"""

    def __init__(self, version: str):
        """Initialize NAT batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get NAT mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "nat"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "NATBatchBuilder":
        """Add a 'set' operation to the batch."""
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "NATBatchBuilder":
        """Add a 'delete' operation to the batch."""
        self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        """Get the list of operations."""
        return self._operations.copy()

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

    def is_empty(self) -> bool:
        """Check if the batch is empty."""
        return len(self._operations) == 0

    # ========================================================================
    # Source NAT Rule Operations
    # ========================================================================

    def set_source_rule(self, rule_number: int) -> "NATBatchBuilder":
        """Create source NAT rule."""
        path = self.mappers[self.mapper_key].get_source_rule(rule_number)
        return self.add_set(path)

    def delete_source_rule(self, rule_number: int) -> "NATBatchBuilder":
        """Delete source NAT rule."""
        path = self.mappers[self.mapper_key].get_source_rule(rule_number)
        return self.add_delete(path)

    def set_source_rule_packet_type(
        self, rule_number: int, packet_type: str
    ) -> "NATBatchBuilder":
        """Set source rule packet-type."""
        path = self.mappers[self.mapper_key].get_source_rule_packet_type(
            rule_number, packet_type
        )
        return self.add_set(path)

    def delete_source_rule_packet_type(self, rule_number: int) -> "NATBatchBuilder":
        """Delete source rule packet-type."""
        path = self.mappers[self.mapper_key].get_source_rule_packet_type_path(rule_number)
        return self.add_delete(path)

    def set_source_rule_description(
        self, rule_number: int, description: str
    ) -> "NATBatchBuilder":
        """Set source rule description."""
        path = self.mappers[self.mapper_key].get_source_rule_description(
            rule_number, description
        )
        return self.add_set(path)

    def delete_source_rule_description(self, rule_number: int) -> "NATBatchBuilder":
        """Delete source rule description."""
        path = self.mappers[self.mapper_key].get_source_rule_description_path(rule_number)
        return self.add_delete(path)

    def set_source_rule_destination_address(
        self, rule_number: int, address: str
    ) -> "NATBatchBuilder":
        """Set source rule destination address."""
        path = self.mappers[self.mapper_key].get_source_rule_destination_address(
            rule_number, address
        )
        return self.add_set(path)

    def delete_source_rule_destination_address(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete source rule destination address."""
        path = self.mappers[self.mapper_key].get_source_rule_destination_address_path(
            rule_number
        )
        return self.add_delete(path)

    def set_source_rule_destination_group(
        self, rule_number: int, group_type: str, group_name: str
    ) -> "NATBatchBuilder":
        """Set source rule destination group."""
        path = self.mappers[self.mapper_key].get_source_rule_destination_group(
            rule_number, group_type, group_name
        )
        return self.add_set(path)

    def delete_source_rule_destination_group(
        self, rule_number: int, group_type: str
    ) -> "NATBatchBuilder":
        """Delete source rule destination group."""
        path = self.mappers[self.mapper_key].get_source_rule_destination_group_path(
            rule_number, group_type
        )
        return self.add_delete(path)

    def set_source_rule_destination_port(
        self, rule_number: int, port: str
    ) -> "NATBatchBuilder":
        """Set source rule destination port."""
        path = self.mappers[self.mapper_key].get_source_rule_destination_port(
            rule_number, port
        )
        return self.add_set(path)

    def delete_source_rule_destination_port(self, rule_number: int) -> "NATBatchBuilder":
        """Delete source rule destination port."""
        path = self.mappers[self.mapper_key].get_source_rule_destination_port_path(
            rule_number
        )
        return self.add_delete(path)

    def set_source_rule_disable(self, rule_number: int) -> "NATBatchBuilder":
        """Set source rule disable flag."""
        path = self.mappers[self.mapper_key].get_source_rule_disable(rule_number)
        return self.add_set(path)

    def delete_source_rule_disable(self, rule_number: int) -> "NATBatchBuilder":
        """Delete source rule disable flag (enable the rule)."""
        path = self.mappers[self.mapper_key].get_source_rule_disable(rule_number)
        return self.add_delete(path)

    def set_source_rule_exclude(self, rule_number: int) -> "NATBatchBuilder":
        """Set source rule exclude flag."""
        path = self.mappers[self.mapper_key].get_source_rule_exclude(rule_number)
        return self.add_set(path)

    def delete_source_rule_exclude(self, rule_number: int) -> "NATBatchBuilder":
        """Delete source rule exclude flag."""
        path = self.mappers[self.mapper_key].get_source_rule_exclude(rule_number)
        return self.add_delete(path)

    def set_source_rule_load_balance_hash(
        self, rule_number: int, hash_type: str
    ) -> "NATBatchBuilder":
        """Set source rule load-balance hash."""
        path = self.mappers[self.mapper_key].get_source_rule_load_balance_hash(
            rule_number, hash_type
        )
        return self.add_set(path)

    def delete_source_rule_load_balance_hash(self, rule_number: int) -> "NATBatchBuilder":
        """Delete source rule load-balance hash."""
        path = self.mappers[self.mapper_key].get_source_rule_load_balance_hash_path(
            rule_number
        )
        return self.add_delete(path)

    def set_source_rule_load_balance_backend(
        self, rule_number: int, backend: str
    ) -> "NATBatchBuilder":
        """Set source rule load-balance backend."""
        path = self.mappers[self.mapper_key].get_source_rule_load_balance_backend(
            rule_number, backend
        )
        return self.add_set(path)

    def delete_source_rule_load_balance_backend(
        self, rule_number: int, backend: str
    ) -> "NATBatchBuilder":
        """Delete source rule load-balance backend."""
        path = self.mappers[self.mapper_key].get_source_rule_load_balance_backend_path(
            rule_number, backend
        )
        return self.add_delete(path)

    def set_source_rule_log(self, rule_number: int) -> "NATBatchBuilder":
        """Set source rule log flag."""
        path = self.mappers[self.mapper_key].get_source_rule_log(rule_number)
        return self.add_set(path)

    def delete_source_rule_log(self, rule_number: int) -> "NATBatchBuilder":
        """Delete source rule log flag."""
        path = self.mappers[self.mapper_key].get_source_rule_log(rule_number)
        return self.add_delete(path)

    def set_source_rule_outbound_interface_name(
        self, rule_number: int, interface: str
    ) -> "NATBatchBuilder":
        """Set source rule outbound-interface name."""
        path = self.mappers[self.mapper_key].get_source_rule_outbound_interface_name(
            rule_number, interface
        )
        return self.add_set(path)

    def delete_source_rule_outbound_interface_name(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete source rule outbound-interface name."""
        path = self.mappers[self.mapper_key].get_source_rule_outbound_interface_name_path(
            rule_number
        )
        return self.add_delete(path)

    def set_source_rule_outbound_interface_group(
        self, rule_number: int, group: str
    ) -> "NATBatchBuilder":
        """Set source rule outbound-interface group."""
        path = self.mappers[self.mapper_key].get_source_rule_outbound_interface_group(
            rule_number, group
        )
        return self.add_set(path)

    def delete_source_rule_outbound_interface_group(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete source rule outbound-interface group."""
        path = self.mappers[self.mapper_key].get_source_rule_outbound_interface_group_path(
            rule_number
        )
        return self.add_delete(path)

    def set_source_rule_protocol(
        self, rule_number: int, protocol: str
    ) -> "NATBatchBuilder":
        """Set source rule protocol."""
        path = self.mappers[self.mapper_key].get_source_rule_protocol(rule_number, protocol)
        return self.add_set(path)

    def delete_source_rule_protocol(self, rule_number: int) -> "NATBatchBuilder":
        """Delete source rule protocol."""
        path = self.mappers[self.mapper_key].get_source_rule_protocol_path(rule_number)
        return self.add_delete(path)

    def set_source_rule_source_address(
        self, rule_number: int, address: str
    ) -> "NATBatchBuilder":
        """Set source rule source address."""
        path = self.mappers[self.mapper_key].get_source_rule_source_address(
            rule_number, address
        )
        return self.add_set(path)

    def delete_source_rule_source_address(self, rule_number: int) -> "NATBatchBuilder":
        """Delete source rule source address."""
        path = self.mappers[self.mapper_key].get_source_rule_source_address_path(rule_number)
        return self.add_delete(path)

    def set_source_rule_source_group(
        self, rule_number: int, group_type: str, group_name: str
    ) -> "NATBatchBuilder":
        """Set source rule source group."""
        path = self.mappers[self.mapper_key].get_source_rule_source_group(
            rule_number, group_type, group_name
        )
        return self.add_set(path)

    def delete_source_rule_source_group(
        self, rule_number: int, group_type: str
    ) -> "NATBatchBuilder":
        """Delete source rule source group."""
        path = self.mappers[self.mapper_key].get_source_rule_source_group_path(
            rule_number, group_type
        )
        return self.add_delete(path)

    def set_source_rule_source_port(
        self, rule_number: int, port: str
    ) -> "NATBatchBuilder":
        """Set source rule source port."""
        path = self.mappers[self.mapper_key].get_source_rule_source_port(rule_number, port)
        return self.add_set(path)

    def delete_source_rule_source_port(self, rule_number: int) -> "NATBatchBuilder":
        """Delete source rule source port."""
        path = self.mappers[self.mapper_key].get_source_rule_source_port_path(rule_number)
        return self.add_delete(path)

    def set_source_rule_translation_address(
        self, rule_number: int, address: str
    ) -> "NATBatchBuilder":
        """Set source rule translation address."""
        path = self.mappers[self.mapper_key].get_source_rule_translation_address(
            rule_number, address
        )
        return self.add_set(path)

    def delete_source_rule_translation_address(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete source rule translation address."""
        path = self.mappers[self.mapper_key].get_source_rule_translation_address_path(
            rule_number
        )
        return self.add_delete(path)

    def set_source_rule_translation_port(
        self, rule_number: int, port: str
    ) -> "NATBatchBuilder":
        """Set source rule translation port."""
        path = self.mappers[self.mapper_key].get_source_rule_translation_port(
            rule_number, port
        )
        return self.add_set(path)

    def delete_source_rule_translation_port(self, rule_number: int) -> "NATBatchBuilder":
        """Delete source rule translation port."""
        path = self.mappers[self.mapper_key].get_source_rule_translation_port_path(rule_number)
        return self.add_delete(path)

    def set_source_rule_source_fqdn(
        self, rule_number: int, fqdn: str
    ) -> "NATBatchBuilder":
        """Set source rule source FQDN."""
        path = self.mappers[self.mapper_key].get_source_rule_source_fqdn(rule_number, fqdn)
        return self.add_set(path)

    def delete_source_rule_source_fqdn(self, rule_number: int) -> "NATBatchBuilder":
        """Delete source rule source FQDN."""
        path = self.mappers[self.mapper_key].get_source_rule_source_fqdn_path(rule_number)
        return self.add_delete(path)

    def set_source_rule_destination_fqdn(
        self, rule_number: int, fqdn: str
    ) -> "NATBatchBuilder":
        """Set source rule destination FQDN."""
        path = self.mappers[self.mapper_key].get_source_rule_destination_fqdn(rule_number, fqdn)
        return self.add_set(path)

    def delete_source_rule_destination_fqdn(self, rule_number: int) -> "NATBatchBuilder":
        """Delete source rule destination FQDN."""
        path = self.mappers[self.mapper_key].get_source_rule_destination_fqdn_path(rule_number)
        return self.add_delete(path)

    def set_source_rule_translation_options_address_mapping(
        self, rule_number: int, value: str
    ) -> "NATBatchBuilder":
        """Set source rule translation options address-mapping."""
        path = self.mappers[self.mapper_key].get_source_rule_translation_options_address_mapping(
            rule_number, value
        )
        return self.add_set(path)

    def delete_source_rule_translation_options_address_mapping(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete source rule translation options address-mapping."""
        path = self.mappers[self.mapper_key].get_source_rule_translation_options_address_mapping_path(
            rule_number
        )
        return self.add_delete(path)

    def set_source_rule_translation_options_port_mapping(
        self, rule_number: int, value: str
    ) -> "NATBatchBuilder":
        """Set source rule translation options port-mapping."""
        path = self.mappers[self.mapper_key].get_source_rule_translation_options_port_mapping(
            rule_number, value
        )
        return self.add_set(path)

    def delete_source_rule_translation_options_port_mapping(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete source rule translation options port-mapping."""
        path = self.mappers[self.mapper_key].get_source_rule_translation_options_port_mapping_path(
            rule_number
        )
        return self.add_delete(path)

    def set_source_rule_load_balance_backend_weight(
        self, rule_number: int, backend: str, weight: str
    ) -> "NATBatchBuilder":
        """Set source rule load-balance backend weight."""
        path = self.mappers[self.mapper_key].get_source_rule_load_balance_backend_weight(
            rule_number, backend, weight
        )
        return self.add_set(path)

    def delete_source_rule_load_balance_backend_weight(
        self, rule_number: int, backend: str
    ) -> "NATBatchBuilder":
        """Delete source rule load-balance backend weight."""
        path = self.mappers[self.mapper_key].get_source_rule_load_balance_backend_weight_path(
            rule_number, backend
        )
        return self.add_delete(path)

    # ========================================================================
    # Destination NAT Rule Operations
    # ========================================================================

    def set_destination_rule(self, rule_number: int) -> "NATBatchBuilder":
        """Create destination NAT rule."""
        path = self.mappers[self.mapper_key].get_destination_rule(rule_number)
        return self.add_set(path)

    def delete_destination_rule(self, rule_number: int) -> "NATBatchBuilder":
        """Delete destination NAT rule."""
        path = self.mappers[self.mapper_key].get_destination_rule(rule_number)
        return self.add_delete(path)

    def set_destination_rule_packet_type(
        self, rule_number: int, packet_type: str
    ) -> "NATBatchBuilder":
        """Set destination rule packet-type."""
        path = self.mappers[self.mapper_key].get_destination_rule_packet_type(
            rule_number, packet_type
        )
        return self.add_set(path)

    def delete_destination_rule_packet_type(self, rule_number: int) -> "NATBatchBuilder":
        """Delete destination rule packet-type."""
        path = self.mappers[self.mapper_key].get_destination_rule_packet_type_path(
            rule_number
        )
        return self.add_delete(path)

    def set_destination_rule_description(
        self, rule_number: int, description: str
    ) -> "NATBatchBuilder":
        """Set destination rule description."""
        path = self.mappers[self.mapper_key].get_destination_rule_description(
            rule_number, description
        )
        return self.add_set(path)

    def delete_destination_rule_description(self, rule_number: int) -> "NATBatchBuilder":
        """Delete destination rule description."""
        path = self.mappers[self.mapper_key].get_destination_rule_description_path(
            rule_number
        )
        return self.add_delete(path)

    def set_destination_rule_destination_address(
        self, rule_number: int, address: str
    ) -> "NATBatchBuilder":
        """Set destination rule destination address."""
        path = self.mappers[self.mapper_key].get_destination_rule_destination_address(
            rule_number, address
        )
        return self.add_set(path)

    def delete_destination_rule_destination_address(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete destination rule destination address."""
        path = self.mappers[self.mapper_key].get_destination_rule_destination_address_path(
            rule_number
        )
        return self.add_delete(path)

    def set_destination_rule_destination_group(
        self, rule_number: int, group_type: str, group_name: str
    ) -> "NATBatchBuilder":
        """Set destination rule destination group."""
        path = self.mappers[self.mapper_key].get_destination_rule_destination_group(
            rule_number, group_type, group_name
        )
        return self.add_set(path)

    def delete_destination_rule_destination_group(
        self, rule_number: int, group_type: str
    ) -> "NATBatchBuilder":
        """Delete destination rule destination group."""
        path = self.mappers[self.mapper_key].get_destination_rule_destination_group_path(
            rule_number, group_type
        )
        return self.add_delete(path)

    def set_destination_rule_destination_port(
        self, rule_number: int, port: str
    ) -> "NATBatchBuilder":
        """Set destination rule destination port."""
        path = self.mappers[self.mapper_key].get_destination_rule_destination_port(
            rule_number, port
        )
        return self.add_set(path)

    def delete_destination_rule_destination_port(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete destination rule destination port."""
        path = self.mappers[self.mapper_key].get_destination_rule_destination_port_path(
            rule_number
        )
        return self.add_delete(path)

    def set_destination_rule_disable(self, rule_number: int) -> "NATBatchBuilder":
        """Set destination rule disable flag."""
        path = self.mappers[self.mapper_key].get_destination_rule_disable(rule_number)
        return self.add_set(path)

    def delete_destination_rule_disable(self, rule_number: int) -> "NATBatchBuilder":
        """Delete destination rule disable flag (enable the rule)."""
        path = self.mappers[self.mapper_key].get_destination_rule_disable(rule_number)
        return self.add_delete(path)

    def set_destination_rule_exclude(self, rule_number: int) -> "NATBatchBuilder":
        """Set destination rule exclude flag."""
        path = self.mappers[self.mapper_key].get_destination_rule_exclude(rule_number)
        return self.add_set(path)

    def delete_destination_rule_exclude(self, rule_number: int) -> "NATBatchBuilder":
        """Delete destination rule exclude flag."""
        path = self.mappers[self.mapper_key].get_destination_rule_exclude(rule_number)
        return self.add_delete(path)

    def set_destination_rule_load_balance_hash(
        self, rule_number: int, hash_type: str
    ) -> "NATBatchBuilder":
        """Set destination rule load-balance hash."""
        path = self.mappers[self.mapper_key].get_destination_rule_load_balance_hash(
            rule_number, hash_type
        )
        return self.add_set(path)

    def delete_destination_rule_load_balance_hash(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete destination rule load-balance hash."""
        path = self.mappers[self.mapper_key].get_destination_rule_load_balance_hash_path(
            rule_number
        )
        return self.add_delete(path)

    def set_destination_rule_load_balance_backend(
        self, rule_number: int, backend: str
    ) -> "NATBatchBuilder":
        """Set destination rule load-balance backend."""
        path = self.mappers[self.mapper_key].get_destination_rule_load_balance_backend(
            rule_number, backend
        )
        return self.add_set(path)

    def delete_destination_rule_load_balance_backend(
        self, rule_number: int, backend: str
    ) -> "NATBatchBuilder":
        """Delete destination rule load-balance backend."""
        path = self.mappers[self.mapper_key].get_destination_rule_load_balance_backend_path(
            rule_number, backend
        )
        return self.add_delete(path)

    def set_destination_rule_log(self, rule_number: int) -> "NATBatchBuilder":
        """Set destination rule log flag."""
        path = self.mappers[self.mapper_key].get_destination_rule_log(rule_number)
        return self.add_set(path)

    def delete_destination_rule_log(self, rule_number: int) -> "NATBatchBuilder":
        """Delete destination rule log flag."""
        path = self.mappers[self.mapper_key].get_destination_rule_log(rule_number)
        return self.add_delete(path)

    def set_destination_rule_inbound_interface_name(
        self, rule_number: int, interface: str
    ) -> "NATBatchBuilder":
        """Set destination rule inbound-interface name."""
        path = self.mappers[self.mapper_key].get_destination_rule_inbound_interface_name(
            rule_number, interface
        )
        return self.add_set(path)

    def delete_destination_rule_inbound_interface_name(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete destination rule inbound-interface name."""
        path = self.mappers[self.mapper_key].get_destination_rule_inbound_interface_name_path(
            rule_number
        )
        return self.add_delete(path)

    def set_destination_rule_inbound_interface_group(
        self, rule_number: int, group: str
    ) -> "NATBatchBuilder":
        """Set destination rule inbound-interface group."""
        path = self.mappers[self.mapper_key].get_destination_rule_inbound_interface_group(
            rule_number, group
        )
        return self.add_set(path)

    def delete_destination_rule_inbound_interface_group(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete destination rule inbound-interface group."""
        path = self.mappers[self.mapper_key].get_destination_rule_inbound_interface_group_path(
            rule_number
        )
        return self.add_delete(path)

    def set_destination_rule_protocol(
        self, rule_number: int, protocol: str
    ) -> "NATBatchBuilder":
        """Set destination rule protocol."""
        path = self.mappers[self.mapper_key].get_destination_rule_protocol(
            rule_number, protocol
        )
        return self.add_set(path)

    def delete_destination_rule_protocol(self, rule_number: int) -> "NATBatchBuilder":
        """Delete destination rule protocol."""
        path = self.mappers[self.mapper_key].get_destination_rule_protocol_path(rule_number)
        return self.add_delete(path)

    def set_destination_rule_source_address(
        self, rule_number: int, address: str
    ) -> "NATBatchBuilder":
        """Set destination rule source address."""
        path = self.mappers[self.mapper_key].get_destination_rule_source_address(
            rule_number, address
        )
        return self.add_set(path)

    def delete_destination_rule_source_address(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete destination rule source address."""
        path = self.mappers[self.mapper_key].get_destination_rule_source_address_path(
            rule_number
        )
        return self.add_delete(path)

    def set_destination_rule_source_group(
        self, rule_number: int, group_type: str, group_name: str
    ) -> "NATBatchBuilder":
        """Set destination rule source group."""
        path = self.mappers[self.mapper_key].get_destination_rule_source_group(
            rule_number, group_type, group_name
        )
        return self.add_set(path)

    def delete_destination_rule_source_group(
        self, rule_number: int, group_type: str
    ) -> "NATBatchBuilder":
        """Delete destination rule source group."""
        path = self.mappers[self.mapper_key].get_destination_rule_source_group_path(
            rule_number, group_type
        )
        return self.add_delete(path)

    def set_destination_rule_source_port(
        self, rule_number: int, port: str
    ) -> "NATBatchBuilder":
        """Set destination rule source port."""
        path = self.mappers[self.mapper_key].get_destination_rule_source_port(
            rule_number, port
        )
        return self.add_set(path)

    def delete_destination_rule_source_port(self, rule_number: int) -> "NATBatchBuilder":
        """Delete destination rule source port."""
        path = self.mappers[self.mapper_key].get_destination_rule_source_port_path(
            rule_number
        )
        return self.add_delete(path)

    def set_destination_rule_translation_address(
        self, rule_number: int, address: str
    ) -> "NATBatchBuilder":
        """Set destination rule translation address."""
        path = self.mappers[self.mapper_key].get_destination_rule_translation_address(
            rule_number, address
        )
        return self.add_set(path)

    def delete_destination_rule_translation_address(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete destination rule translation address."""
        path = self.mappers[self.mapper_key].get_destination_rule_translation_address_path(
            rule_number
        )
        return self.add_delete(path)

    def set_destination_rule_translation_port(
        self, rule_number: int, port: str
    ) -> "NATBatchBuilder":
        """Set destination rule translation port."""
        path = self.mappers[self.mapper_key].get_destination_rule_translation_port(
            rule_number, port
        )
        return self.add_set(path)

    def delete_destination_rule_translation_port(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete destination rule translation port."""
        path = self.mappers[self.mapper_key].get_destination_rule_translation_port_path(
            rule_number
        )
        return self.add_delete(path)

    def set_destination_rule_source_fqdn(
        self, rule_number: int, fqdn: str
    ) -> "NATBatchBuilder":
        """Set destination rule source FQDN."""
        path = self.mappers[self.mapper_key].get_destination_rule_source_fqdn(rule_number, fqdn)
        return self.add_set(path)

    def delete_destination_rule_source_fqdn(self, rule_number: int) -> "NATBatchBuilder":
        """Delete destination rule source FQDN."""
        path = self.mappers[self.mapper_key].get_destination_rule_source_fqdn_path(rule_number)
        return self.add_delete(path)

    def set_destination_rule_destination_fqdn(
        self, rule_number: int, fqdn: str
    ) -> "NATBatchBuilder":
        """Set destination rule destination FQDN."""
        path = self.mappers[self.mapper_key].get_destination_rule_destination_fqdn(rule_number, fqdn)
        return self.add_set(path)

    def delete_destination_rule_destination_fqdn(self, rule_number: int) -> "NATBatchBuilder":
        """Delete destination rule destination FQDN."""
        path = self.mappers[self.mapper_key].get_destination_rule_destination_fqdn_path(rule_number)
        return self.add_delete(path)

    def set_destination_rule_translation_options_address_mapping(
        self, rule_number: int, value: str
    ) -> "NATBatchBuilder":
        """Set destination rule translation options address-mapping."""
        path = self.mappers[self.mapper_key].get_destination_rule_translation_options_address_mapping(
            rule_number, value
        )
        return self.add_set(path)

    def delete_destination_rule_translation_options_address_mapping(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete destination rule translation options address-mapping."""
        path = self.mappers[self.mapper_key].get_destination_rule_translation_options_address_mapping_path(
            rule_number
        )
        return self.add_delete(path)

    def set_destination_rule_translation_redirect_port(
        self, rule_number: int, port: str
    ) -> "NATBatchBuilder":
        """Set destination rule translation redirect port."""
        path = self.mappers[self.mapper_key].get_destination_rule_translation_redirect_port(
            rule_number, port
        )
        return self.add_set(path)

    def delete_destination_rule_translation_redirect_port(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete destination rule translation redirect port."""
        path = self.mappers[self.mapper_key].get_destination_rule_translation_redirect_port_path(
            rule_number
        )
        return self.add_delete(path)

    def set_destination_rule_load_balance_backend_weight(
        self, rule_number: int, backend: str, weight: str
    ) -> "NATBatchBuilder":
        """Set destination rule load-balance backend weight."""
        path = self.mappers[self.mapper_key].get_destination_rule_load_balance_backend_weight(
            rule_number, backend, weight
        )
        return self.add_set(path)

    def delete_destination_rule_load_balance_backend_weight(
        self, rule_number: int, backend: str
    ) -> "NATBatchBuilder":
        """Delete destination rule load-balance backend weight."""
        path = self.mappers[self.mapper_key].get_destination_rule_load_balance_backend_weight_path(
            rule_number, backend
        )
        return self.add_delete(path)

    # ========================================================================
    # Static NAT Rule Operations
    # ========================================================================

    def set_static_rule(self, rule_number: int) -> "NATBatchBuilder":
        """Create static NAT rule."""
        path = self.mappers[self.mapper_key].get_static_rule(rule_number)
        return self.add_set(path)

    def delete_static_rule(self, rule_number: int) -> "NATBatchBuilder":
        """Delete static NAT rule."""
        path = self.mappers[self.mapper_key].get_static_rule(rule_number)
        return self.add_delete(path)

    def set_static_rule_description(
        self, rule_number: int, description: str
    ) -> "NATBatchBuilder":
        """Set static rule description."""
        path = self.mappers[self.mapper_key].get_static_rule_description(
            rule_number, description
        )
        return self.add_set(path)

    def delete_static_rule_description(self, rule_number: int) -> "NATBatchBuilder":
        """Delete static rule description."""
        path = self.mappers[self.mapper_key].get_static_rule_description_path(rule_number)
        return self.add_delete(path)

    def set_static_rule_log(self, rule_number: int) -> "NATBatchBuilder":
        """Set static rule log flag."""
        path = self.mappers[self.mapper_key].get_static_rule_log(rule_number)
        return self.add_set(path)

    def delete_static_rule_log(self, rule_number: int) -> "NATBatchBuilder":
        """Delete static rule log flag."""
        path = self.mappers[self.mapper_key].get_static_rule_log(rule_number)
        return self.add_delete(path)

    def set_static_rule_destination_address(
        self, rule_number: int, address: str
    ) -> "NATBatchBuilder":
        """Set static rule destination address."""
        path = self.mappers[self.mapper_key].get_static_rule_destination_address(
            rule_number, address
        )
        return self.add_set(path)

    def delete_static_rule_destination_address(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete static rule destination address."""
        path = self.mappers[self.mapper_key].get_static_rule_destination_address_path(
            rule_number
        )
        return self.add_delete(path)

    def set_static_rule_inbound_interface(
        self, rule_number: int, interface: str
    ) -> "NATBatchBuilder":
        """Set static rule inbound-interface."""
        path = self.mappers[self.mapper_key].get_static_rule_inbound_interface(
            rule_number, interface
        )
        return self.add_set(path)

    def delete_static_rule_inbound_interface(self, rule_number: int) -> "NATBatchBuilder":
        """Delete static rule inbound-interface."""
        path = self.mappers[self.mapper_key].get_static_rule_inbound_interface_path(
            rule_number
        )
        return self.add_delete(path)

    def set_static_rule_translation_address(
        self, rule_number: int, address: str
    ) -> "NATBatchBuilder":
        """Set static rule translation address."""
        path = self.mappers[self.mapper_key].get_static_rule_translation_address(
            rule_number, address
        )
        return self.add_set(path)

    def delete_static_rule_translation_address(
        self, rule_number: int
    ) -> "NATBatchBuilder":
        """Delete static rule translation address."""
        path = self.mappers[self.mapper_key].get_static_rule_translation_address_path(
            rule_number
        )
        return self.add_delete(path)

    # ========================================================================
    # CGNAT Operations (VyOS 1.5+)
    # ========================================================================

    def set_cgnat_log_allocation(self) -> "NATBatchBuilder":
        """Enable CGNAT log-allocation."""
        path = self.mappers[self.mapper_key].get_cgnat_log_allocation()
        return self.add_set(path)

    def delete_cgnat_log_allocation(self) -> "NATBatchBuilder":
        """Disable CGNAT log-allocation."""
        path = self.mappers[self.mapper_key].get_cgnat_log_allocation()
        return self.add_delete(path)

    # -- External Pool --

    def set_cgnat_pool_external(self, pool_name: str) -> "NATBatchBuilder":
        """Create CGNAT external pool."""
        path = self.mappers[self.mapper_key].get_cgnat_pool_external(pool_name)
        return self.add_set(path)

    def delete_cgnat_pool_external(self, pool_name: str) -> "NATBatchBuilder":
        """Delete CGNAT external pool."""
        path = self.mappers[self.mapper_key].get_cgnat_pool_external(pool_name)
        return self.add_delete(path)

    def set_cgnat_pool_external_port_range(
        self, pool_name: str, port_range: str
    ) -> "NATBatchBuilder":
        """Set CGNAT external pool external-port-range."""
        path = self.mappers[self.mapper_key].get_cgnat_pool_external_port_range(pool_name, port_range)
        return self.add_set(path)

    def delete_cgnat_pool_external_port_range(self, pool_name: str) -> "NATBatchBuilder":
        """Delete CGNAT external pool external-port-range."""
        path = self.mappers[self.mapper_key].get_cgnat_pool_external_port_range_path(pool_name)
        return self.add_delete(path)

    def set_cgnat_pool_external_per_user_limit_port(
        self, pool_name: str, port: str
    ) -> "NATBatchBuilder":
        """Set CGNAT external pool per-user-limit port."""
        path = self.mappers[self.mapper_key].get_cgnat_pool_external_per_user_limit_port(pool_name, port)
        return self.add_set(path)

    def delete_cgnat_pool_external_per_user_limit_port(self, pool_name: str) -> "NATBatchBuilder":
        """Delete CGNAT external pool per-user-limit port."""
        path = self.mappers[self.mapper_key].get_cgnat_pool_external_per_user_limit_port_path(pool_name)
        return self.add_delete(path)

    def set_cgnat_pool_external_range(
        self, pool_name: str, ip_range: str
    ) -> "NATBatchBuilder":
        """Add CGNAT external pool range."""
        path = self.mappers[self.mapper_key].get_cgnat_pool_external_range(pool_name, ip_range)
        return self.add_set(path)

    def delete_cgnat_pool_external_range(
        self, pool_name: str, ip_range: str
    ) -> "NATBatchBuilder":
        """Delete CGNAT external pool range."""
        path = self.mappers[self.mapper_key].get_cgnat_pool_external_range(pool_name, ip_range)
        return self.add_delete(path)

    def set_cgnat_pool_external_range_seq(
        self, pool_name: str, ip_range: str, seq: str
    ) -> "NATBatchBuilder":
        """Set CGNAT external pool range sequence."""
        path = self.mappers[self.mapper_key].get_cgnat_pool_external_range_seq(pool_name, ip_range, seq)
        return self.add_set(path)

    def delete_cgnat_pool_external_range_seq(
        self, pool_name: str, ip_range: str
    ) -> "NATBatchBuilder":
        """Delete CGNAT external pool range sequence."""
        path = self.mappers[self.mapper_key].get_cgnat_pool_external_range_seq_path(pool_name, ip_range)
        return self.add_delete(path)

    # -- Internal Pool --

    def set_cgnat_pool_internal(self, pool_name: str) -> "NATBatchBuilder":
        """Create CGNAT internal pool."""
        path = self.mappers[self.mapper_key].get_cgnat_pool_internal(pool_name)
        return self.add_set(path)

    def delete_cgnat_pool_internal(self, pool_name: str) -> "NATBatchBuilder":
        """Delete CGNAT internal pool."""
        path = self.mappers[self.mapper_key].get_cgnat_pool_internal(pool_name)
        return self.add_delete(path)

    def set_cgnat_pool_internal_range(
        self, pool_name: str, ip_range: str
    ) -> "NATBatchBuilder":
        """Add CGNAT internal pool range."""
        path = self.mappers[self.mapper_key].get_cgnat_pool_internal_range(pool_name, ip_range)
        return self.add_set(path)

    def delete_cgnat_pool_internal_range(
        self, pool_name: str, ip_range: str
    ) -> "NATBatchBuilder":
        """Delete CGNAT internal pool range."""
        path = self.mappers[self.mapper_key].get_cgnat_pool_internal_range(pool_name, ip_range)
        return self.add_delete(path)

    # -- CGNAT Rules --

    def set_cgnat_rule(self, rule_number: int) -> "NATBatchBuilder":
        """Create CGNAT rule."""
        path = self.mappers[self.mapper_key].get_cgnat_rule(rule_number)
        return self.add_set(path)

    def delete_cgnat_rule(self, rule_number: int) -> "NATBatchBuilder":
        """Delete CGNAT rule."""
        path = self.mappers[self.mapper_key].get_cgnat_rule(rule_number)
        return self.add_delete(path)

    def set_cgnat_rule_source_pool(
        self, rule_number: int, pool_name: str
    ) -> "NATBatchBuilder":
        """Set CGNAT rule source pool."""
        path = self.mappers[self.mapper_key].get_cgnat_rule_source_pool(rule_number, pool_name)
        return self.add_set(path)

    def delete_cgnat_rule_source_pool(self, rule_number: int) -> "NATBatchBuilder":
        """Delete CGNAT rule source pool."""
        path = self.mappers[self.mapper_key].get_cgnat_rule_source_pool_path(rule_number)
        return self.add_delete(path)

    def set_cgnat_rule_translation_pool(
        self, rule_number: int, pool_name: str
    ) -> "NATBatchBuilder":
        """Set CGNAT rule translation pool."""
        path = self.mappers[self.mapper_key].get_cgnat_rule_translation_pool(rule_number, pool_name)
        return self.add_set(path)

    def delete_cgnat_rule_translation_pool(self, rule_number: int) -> "NATBatchBuilder":
        """Delete CGNAT rule translation pool."""
        path = self.mappers[self.mapper_key].get_cgnat_rule_translation_pool_path(rule_number)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        is_v15 = "1.5" in self.version

        return {
            "version": self.version,
            "version_info": {
                "is_1_4": "1.4" in self.version,
                "is_1_5": is_v15,
            },
            "nat_types": {
                "source": {
                    "supported": True,
                    "description": "Source NAT (SNAT) and Masquerade"
                },
                "destination": {
                    "supported": True,
                    "description": "Destination NAT (DNAT) for port forwarding"
                },
                "static": {
                    "supported": True,
                    "description": "Static 1:1 NAT mapping"
                },
                "cgnat": {
                    "supported": is_v15,
                    "description": "Carrier-grade NAT (CGNAT) - VyOS 1.5+ only"
                }
            },
            "features": {
                "fqdn": {"supported": is_v15, "description": "FQDN-based matching for source/destination"},
                "cgnat": {"supported": is_v15, "description": "Carrier-grade NAT with internal/external pools"},
                "translation_options": {"supported": True, "description": "Translation address-mapping and port-mapping options"},
                "translation_redirect": {"supported": True, "description": "Destination NAT redirect port"},
                "load_balance_weight": {"supported": True, "description": "Backend weight for load balancing"},
                "static_log": {"supported": True, "description": "Logging for static NAT rules"},
            },
            "operations": {
                "source_nat": [
                    "set_source_rule",
                    "delete_source_rule",
                    "set_source_rule_packet_type",
                    "delete_source_rule_packet_type",
                    "set_source_rule_description",
                    "delete_source_rule_description",
                    "set_source_rule_destination_address",
                    "delete_source_rule_destination_address",
                    "set_source_rule_destination_fqdn",
                    "delete_source_rule_destination_fqdn",
                    "set_source_rule_destination_group",
                    "delete_source_rule_destination_group",
                    "set_source_rule_destination_port",
                    "delete_source_rule_destination_port",
                    "set_source_rule_disable",
                    "delete_source_rule_disable",
                    "set_source_rule_exclude",
                    "delete_source_rule_exclude",
                    "set_source_rule_load_balance_hash",
                    "delete_source_rule_load_balance_hash",
                    "set_source_rule_load_balance_backend",
                    "delete_source_rule_load_balance_backend",
                    "set_source_rule_load_balance_backend_weight",
                    "delete_source_rule_load_balance_backend_weight",
                    "set_source_rule_log",
                    "delete_source_rule_log",
                    "set_source_rule_outbound_interface_name",
                    "delete_source_rule_outbound_interface_name",
                    "set_source_rule_outbound_interface_group",
                    "delete_source_rule_outbound_interface_group",
                    "set_source_rule_protocol",
                    "delete_source_rule_protocol",
                    "set_source_rule_source_address",
                    "delete_source_rule_source_address",
                    "set_source_rule_source_fqdn",
                    "delete_source_rule_source_fqdn",
                    "set_source_rule_source_group",
                    "delete_source_rule_source_group",
                    "set_source_rule_source_port",
                    "delete_source_rule_source_port",
                    "set_source_rule_translation_address",
                    "delete_source_rule_translation_address",
                    "set_source_rule_translation_port",
                    "delete_source_rule_translation_port",
                    "set_source_rule_translation_options_address_mapping",
                    "delete_source_rule_translation_options_address_mapping",
                    "set_source_rule_translation_options_port_mapping",
                    "delete_source_rule_translation_options_port_mapping",
                ],
                "destination_nat": [
                    "set_destination_rule",
                    "delete_destination_rule",
                    "set_destination_rule_packet_type",
                    "delete_destination_rule_packet_type",
                    "set_destination_rule_description",
                    "delete_destination_rule_description",
                    "set_destination_rule_destination_address",
                    "delete_destination_rule_destination_address",
                    "set_destination_rule_destination_fqdn",
                    "delete_destination_rule_destination_fqdn",
                    "set_destination_rule_destination_group",
                    "delete_destination_rule_destination_group",
                    "set_destination_rule_destination_port",
                    "delete_destination_rule_destination_port",
                    "set_destination_rule_disable",
                    "delete_destination_rule_disable",
                    "set_destination_rule_exclude",
                    "delete_destination_rule_exclude",
                    "set_destination_rule_load_balance_hash",
                    "delete_destination_rule_load_balance_hash",
                    "set_destination_rule_load_balance_backend",
                    "delete_destination_rule_load_balance_backend",
                    "set_destination_rule_load_balance_backend_weight",
                    "delete_destination_rule_load_balance_backend_weight",
                    "set_destination_rule_log",
                    "delete_destination_rule_log",
                    "set_destination_rule_inbound_interface_name",
                    "delete_destination_rule_inbound_interface_name",
                    "set_destination_rule_inbound_interface_group",
                    "delete_destination_rule_inbound_interface_group",
                    "set_destination_rule_protocol",
                    "delete_destination_rule_protocol",
                    "set_destination_rule_source_address",
                    "delete_destination_rule_source_address",
                    "set_destination_rule_source_fqdn",
                    "delete_destination_rule_source_fqdn",
                    "set_destination_rule_source_group",
                    "delete_destination_rule_source_group",
                    "set_destination_rule_source_port",
                    "delete_destination_rule_source_port",
                    "set_destination_rule_translation_address",
                    "delete_destination_rule_translation_address",
                    "set_destination_rule_translation_port",
                    "delete_destination_rule_translation_port",
                    "set_destination_rule_translation_options_address_mapping",
                    "delete_destination_rule_translation_options_address_mapping",
                    "set_destination_rule_translation_redirect_port",
                    "delete_destination_rule_translation_redirect_port",
                ],
                "static_nat": [
                    "set_static_rule",
                    "delete_static_rule",
                    "set_static_rule_description",
                    "delete_static_rule_description",
                    "set_static_rule_destination_address",
                    "delete_static_rule_destination_address",
                    "set_static_rule_inbound_interface",
                    "delete_static_rule_inbound_interface",
                    "set_static_rule_log",
                    "delete_static_rule_log",
                    "set_static_rule_translation_address",
                    "delete_static_rule_translation_address",
                ],
                "cgnat": [
                    "set_cgnat_log_allocation",
                    "delete_cgnat_log_allocation",
                    "set_cgnat_pool_external",
                    "delete_cgnat_pool_external",
                    "set_cgnat_pool_external_port_range",
                    "delete_cgnat_pool_external_port_range",
                    "set_cgnat_pool_external_per_user_limit_port",
                    "delete_cgnat_pool_external_per_user_limit_port",
                    "set_cgnat_pool_external_range",
                    "delete_cgnat_pool_external_range",
                    "set_cgnat_pool_external_range_seq",
                    "delete_cgnat_pool_external_range_seq",
                    "set_cgnat_pool_internal",
                    "delete_cgnat_pool_internal",
                    "set_cgnat_pool_internal_range",
                    "delete_cgnat_pool_internal_range",
                    "set_cgnat_rule",
                    "delete_cgnat_rule",
                    "set_cgnat_rule_source_pool",
                    "delete_cgnat_rule_source_pool",
                    "set_cgnat_rule_translation_pool",
                    "delete_cgnat_rule_translation_pool",
                ] if is_v15 else []
            }
        }
