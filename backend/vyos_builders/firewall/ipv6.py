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

    def delete_rule_source_group(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire source group node."""
        path = self.mappers[self.mapper_key].get_rule_source_group_path(chain, rule_number, is_custom)
        return self.add_delete(path)

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

    def set_rule_source_group_mac(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source MAC group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_mac(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_source_group_mac(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source MAC group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_mac_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_source_group_domain(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source domain group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_domain(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_source_group_domain(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source domain group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_domain_path(chain, rule_number, is_custom)
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

    def delete_rule_destination_group(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire destination group node."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_path(chain, rule_number, is_custom)
        return self.add_delete(path)

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

    def set_rule_destination_group_mac(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set destination MAC group."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_mac(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_destination_group_mac(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination MAC group."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_mac_path(chain, rule_number, is_custom)
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
        """Set hop-limit value."""
        path = self.mappers[self.mapper_key].get_rule_set_hop_limit(chain, rule_number, ttl, is_custom)
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
    # Rule Properties - ICMP
    # ========================================================================

    def set_rule_icmpv6_type_name(self, chain: str, rule_number: int, icmpv6_type: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set ICMPv6 type name."""
        path = self.mappers[self.mapper_key].get_rule_icmpv6_type_name(chain, rule_number, icmp_type, is_custom)
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
    # Rule Properties - Offload Target (Flowtables)
    # ========================================================================

    def set_rule_offload_target(self, chain: str, rule_number: int, target: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set offload target (flowtable) for the rule."""
        path = self.mappers[self.mapper_key].get_rule_offload_target(chain, rule_number, target, is_custom)
        return self.add_set(path)

    def delete_rule_offload_target(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete offload target."""
        path = self.mappers[self.mapper_key].get_rule_offload_target_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Base Chain Description & Default-Log
    # ========================================================================

    def set_base_chain_description(self, chain: str, description: str) -> "FirewallIPv6BatchBuilder":
        """Set base chain description."""
        path = self.mappers[self.mapper_key].get_base_chain_description(chain, description)
        return self.add_set(path)

    def delete_base_chain_description(self, chain: str) -> "FirewallIPv6BatchBuilder":
        """Delete base chain description."""
        path = self.mappers[self.mapper_key].get_base_chain_description_path(chain)
        return self.add_delete(path)

    def set_base_chain_default_log(self, chain: str) -> "FirewallIPv6BatchBuilder":
        """Enable default logging for a base chain."""
        path = self.mappers[self.mapper_key].get_base_chain_default_log(chain)
        return self.add_set(path)

    def delete_base_chain_default_log(self, chain: str) -> "FirewallIPv6BatchBuilder":
        """Delete default logging for a base chain."""
        path = self.mappers[self.mapper_key].get_base_chain_default_log_path(chain)
        return self.add_delete(path)

    # ========================================================================
    # Custom Chain Default-Log & Default-Jump-Target
    # ========================================================================

    def set_custom_chain_default_log(self, chain_name: str) -> "FirewallIPv6BatchBuilder":
        """Enable default logging for a custom chain."""
        path = self.mappers[self.mapper_key].get_custom_chain_default_log(chain_name)
        return self.add_set(path)

    def delete_custom_chain_default_log(self, chain_name: str) -> "FirewallIPv6BatchBuilder":
        """Delete default logging for a custom chain."""
        path = self.mappers[self.mapper_key].get_custom_chain_default_log_path(chain_name)
        return self.add_delete(path)

    def set_custom_chain_default_jump_target(self, chain_name: str, target: str) -> "FirewallIPv6BatchBuilder":
        """Set default jump target for a custom chain."""
        path = self.mappers[self.mapper_key].get_custom_chain_default_jump_target(chain_name, target)
        return self.add_set(path)

    def delete_custom_chain_default_jump_target(self, chain_name: str) -> "FirewallIPv6BatchBuilder":
        """Delete default jump target for a custom chain."""
        path = self.mappers[self.mapper_key].get_custom_chain_default_jump_target_path(chain_name)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Connection Mark (match)
    # ========================================================================

    def set_rule_connection_mark(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set connection mark match."""
        path = self.mappers[self.mapper_key].get_rule_connection_mark(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_connection_mark(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete connection mark match."""
        path = self.mappers[self.mapper_key].get_rule_connection_mark_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Connection Status
    # ========================================================================

    def set_rule_connection_status_nat(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set connection status NAT."""
        path = self.mappers[self.mapper_key].get_rule_connection_status_nat(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_connection_status_nat(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete connection status NAT."""
        path = self.mappers[self.mapper_key].get_rule_connection_status_nat_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Conntrack Helper
    # ========================================================================

    def set_rule_conntrack_helper(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set conntrack helper."""
        path = self.mappers[self.mapper_key].get_rule_conntrack_helper(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_conntrack_helper(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete conntrack helper."""
        path = self.mappers[self.mapper_key].get_rule_conntrack_helper_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - DSCP Match
    # ========================================================================

    def set_rule_dscp(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set DSCP match value."""
        path = self.mappers[self.mapper_key].get_rule_dscp(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_dscp(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete DSCP match value."""
        path = self.mappers[self.mapper_key].get_rule_dscp_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - DSCP Exclude
    # ========================================================================

    def set_rule_dscp_exclude(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set DSCP exclude value."""
        path = self.mappers[self.mapper_key].get_rule_dscp_exclude(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_dscp_exclude(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete DSCP exclude value."""
        path = self.mappers[self.mapper_key].get_rule_dscp_exclude_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Fragment
    # ========================================================================

    def set_rule_fragment_match_frag(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable fragment match."""
        path = self.mappers[self.mapper_key].get_rule_fragment_match_frag(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_fragment_match_frag(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete fragment match."""
        path = self.mappers[self.mapper_key].get_rule_fragment_match_frag_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_fragment_match_non_frag(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable non-fragment match."""
        path = self.mappers[self.mapper_key].get_rule_fragment_match_non_frag(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_fragment_match_non_frag(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete non-fragment match."""
        path = self.mappers[self.mapper_key].get_rule_fragment_match_non_frag_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_fragment(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire fragment node."""
        path = self.mappers[self.mapper_key].get_rule_fragment_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - ICMP Code & Type
    # ========================================================================

    def set_rule_icmpv6_code(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set ICMPv6 code."""
        path = self.mappers[self.mapper_key].get_rule_icmpv6_code(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_icmpv6_code(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete ICMPv6 code."""
        path = self.mappers[self.mapper_key].get_rule_icmpv6_code_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_icmpv6_type(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set ICMP type."""
        path = self.mappers[self.mapper_key].get_rule_icmpv6_type(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_icmpv6_type(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete ICMP type."""
        path = self.mappers[self.mapper_key].get_rule_icmpv6_type_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Interface Groups
    # ========================================================================

    def set_rule_inbound_interface_group(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set inbound interface group."""
        path = self.mappers[self.mapper_key].get_rule_inbound_interface_group(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_inbound_interface_group(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete inbound interface group."""
        path = self.mappers[self.mapper_key].get_rule_inbound_interface_group_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_outbound_interface_group(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set outbound interface group."""
        path = self.mappers[self.mapper_key].get_rule_outbound_interface_group(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_outbound_interface_group(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete outbound interface group."""
        path = self.mappers[self.mapper_key].get_rule_outbound_interface_group_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - IPsec
    # ========================================================================

    def set_rule_ipsec_match_ipsec(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable IPsec match."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_ipsec(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_ipsec_match_ipsec(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete IPsec match."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_ipsec_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_ipsec_match_none(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable IPsec none match."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_none(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_ipsec_match_none(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete IPsec none match."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_none_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_ipsec(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire IPsec node."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - IPsec Directional (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_ipsec_match_ipsec_in(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable IPsec inbound match (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_ipsec_in(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_ipsec_match_ipsec_in(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete IPsec inbound match (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_ipsec_in_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_ipsec_match_ipsec_out(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable IPsec outbound match (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_ipsec_out(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_ipsec_match_ipsec_out(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete IPsec outbound match (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_ipsec_out_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_ipsec_match_none_in(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable IPsec none inbound match (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_none_in(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_ipsec_match_none_in(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete IPsec none inbound match (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_none_in_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_ipsec_match_none_out(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable IPsec none outbound match (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_none_out(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_ipsec_match_none_out(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete IPsec none outbound match (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_ipsec_match_none_out_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Limit
    # ========================================================================

    def set_rule_limit_rate(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set rate limit."""
        path = self.mappers[self.mapper_key].get_rule_limit_rate(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_limit_rate(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete rate limit."""
        path = self.mappers[self.mapper_key].get_rule_limit_rate_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_limit_burst(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set limit burst."""
        path = self.mappers[self.mapper_key].get_rule_limit_burst(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_limit_burst(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete limit burst."""
        path = self.mappers[self.mapper_key].get_rule_limit_burst_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_limit(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire limit node."""
        path = self.mappers[self.mapper_key].get_rule_limit_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Log Options
    # ========================================================================

    def set_rule_log_options_group(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set log options group."""
        path = self.mappers[self.mapper_key].get_rule_log_options_group(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_log_options_group(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete log options group."""
        path = self.mappers[self.mapper_key].get_rule_log_options_group_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_log_options_level(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set log options level."""
        path = self.mappers[self.mapper_key].get_rule_log_options_level(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_log_options_level(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete log options level."""
        path = self.mappers[self.mapper_key].get_rule_log_options_level_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_log_options_queue_threshold(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set log options queue threshold."""
        path = self.mappers[self.mapper_key].get_rule_log_options_queue_threshold(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_log_options_queue_threshold(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete log options queue threshold."""
        path = self.mappers[self.mapper_key].get_rule_log_options_queue_threshold_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_log_options_snapshot_length(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set log options snapshot length."""
        path = self.mappers[self.mapper_key].get_rule_log_options_snapshot_length(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_log_options_snapshot_length(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete log options snapshot length."""
        path = self.mappers[self.mapper_key].get_rule_log_options_snapshot_length_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_log_options(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire log options node."""
        path = self.mappers[self.mapper_key].get_rule_log_options_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Mark (match)
    # ========================================================================

    def set_rule_mark(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set mark match value."""
        path = self.mappers[self.mapper_key].get_rule_mark(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_mark(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete mark match value."""
        path = self.mappers[self.mapper_key].get_rule_mark_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Packet Length
    # ========================================================================

    def set_rule_packet_length(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set packet length match."""
        path = self.mappers[self.mapper_key].get_rule_packet_length(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_packet_length(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete packet length match."""
        path = self.mappers[self.mapper_key].get_rule_packet_length_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Packet Length Exclude
    # ========================================================================

    def set_rule_packet_length_exclude(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set packet length exclude match."""
        path = self.mappers[self.mapper_key].get_rule_packet_length_exclude(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_packet_length_exclude(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete packet length exclude match."""
        path = self.mappers[self.mapper_key].get_rule_packet_length_exclude_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Packet Type
    # ========================================================================

    def set_rule_packet_type(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set packet type match."""
        path = self.mappers[self.mapper_key].get_rule_packet_type(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_packet_type(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete packet type match."""
        path = self.mappers[self.mapper_key].get_rule_packet_type_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Queue
    # ========================================================================

    def set_rule_queue(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set queue number."""
        path = self.mappers[self.mapper_key].get_rule_queue(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_queue(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete queue number."""
        path = self.mappers[self.mapper_key].get_rule_queue_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Queue Options
    # ========================================================================

    def set_rule_queue_options(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set queue options."""
        path = self.mappers[self.mapper_key].get_rule_queue_options(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_queue_options(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete queue options."""
        path = self.mappers[self.mapper_key].get_rule_queue_options_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Recent
    # ========================================================================

    def set_rule_recent_count(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set recent count."""
        path = self.mappers[self.mapper_key].get_rule_recent_count(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_recent_count(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete recent count."""
        path = self.mappers[self.mapper_key].get_rule_recent_count_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_recent_time(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set recent time."""
        path = self.mappers[self.mapper_key].get_rule_recent_time(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_recent_time(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete recent time."""
        path = self.mappers[self.mapper_key].get_rule_recent_time_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_recent(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire recent node."""
        path = self.mappers[self.mapper_key].get_rule_recent_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Source FQDN & Address Mask
    # ========================================================================

    def set_rule_source_fqdn(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source FQDN."""
        path = self.mappers[self.mapper_key].get_rule_source_fqdn(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_source_fqdn(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source FQDN."""
        path = self.mappers[self.mapper_key].get_rule_source_fqdn_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_source_address_mask(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source address mask."""
        path = self.mappers[self.mapper_key].get_rule_source_address_mask(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_source_address_mask(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source address mask."""
        path = self.mappers[self.mapper_key].get_rule_source_address_mask_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Destination FQDN, Address Mask, MAC Address
    # ========================================================================

    def set_rule_destination_fqdn(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set destination FQDN."""
        path = self.mappers[self.mapper_key].get_rule_destination_fqdn(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_destination_fqdn(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination FQDN."""
        path = self.mappers[self.mapper_key].get_rule_destination_fqdn_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_destination_address_mask(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set destination address mask."""
        path = self.mappers[self.mapper_key].get_rule_destination_address_mask(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_destination_address_mask(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination address mask."""
        path = self.mappers[self.mapper_key].get_rule_destination_address_mask_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_destination_mac_address(self, chain: str, rule_number: int, mac: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set destination MAC address."""
        path = self.mappers[self.mapper_key].get_rule_destination_mac_address(chain, rule_number, mac, is_custom)
        return self.add_set(path)

    def delete_rule_destination_mac_address(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination MAC address."""
        path = self.mappers[self.mapper_key].get_rule_destination_mac_address_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Dynamic Address Group
    # ========================================================================

    def set_rule_source_group_dynamic_address(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set source dynamic address group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_dynamic_address(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_source_group_dynamic_address(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete source dynamic address group."""
        path = self.mappers[self.mapper_key].get_rule_source_group_dynamic_address_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_destination_group_dynamic_address(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set destination dynamic address group."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_dynamic_address(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_destination_group_dynamic_address(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete destination dynamic address group."""
        path = self.mappers[self.mapper_key].get_rule_destination_group_dynamic_address_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Synproxy
    # ========================================================================

    def set_rule_synproxy_tcp_mss(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set synproxy TCP MSS."""
        path = self.mappers[self.mapper_key].get_rule_synproxy_tcp_mss(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_synproxy_tcp_mss(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete synproxy TCP MSS."""
        path = self.mappers[self.mapper_key].get_rule_synproxy_tcp_mss_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_synproxy_tcp_window_scale(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set synproxy TCP window scale."""
        path = self.mappers[self.mapper_key].get_rule_synproxy_tcp_window_scale(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_synproxy_tcp_window_scale(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete synproxy TCP window scale."""
        path = self.mappers[self.mapper_key].get_rule_synproxy_tcp_window_scale_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_synproxy(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire synproxy node."""
        path = self.mappers[self.mapper_key].get_rule_synproxy_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - TCP MSS (match)
    # ========================================================================

    def set_rule_tcp_mss(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set TCP MSS match value."""
        path = self.mappers[self.mapper_key].get_rule_tcp_mss(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_tcp_mss(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete TCP MSS match value."""
        path = self.mappers[self.mapper_key].get_rule_tcp_mss_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Time
    # ========================================================================

    def set_rule_time_startdate(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set time start date."""
        path = self.mappers[self.mapper_key].get_rule_time_startdate(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_time_startdate(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete time start date."""
        path = self.mappers[self.mapper_key].get_rule_time_startdate_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_time_starttime(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set time start time."""
        path = self.mappers[self.mapper_key].get_rule_time_starttime(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_time_starttime(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete time start time."""
        path = self.mappers[self.mapper_key].get_rule_time_starttime_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_time_stopdate(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set time stop date."""
        path = self.mappers[self.mapper_key].get_rule_time_stopdate(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_time_stopdate(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete time stop date."""
        path = self.mappers[self.mapper_key].get_rule_time_stopdate_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_time_stoptime(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set time stop time."""
        path = self.mappers[self.mapper_key].get_rule_time_stoptime(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_time_stoptime(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete time stop time."""
        path = self.mappers[self.mapper_key].get_rule_time_stoptime_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_time_weekdays(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set time weekdays."""
        path = self.mappers[self.mapper_key].get_rule_time_weekdays(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_time_weekdays(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete time weekdays."""
        path = self.mappers[self.mapper_key].get_rule_time_weekdays_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_time(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire time node."""
        path = self.mappers[self.mapper_key].get_rule_time_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - TTL Match
    # ========================================================================

    def set_rule_hop_limit_eq(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set hop-limit equal match."""
        path = self.mappers[self.mapper_key].get_rule_hop_limit_eq(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_hop_limit_eq(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete hop-limit equal match."""
        path = self.mappers[self.mapper_key].get_rule_hop_limit_eq_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_hop_limit_gt(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set hop-limit greater-than match."""
        path = self.mappers[self.mapper_key].get_rule_hop_limit_gt(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_hop_limit_gt(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete hop-limit greater-than match."""
        path = self.mappers[self.mapper_key].get_rule_hop_limit_gt_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_hop_limit_lt(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set hop-limit less-than match."""
        path = self.mappers[self.mapper_key].get_rule_hop_limit_lt(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_hop_limit_lt(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete hop-limit less-than match."""
        path = self.mappers[self.mapper_key].get_rule_hop_limit_lt_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_hop_limit(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire hop-limit node."""
        path = self.mappers[self.mapper_key].get_rule_hop_limit_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Add Address to Group
    # ========================================================================

    def set_rule_add_address_to_group_src_group(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set add address to group source group name."""
        path = self.mappers[self.mapper_key].get_rule_add_address_to_group_src_group(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_add_address_to_group_src_group(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete add address to group source group name."""
        path = self.mappers[self.mapper_key].get_rule_add_address_to_group_src_group_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_add_address_to_group_src_timeout(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set add address to group source timeout."""
        path = self.mappers[self.mapper_key].get_rule_add_address_to_group_src_timeout(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_add_address_to_group_src_timeout(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete add address to group source timeout."""
        path = self.mappers[self.mapper_key].get_rule_add_address_to_group_src_timeout_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_add_address_to_group_src(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire add address to group source node."""
        path = self.mappers[self.mapper_key].get_rule_add_address_to_group_src_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_add_address_to_group_dst_group(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set add address to group destination group name."""
        path = self.mappers[self.mapper_key].get_rule_add_address_to_group_dst_group(chain, rule_number, group_name, is_custom)
        return self.add_set(path)

    def delete_rule_add_address_to_group_dst_group(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete add address to group destination group name."""
        path = self.mappers[self.mapper_key].get_rule_add_address_to_group_dst_group_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_add_address_to_group_dst_timeout(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set add address to group destination timeout."""
        path = self.mappers[self.mapper_key].get_rule_add_address_to_group_dst_timeout(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_add_address_to_group_dst_timeout(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete add address to group destination timeout."""
        path = self.mappers[self.mapper_key].get_rule_add_address_to_group_dst_timeout_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_add_address_to_group_dst(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire add address to group destination node."""
        path = self.mappers[self.mapper_key].get_rule_add_address_to_group_dst_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_add_address_to_group(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire add address to group node."""
        path = self.mappers[self.mapper_key].get_rule_add_address_to_group_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - Set Connection Mark & TCP MSS (packet modifications)
    # ========================================================================

    def set_rule_set_connection_mark(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set connection mark (packet modification)."""
        path = self.mappers[self.mapper_key].get_rule_set_connection_mark(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_set_connection_mark(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete connection mark (packet modification)."""
        path = self.mappers[self.mapper_key].get_rule_set_connection_mark_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_set_tcp_mss(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set TCP MSS (packet modification)."""
        path = self.mappers[self.mapper_key].get_rule_set_tcp_mss(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_set_tcp_mss(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete TCP MSS (packet modification)."""
        path = self.mappers[self.mapper_key].get_rule_set_tcp_mss_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_set(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire set node (packet modifications)."""
        path = self.mappers[self.mapper_key].get_rule_set_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Rule Properties - GRE (VyOS 1.5+ only)
    # ========================================================================

    def set_rule_gre_key(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set GRE key (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_key(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_gre_key(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete GRE key (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_key_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_gre_version(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set GRE version (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_version(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_gre_version(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete GRE version (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_version_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_gre_inner_proto(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Set GRE inner protocol (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_inner_proto(chain, rule_number, value, is_custom)
        return self.add_set(path)

    def delete_rule_gre_inner_proto(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete GRE inner protocol (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_inner_proto_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_gre_flags_checksum(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable GRE checksum flag (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_flags_checksum(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_gre_flags_checksum(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete GRE checksum flag (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_flags_checksum_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_gre_flags_checksum_unset(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable GRE checksum unset flag (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_flags_checksum_unset(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_gre_flags_checksum_unset(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete GRE checksum unset flag (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_flags_checksum_unset_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_gre_flags_key(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable GRE key flag (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_flags_key(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_gre_flags_key(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete GRE key flag (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_flags_key_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_gre_flags_key_unset(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable GRE key unset flag (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_flags_key_unset(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_gre_flags_key_unset(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete GRE key unset flag (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_flags_key_unset_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_gre_flags_sequence(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable GRE sequence flag (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_flags_sequence(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_gre_flags_sequence(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete GRE sequence flag (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_flags_sequence_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def set_rule_gre_flags_sequence_unset(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Enable GRE sequence unset flag (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_flags_sequence_unset(chain, rule_number, is_custom)
        return self.add_set(path)

    def delete_rule_gre_flags_sequence_unset(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete GRE sequence unset flag (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_flags_sequence_unset_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    def delete_rule_gre(self, chain: str, rule_number: int, is_custom: bool = False) -> "FirewallIPv6BatchBuilder":
        """Delete entire GRE node (VyOS 1.5+ only)."""
        path = self.mappers[self.mapper_key].get_rule_gre_path(chain, rule_number, is_custom)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """
        Get capabilities for the current VyOS version.

        Returns feature flags indicating which operations are supported.
        """
        # Check if version is VyOS 1.5+
        is_v15 = "1.5" in self.version or "latest" in self.version

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
                    "supported": is_v15,
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
                    "description": "ICMPv6 type and code matching",
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
                "gre_matching": {
                    "supported": is_v15,
                    "description": "GRE header matching (VyOS 1.5+ only)",
                },
                "ipsec_matching": {
                    "supported": True,
                    "description": "IPsec traffic matching",
                },
                "ipsec_directional": {
                    "supported": is_v15,
                    "description": "Directional IPsec matching (VyOS 1.5+ only)",
                },
                "connection_mark": {
                    "supported": True,
                    "description": "Connection mark matching and setting",
                },
                "limit": {
                    "supported": True,
                    "description": "Rate limiting (rate/burst)",
                },
                "time_matching": {
                    "supported": True,
                    "description": "Time-based rule matching",
                },
                "hop_limit_matching": {
                    "supported": True,
                    "description": "Hop-limit value matching (eq/gt/lt)",
                },
                "fqdn_matching": {
                    "supported": True,
                    "description": "FQDN source/destination matching",
                },
                "fragment_matching": {
                    "supported": True,
                    "description": "IP fragment matching",
                },
                "packet_length_matching": {
                    "supported": True,
                    "description": "Packet length matching",
                },
                "recent_matching": {
                    "supported": True,
                    "description": "Recent connection tracking",
                },
                "log_options": {
                    "supported": True,
                    "description": "Advanced logging options",
                },
                "synproxy": {
                    "supported": True,
                    "description": "SYN proxy configuration",
                },
                "dynamic_address_group": {
                    "supported": True,
                    "description": "Dynamic address groups",
                },
                "add_address_to_group": {
                    "supported": True,
                    "description": "Dynamic address group population",
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
