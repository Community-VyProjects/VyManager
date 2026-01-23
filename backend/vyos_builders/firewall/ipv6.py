"""
Firewall IPv6 Batch Builder

Provides all batch operations for IPv6 firewall rules.
Handles both base chains (forward, input, output) and custom named chains.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class FirewallIPv6BatchBuilder:
    """Complete batch builder for IPv6 firewall operations"""

    def __init__(self, version: str):
        """Initialize firewall IPv6 batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get firewall IPv6 mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "firewall_ipv6"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "FirewallIPv6BatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "FirewallIPv6BatchBuilder":
        """Add a 'delete' operation to the batch."""
        if path:
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
    # Base Chain Rule Operations
    # ========================================================================

    def set_base_chain_rule(self, chain: str, rule_number: int) -> "FirewallIPv6BatchBuilder":
        """Create a rule in a base chain (forward, input, output)."""
        path = self.mappers[self.mapper_key].get_base_chain_rule(chain, rule_number)
        return self.add_set(path)

    def delete_base_chain_rule(self, chain: str, rule_number: int) -> "FirewallIPv6BatchBuilder":
        """Delete a rule from a base chain."""
        path = self.mappers[self.mapper_key].get_base_chain_rule_path(chain, rule_number)
        return self.add_delete(path)

    def set_base_chain_default_action(self, chain: str, action: str) -> "FirewallIPv6BatchBuilder":
        """Set default action for a base chain."""
        path = self.mappers[self.mapper_key].get_base_chain_default_action(chain, action)
        return self.add_set(path)

    def delete_base_chain_default_action(self, chain: str) -> "FirewallIPv6BatchBuilder":
        """Delete default action from a base chain."""
        path = self.mappers[self.mapper_key].get_base_chain_default_action_path(chain)
        return self.add_delete(path)

    # ========================================================================
    # Custom Chain Operations
    # ========================================================================

    def set_custom_chain(self, chain_name: str) -> "FirewallIPv6BatchBuilder":
        """Create a custom named chain."""
        path = self.mappers[self.mapper_key].get_custom_chain(chain_name)
        return self.add_set(path)

    def delete_custom_chain(self, chain_name: str) -> "FirewallIPv6BatchBuilder":
        """Delete a custom named chain."""
        path = self.mappers[self.mapper_key].get_custom_chain_path(chain_name)
        return self.add_delete(path)

    def set_custom_chain_description(self, chain_name: str, description: str) -> "FirewallIPv6BatchBuilder":
        """Set description for a custom chain."""
        path = self.mappers[self.mapper_key].get_custom_chain_description(chain_name, description)
        return self.add_set(path)

    def delete_custom_chain_description(self, chain_name: str) -> "FirewallIPv6BatchBuilder":
        """Delete description from a custom chain."""
        path = self.mappers[self.mapper_key].get_custom_chain_description_path(chain_name)
        return self.add_delete(path)

    def set_custom_chain_default_action(self, chain_name: str, action: str) -> "FirewallIPv6BatchBuilder":
        """Set default action for a custom chain."""
        path = self.mappers[self.mapper_key].get_custom_chain_default_action(chain_name, action)
        return self.add_set(path)

    def delete_custom_chain_default_action(self, chain_name: str) -> "FirewallIPv6BatchBuilder":
        """Delete default action from a custom chain."""
        path = self.mappers[self.mapper_key].get_custom_chain_default_action_path(chain_name)
        return self.add_delete(path)

    def set_custom_chain_rule(self, chain_name: str, rule_number: int) -> "FirewallIPv6BatchBuilder":
        """Create a rule in a custom chain."""
        path = self.mappers[self.mapper_key].get_custom_chain_rule(chain_name, rule_number)
        return self.add_set(path)

    def delete_custom_chain_rule(self, chain_name: str, rule_number: int) -> "FirewallIPv6BatchBuilder":
        """Delete a rule from a custom chain."""
        path = self.mappers[self.mapper_key].get_custom_chain_rule_path(chain_name, rule_number)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Common
    # ========================================================================

    def set_rule_description(self, chain: str, rule_number: int, description: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set rule description."""
        path = self.mappers[self.mapper_key].get_rule_description(chain, rule_number, description, is_custom)
        return self.add_set(path)

    def delete_rule_description(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete rule description."""
        path = self.mappers[self.mapper_key].get_rule_description_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_action(self, chain: str, rule_number: int, action: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set rule action (accept, drop, reject, continue, return, jump, queue, synproxy)."""
        path = self.mappers[self.mapper_key].get_rule_action(chain, rule_number, action, is_custom)
        return self.add_set(path)

    def delete_rule_action(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete rule action."""
        path = self.mappers[self.mapper_key].get_rule_action_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_disable(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Disable a rule."""
        path = self.mappers[self.mapper_key].get_rule_disable(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_disable(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable a rule (remove disable flag)."""
        path = self.mappers[self.mapper_key].get_rule_disable_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_log(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable logging for a rule."""
        path = self.mappers[self.mapper_key].get_rule_log(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_log(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Disable logging for a rule."""
        path = self.mappers[self.mapper_key].get_rule_log_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_protocol(self, chain: str, rule_number: int, protocol: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set rule protocol."""
        path = self.mappers[self.mapper_key].get_rule_protocol(chain, rule_number, protocol, is_custom)
        return self.add_set(path)

    def delete_rule_protocol(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete rule protocol."""
        path = self.mappers[self.mapper_key].get_rule_protocol_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Source
    # ========================================================================

    def set_rule_source_address(self, chain: str, rule_number: int, address: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source address."""
        path = self.mappers[self.mapper_key].get_rule_source_address(chain, rule_number, address, is_custom)
        return self.add_set(path)

    def delete_rule_source_address(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source address."""
        path = self.mappers[self.mapper_key].get_rule_source_address_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_source_port(self, chain: str, rule_number: int, port: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source port."""
        path = self.mappers[self.mapper_key].get_rule_source_port(chain, rule_number, port, is_custom)
        return self.add_set(path)

    def delete_rule_source_port(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source port."""
        path = self.mappers[self.mapper_key].get_rule_source_port_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_source_mac_address(self, chain: str, rule_number: int, mac_address: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source MAC address."""
        path = self.mappers[self.mapper_key].get_rule_source_mac_address(chain, rule_number, mac_address, is_custom)
        return self.add_set(path)

    def delete_rule_source_mac_address(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source MAC address."""
        path = self.mappers[self.mapper_key].get_rule_source_mac_address_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_source_geoip_country(self, chain: str, rule_number: int, country_code: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source GeoIP country code."""
        path = self.mappers[self.mapper_key].get_rule_source_geoip_country(chain, rule_number, country_code, is_custom)
        return self.add_set(path)

    def delete_rule_source_geoip_country(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source GeoIP country code."""
        path = self.mappers[self.mapper_key].get_rule_source_geoip_country_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_source_geoip_inverse(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable source GeoIP inverse match."""
        path = self.mappers[self.mapper_key].get_rule_source_geoip_inverse(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_source_geoip_inverse(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source GeoIP inverse match."""
        path = self.mappers[self.mapper_key].get_rule_source_geoip_inverse_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_source_geoip(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete the entire source GeoIP node (used when removing the last country)."""
        path = self.mappers[self.mapper_key].get_rule_source_geoip_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_source(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete the entire source node (used when switching to 'any')."""
        path = self.mappers[self.mapper_key].get_rule_source_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_source_group_address(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source address group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_address(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_source_group_address(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source address group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_address_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_source_group_network(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source network group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_network(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_source_group_network(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source network group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_network_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_source_group_port(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source port group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_port(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_source_group_port(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source port group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_port_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_source_mac(self, chain: str, rule_number: int, mac: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source MAC address."""
        path = self.mappers[self.mapper_key].get_rule_source_mac(chain, rule_number, mac, is_custom)
        return self.add_set(path)

    def delete_rule_source_mac(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source MAC address."""
        path = self.mappers[self.mapper_key].get_rule_source_mac_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Destination
    # ========================================================================

    def set_rule_destination_address(self, chain: str, rule_number: int, address: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set destination address."""
        path = self.mappers[self.mapper_key].get_rule_destination_address(chain, rule_number, address, is_custom)
        return self.add_set(path)

    def delete_rule_destination_address(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination address."""
        path = self.mappers[self.mapper_key].get_rule_destination_address_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_destination_port(self, chain: str, rule_number: int, port: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set destination port."""
        path = self.mappers[self.mapper_key].get_rule_destination_port(chain, rule_number, port, is_custom)
        return self.add_set(path)

    def delete_rule_destination_port(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination port."""
        path = self.mappers[self.mapper_key].get_rule_destination_port_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_destination_geoip_country(self, chain: str, rule_number: int, country_code: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set destination GeoIP country code."""
        path = self.mappers[self.mapper_key].get_rule_destination_geoip_country(chain, rule_number, country_code, is_custom)
        return self.add_set(path)

    def delete_rule_destination_geoip_country(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination GeoIP country code."""
        path = self.mappers[self.mapper_key].get_rule_destination_geoip_country_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_destination_geoip_inverse(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable destination GeoIP inverse match."""
        path = self.mappers[self.mapper_key].get_rule_destination_geoip_inverse(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_destination_geoip_inverse(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination GeoIP inverse match."""
        path = self.mappers[self.mapper_key].get_rule_destination_geoip_inverse_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_destination_geoip(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete the entire destination GeoIP node (used when removing the last country)."""
        path = self.mappers[self.mapper_key].get_rule_destination_geoip_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_destination(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete the entire destination node (used when switching to 'any')."""
        path = self.mappers[self.mapper_key].get_rule_destination_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_destination_group_address(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set destination address group."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_address(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_destination_group_address(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination address group."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_address_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_destination_group_network(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set destination network group."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_network(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_destination_group_network(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination network group."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_network_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_destination_group_port(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set destination port group."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_port(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_destination_group_port(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination port group."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_port_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_source_group_mac(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source MAC group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_mac(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_source_group_mac(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source MAC group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_mac_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_destination_group_mac(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set destination MAC group."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_mac(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_destination_group_mac(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination MAC group."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_mac_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_source_group_domain(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source domain group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_domain(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_source_group_domain(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source domain group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_domain_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_destination_group_domain(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set destination domain group."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_domain(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_destination_group_domain(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination domain group."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_domain_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_source_group_remote(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source remote group (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_source_group_remote(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_source_group_remote(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source remote group (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_source_group_remote_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_destination_group_remote(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set destination remote group (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_remote(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_destination_group_remote(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination remote group (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_remote_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - State
    # ========================================================================

    def set_rule_state_established(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable established state matching."""
        path = self.mappers[self.mapper_key].get_rule_state_established(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_state_established(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Disable established state matching."""
        path = self.mappers[self.mapper_key].get_rule_state_established_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_state_new(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable new state matching."""
        path = self.mappers[self.mapper_key].get_rule_state_new(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_state_new(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Disable new state matching."""
        path = self.mappers[self.mapper_key].get_rule_state_new_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_state_related(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable related state matching."""
        path = self.mappers[self.mapper_key].get_rule_state_related(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_state_related(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Disable related state matching."""
        path = self.mappers[self.mapper_key].get_rule_state_related_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_state_invalid(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable invalid state matching."""
        path = self.mappers[self.mapper_key].get_rule_state_invalid(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_state_invalid(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Disable invalid state matching."""
        path = self.mappers[self.mapper_key].get_rule_state_invalid_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Interface
    # ========================================================================

    def set_rule_inbound_interface(self, chain: str, rule_number: int, interface: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set inbound interface."""
        path = self.mappers[self.mapper_key].get_rule_inbound_interface(chain, rule_number, interface, is_custom)
        return self.add_set(path)

    def delete_rule_inbound_interface(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete inbound interface."""
        path = self.mappers[self.mapper_key].get_rule_inbound_interface_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_outbound_interface(self, chain: str, rule_number: int, interface: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set outbound interface."""
        path = self.mappers[self.mapper_key].get_rule_outbound_interface(chain, rule_number, interface, is_custom)
        return self.add_set(path)

    def delete_rule_outbound_interface(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete outbound interface."""
        path = self.mappers[self.mapper_key].get_rule_outbound_interface_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Packet Modifications
    # ========================================================================

    def set_rule_set_dscp(self, chain: str, rule_number: int, dscp: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set DSCP value."""
        path = self.mappers[self.mapper_key].get_rule_set_dscp(chain, rule_number, dscp, is_custom)
        return self.add_set(path)

    def delete_rule_set_dscp(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete DSCP value."""
        path = self.mappers[self.mapper_key].get_rule_set_dscp_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_set_mark(self, chain: str, rule_number: int, mark: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set packet mark."""
        path = self.mappers[self.mapper_key].get_rule_set_mark(chain, rule_number, mark, is_custom)
        return self.add_set(path)

    def delete_rule_set_mark(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete packet mark."""
        path = self.mappers[self.mapper_key].get_rule_set_mark_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_set_hop_limit(self, chain: str, rule_number: int, hop_limit: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set hop-limit value (IPv6 equivalent of TTL)."""
        path = self.mappers[self.mapper_key].get_rule_set_hop_limit(chain, rule_number, hop_limit, is_custom)
        return self.add_set(path)

    def delete_rule_set_hop_limit(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete hop-limit value."""
        path = self.mappers[self.mapper_key].get_rule_set_hop_limit_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - TCP Flags
    # ========================================================================

    def set_rule_tcp_flags(self, chain: str, rule_number: int, flag: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set TCP flags."""
        path = self.mappers[self.mapper_key].get_rule_tcp_flags(chain, rule_number, flag, is_custom)
        return self.add_set(path)

    def delete_rule_tcp_flags(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete TCP flags."""
        path = self.mappers[self.mapper_key].get_rule_tcp_flags_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - ICMPv6
    # ========================================================================

    def set_rule_icmpv6_type_name(self, chain: str, rule_number: int, icmpv6_type: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set ICMPv6 type name."""
        path = self.mappers[self.mapper_key].get_rule_icmpv6_type_name(chain, rule_number, icmpv6_type, is_custom)
        return self.add_set(path)

    def delete_rule_icmpv6_type_name(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete ICMPv6 type name."""
        path = self.mappers[self.mapper_key].get_rule_icmpv6_type_name_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Jump Target
    # ========================================================================

    def set_rule_jump_target(self, chain: str, rule_number: int, target: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set jump target (for jump action)."""
        path = self.mappers[self.mapper_key].get_rule_jump_target(chain, rule_number, target, is_custom)
        return self.add_set(path)

    def delete_rule_jump_target(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete jump target."""
        path = self.mappers[self.mapper_key].get_rule_jump_target_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """
        Get capabilities for the current VyOS version.

        Returns feature flags indicating which operations are supported.
        """
        # Check if version supports remote-group (VyOS 1.5+)
        supports_remote_group = "1.5" in self.version or "latest" in self.version

        return {
            "version": self.version,
            "features": {
                "base_chains": {
                    "supported": True,
                    "description": "Forward, input, and output chains",
                },
                "custom_chains": {
                    "supported": True,
                    "description": "Custom named chains",
                },
                "basic_matching": {
                    "supported": True,
                    "description": "Source/destination IPv6 address, port, protocol matching",
                },
                "firewall_groups": {
                    "supported": True,
                    "description": "Address, network, and port group references",
                },
                "remote_group": {
                    "supported": supports_remote_group,
                    "description": "Remote group support (VyOS 1.5+ only)",
                },
                "connection_state": {
                    "supported": True,
                    "description": "Connection tracking (established, new, related, invalid)",
                },
                "tcp_flags": {
                    "supported": True,
                    "description": "TCP flag matching (syn, ack, fin, rst, etc.)",
                },
                "packet_modifications": {
                    "supported": True,
                    "description": "Set DSCP, mark, hop-limit",
                },
                "icmpv6_matching": {
                    "supported": True,
                    "description": "ICMPv6 type matching",
                },
                "interface_matching": {
                    "supported": True,
                    "description": "Inbound/outbound interface matching",
                },
                "mac_matching": {
                    "supported": True,
                    "description": "Source MAC address matching",
                },
                "jump_action": {
                    "supported": True,
                    "description": "Jump to custom chains",
                },
            },
            "actions": [
                "accept",
                "drop",
                "reject",
                "continue",
                "return",
                "jump",
                "queue",
                "synproxy"
            ],
            "states": [
                "established",
                "new",
                "related",
                "invalid"
            ],
            "tcp_flags": [
                "syn",
                "ack",
                "fin",
                "rst",
                "psh",
                "urg",
                "ecn",
                "cwr"
            ],
        }
