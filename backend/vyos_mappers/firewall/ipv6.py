"""
Firewall IPv6 Command Mapper

Handles command path generation for IPv6 firewall rules.
Version-specific logic is in version-specific files.
"""

from typing import List
from ..base import BaseFeatureMapper


class FirewallIPv6Mapper(BaseFeatureMapper):
    """Base mapper for IPv6 firewall operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Base Chain Operations (forward, input, output)
    # ========================================================================

    def get_base_chain_rule(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for creating a rule in a base chain."""
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number)]

    def get_base_chain_rule_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for a rule (for deletion)."""
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number)]

    def get_base_chain_default_action(self, chain: str, action: str) -> List[str]:
        """Get command path for setting default action on base chain."""
        return ["firewall", "ipv6", chain, "filter", "default-action", action]

    def get_base_chain_default_action_path(self, chain: str) -> List[str]:
        """Get command path for default action (for deletion)."""
        return ["firewall", "ipv6", chain, "filter", "default-action"]

    # ========================================================================
    # Custom Chain Operations (named chains)
    # ========================================================================

    def get_custom_chain_rule(self, chain_name: str, rule_number: int) -> List[str]:
        """Get command path for creating a rule in a custom chain."""
        return ["firewall", "ipv6", "name", chain_name, "rule", str(rule_number)]

    def get_custom_chain_rule_path(self, chain_name: str, rule_number: int) -> List[str]:
        """Get command path for a custom chain rule (for deletion)."""
        return ["firewall", "ipv6", "name", chain_name, "rule", str(rule_number)]

    def get_custom_chain(self, chain_name: str) -> List[str]:
        """Get command path for creating a custom chain."""
        return ["firewall", "ipv6", "name", chain_name]

    def get_custom_chain_path(self, chain_name: str) -> List[str]:
        """Get command path for custom chain (for deletion)."""
        return ["firewall", "ipv6", "name", chain_name]

    def get_custom_chain_description(self, chain_name: str, description: str) -> List[str]:
        """Get command path for setting custom chain description."""
        return ["firewall", "ipv6", "name", chain_name, "description", description]

    def get_custom_chain_description_path(self, chain_name: str) -> List[str]:
        """Get command path for custom chain description (for deletion)."""
        return ["firewall", "ipv6", "name", chain_name, "description"]

    def get_custom_chain_default_action(self, chain_name: str, action: str) -> List[str]:
        """Get command path for setting default action on custom chain."""
        return ["firewall", "ipv6", "name", chain_name, "default-action", action]

    def get_custom_chain_default_action_path(self, chain_name: str) -> List[str]:
        """Get command path for custom chain default action (for deletion)."""
        return ["firewall", "ipv6", "name", chain_name, "default-action"]

    # ========================================================================
    # Rule Properties - Common
    # ========================================================================

    def get_rule_description(self, chain: str, rule_number: int, description: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting rule description."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "description", description]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "description", description]

    def get_rule_description_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for rule description (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "description"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "description"]

    def get_rule_action(self, chain: str, rule_number: int, action: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting rule action."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "action", action]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "action", action]

    def get_rule_action_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for rule action (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "action"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "action"]

    def get_rule_disable(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for disabling a rule."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "disable"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "disable"]

    def get_rule_disable_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for rule disable (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "disable"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "disable"]

    def get_rule_log(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling rule logging."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "log"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "log"]

    def get_rule_log_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for rule log (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "log"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "log"]

    def get_rule_protocol(self, chain: str, rule_number: int, protocol: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting rule protocol."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "protocol", protocol]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "protocol", protocol]

    def get_rule_protocol_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for rule protocol (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "protocol"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "protocol"]

    # ========================================================================
    # Rule Properties - Source
    # ========================================================================

    def get_rule_source_address(self, chain: str, rule_number: int, address: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source address."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "address", address]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "address", address]

    def get_rule_source_address_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source address (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "address"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "address"]

    def get_rule_source_port(self, chain: str, rule_number: int, port: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source port."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "port", port]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "port", port]

    def get_rule_source_port_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source port (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "port"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "port"]

    def get_rule_source_mac_address(self, chain: str, rule_number: int, mac_address: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source MAC address."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "mac-address", mac_address]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "mac-address", mac_address]

    def get_rule_source_mac_address_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source MAC address (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "mac-address"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "mac-address"]

    def get_rule_source_geoip_country(self, chain: str, rule_number: int, country_code: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source GeoIP country code."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "geoip", "country-code", country_code]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "geoip", "country-code", country_code]

    def get_rule_source_geoip_country_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source GeoIP country code (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "geoip", "country-code"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "geoip", "country-code"]

    def get_rule_source_geoip_inverse(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling source GeoIP inverse match."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "geoip", "inverse-match"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "geoip", "inverse-match"]

    def get_rule_source_geoip_inverse_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source GeoIP inverse match (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "geoip", "inverse-match"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "geoip", "inverse-match"]

    def get_rule_source_geoip_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source GeoIP node (for deletion of entire geoip section)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "geoip"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "geoip"]

    def get_rule_source_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for entire source node (for deletion when switching to 'any')."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source"]

    def get_rule_source_group_address(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source address group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group", "address-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group", "address-group", group_name]

    def get_rule_source_group_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for the entire source group node (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group"]

    def get_rule_source_group_address_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source address group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group", "address-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group", "address-group"]

    def get_rule_source_group_network(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source network group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group", "network-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group", "network-group", group_name]

    def get_rule_source_group_network_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source network group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group", "network-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group", "network-group"]

    def get_rule_source_group_port(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source port group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group", "port-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group", "port-group", group_name]

    def get_rule_source_group_port_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source port group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group", "port-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group", "port-group"]

    def get_rule_source_group_mac(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source MAC group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group", "mac-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group", "mac-group", group_name]

    def get_rule_source_group_mac_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source MAC group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group", "mac-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group", "mac-group"]

    def get_rule_source_group_domain(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source domain group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group", "domain-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group", "domain-group", group_name]

    def get_rule_source_group_domain_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source domain group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group", "domain-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group", "domain-group"]

    def get_rule_source_mac(self, chain: str, rule_number: int, mac: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source MAC address."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "mac-address", mac]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "mac-address", mac]

    def get_rule_source_mac_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source MAC address (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "mac-address"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "mac-address"]

    # ========================================================================
    # Rule Properties - Destination
    # ========================================================================

    def get_rule_destination_address(self, chain: str, rule_number: int, address: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination address."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "address", address]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "address", address]

    def get_rule_destination_address_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination address (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "address"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "address"]

    def get_rule_destination_port(self, chain: str, rule_number: int, port: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination port."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "port", port]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "port", port]

    def get_rule_destination_port_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination port (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "port"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "port"]

    def get_rule_destination_geoip_country(self, chain: str, rule_number: int, country_code: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination GeoIP country code."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "geoip", "country-code", country_code]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "geoip", "country-code", country_code]

    def get_rule_destination_geoip_country_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination GeoIP country code (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "geoip", "country-code"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "geoip", "country-code"]

    def get_rule_destination_geoip_inverse(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling destination GeoIP inverse match."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "geoip", "inverse-match"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "geoip", "inverse-match"]

    def get_rule_destination_geoip_inverse_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination GeoIP inverse match (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "geoip", "inverse-match"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "geoip", "inverse-match"]

    def get_rule_destination_geoip_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination GeoIP node (for deletion of entire geoip section)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "geoip"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "geoip"]

    def get_rule_destination_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for entire destination node (for deletion when switching to 'any')."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination"]

    def get_rule_destination_group_address(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination address group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group", "address-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group", "address-group", group_name]

    def get_rule_destination_group_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for the entire destination group node (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group"]

    def get_rule_destination_group_address_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination address group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group", "address-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group", "address-group"]

    def get_rule_destination_group_network(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination network group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group", "network-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group", "network-group", group_name]

    def get_rule_destination_group_network_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination network group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group", "network-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group", "network-group"]

    def get_rule_destination_group_port(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination port group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group", "port-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group", "port-group", group_name]

    def get_rule_destination_group_port_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination port group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group", "port-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group", "port-group"]

    def get_rule_destination_group_mac(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination MAC group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group", "mac-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group", "mac-group", group_name]

    def get_rule_destination_group_mac_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination MAC group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group", "mac-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group", "mac-group"]

    def get_rule_destination_group_domain(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination domain group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group", "domain-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group", "domain-group", group_name]

    def get_rule_destination_group_domain_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination domain group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group", "domain-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group", "domain-group"]

    def get_rule_source_group_remote(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source remote group (VyOS 1.5+ only)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group", "remote-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group", "remote-group", group_name]

    def get_rule_source_group_remote_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source remote group (for deletion) (VyOS 1.5+ only)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group", "remote-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group", "remote-group"]

    def get_rule_destination_group_remote(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination remote group (VyOS 1.5+ only)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group", "remote-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group", "remote-group", group_name]

    def get_rule_destination_group_remote_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination remote group (for deletion) (VyOS 1.5+ only)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group", "remote-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group", "remote-group"]

    # ========================================================================
    # Rule Properties - State
    # ========================================================================

    def get_rule_state_established(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling established state matching."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "state", "established"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "state", "established"]

    def get_rule_state_established_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for established state (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "state", "established"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "state", "established"]

    def get_rule_state_new(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling new state matching."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "state", "new"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "state", "new"]

    def get_rule_state_new_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for new state (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "state", "new"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "state", "new"]

    def get_rule_state_related(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling related state matching."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "state", "related"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "state", "related"]

    def get_rule_state_related_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for related state (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "state", "related"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "state", "related"]

    def get_rule_state_invalid(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling invalid state matching."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "state", "invalid"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "state", "invalid"]

    def get_rule_state_invalid_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for invalid state (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "state", "invalid"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "state", "invalid"]

    # ========================================================================
    # Rule Properties - Interface
    # ========================================================================

    def get_rule_inbound_interface(self, chain: str, rule_number: int, interface: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting inbound interface."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "inbound-interface", "name", interface]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "inbound-interface", "name", interface]

    def get_rule_inbound_interface_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for inbound interface (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "inbound-interface"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "inbound-interface"]

    def get_rule_outbound_interface(self, chain: str, rule_number: int, interface: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting outbound interface."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "outbound-interface", "name", interface]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "outbound-interface", "name", interface]

    def get_rule_outbound_interface_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for outbound interface (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "outbound-interface"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "outbound-interface"]

    # ========================================================================
    # Rule Properties - Packet Modifications
    # ========================================================================

    def get_rule_set_dscp(self, chain: str, rule_number: int, dscp: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting DSCP value."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "set", "dscp", dscp]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "set", "dscp", dscp]

    def get_rule_set_dscp_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for DSCP (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "set", "dscp"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "set", "dscp"]

    def get_rule_set_mark(self, chain: str, rule_number: int, mark: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting packet mark."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "set", "mark", mark]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "set", "mark", mark]

    def get_rule_set_mark_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for packet mark (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "set", "mark"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "set", "mark"]

    def get_rule_set_hop_limit(self, chain: str, rule_number: int, ttl: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting hop-limit value."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "set", "hop-limit", ttl]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "set", "hop-limit", ttl]

    def get_rule_set_hop_limit_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for hop-limit (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "set", "hop-limit"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "set", "hop-limit"]

    # ========================================================================
    # Rule Properties - TCP Flags
    # ========================================================================

    def get_rule_tcp_flags(self, chain: str, rule_number: int, flag: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting TCP flags.

        Flag can be either:
        - A simple flag name: "syn", "ack", etc.
        - An inverted flag: "not syn", "not ack", etc.

        VyOS expects: set firewall ipv6 forward filter rule 100 tcp flags [not] <flag>
        """
        # Split flag into components if it contains "not"
        flag_parts = flag.split()

        if is_custom:
            base_path = ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "tcp", "flags"]
        else:
            base_path = ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "tcp", "flags"]

        # Add flag components to path
        return base_path + flag_parts

    def get_rule_tcp_flags_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for TCP flags (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "tcp", "flags"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "tcp", "flags"]

    # ========================================================================
    # Rule Properties - ICMP
    # ========================================================================

    def get_rule_icmpv6_type_name(self, chain: str, rule_number: int, icmp_type: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting ICMPv6 type name."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "icmpv6", "type-name", icmp_type]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "icmpv6", "type-name", icmp_type]

    def get_rule_icmpv6_type_name_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for ICMPv6 type name (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "icmpv6", "type-name"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "icmpv6", "type-name"]

    # ========================================================================
    # Rule Properties - Jump Target
    # ========================================================================

    def get_rule_jump_target(self, chain: str, rule_number: int, target: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting jump target."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "jump-target", target]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "jump-target", target]

    def get_rule_jump_target_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for jump target (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "jump-target"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "jump-target"]

    # ========================================================================
    # Rule Properties - Offload Target (Flowtables)
    # ========================================================================

    def get_rule_offload_target(self, chain: str, rule_number: int, target: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting offload target (flowtable)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "offload-target", target]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "offload-target", target]

    def get_rule_offload_target_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for offload target (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "offload-target"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "offload-target"]

    # ========================================================================
    # Base Chain - Description and Default Log
    # ========================================================================

    def get_base_chain_description(self, chain: str, description: str) -> List[str]:
        """Get command path for setting base chain description."""
        return ["firewall", "ipv6", chain, "filter", "description", description]

    def get_base_chain_description_path(self, chain: str) -> List[str]:
        """Get command path for base chain description (for deletion)."""
        return ["firewall", "ipv6", chain, "filter", "description"]

    def get_base_chain_default_log(self, chain: str) -> List[str]:
        """Get command path for enabling default logging on base chain."""
        return ["firewall", "ipv6", chain, "filter", "default-log"]

    def get_base_chain_default_log_path(self, chain: str) -> List[str]:
        """Get command path for base chain default log (for deletion)."""
        return ["firewall", "ipv6", chain, "filter", "default-log"]

    # ========================================================================
    # Custom Chain - Default Log and Default Jump Target
    # ========================================================================

    def get_custom_chain_default_log(self, chain_name: str) -> List[str]:
        """Get command path for enabling default logging on custom chain."""
        return ["firewall", "ipv6", "name", chain_name, "default-log"]

    def get_custom_chain_default_log_path(self, chain_name: str) -> List[str]:
        """Get command path for custom chain default log (for deletion)."""
        return ["firewall", "ipv6", "name", chain_name, "default-log"]

    def get_custom_chain_default_jump_target(self, chain_name: str, target: str) -> List[str]:
        """Get command path for setting custom chain default jump target."""
        return ["firewall", "ipv6", "name", chain_name, "default-jump-target", target]

    def get_custom_chain_default_jump_target_path(self, chain_name: str) -> List[str]:
        """Get command path for custom chain default jump target (for deletion)."""
        return ["firewall", "ipv6", "name", chain_name, "default-jump-target"]

    # ========================================================================
    # Rule Properties - Connection Mark (match)
    # ========================================================================

    def get_rule_connection_mark(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting connection mark match."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "connection-mark", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "connection-mark", value]

    def get_rule_connection_mark_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for connection mark (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "connection-mark"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "connection-mark"]

    # ========================================================================
    # Rule Properties - Connection Status
    # ========================================================================

    def get_rule_connection_status_nat(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting connection status NAT match."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "connection-status", "nat", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "connection-status", "nat", value]

    def get_rule_connection_status_nat_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for connection status NAT (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "connection-status", "nat"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "connection-status", "nat"]

    # ========================================================================
    # Rule Properties - Conntrack Helper
    # ========================================================================

    def get_rule_conntrack_helper(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting conntrack helper match."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "conntrack-helper", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "conntrack-helper", value]

    def get_rule_conntrack_helper_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for conntrack helper (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "conntrack-helper"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "conntrack-helper"]

    # ========================================================================
    # Rule Properties - DSCP Match
    # ========================================================================

    def get_rule_dscp(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting DSCP match value."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "dscp", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "dscp", value]

    def get_rule_dscp_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for DSCP match (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "dscp"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "dscp"]

    # ========================================================================
    # Rule Properties - DSCP Exclude
    # ========================================================================

    def get_rule_dscp_exclude(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting DSCP exclude match value."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "dscp-exclude", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "dscp-exclude", value]

    def get_rule_dscp_exclude_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for DSCP exclude match (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "dscp-exclude"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "dscp-exclude"]

    # ========================================================================
    # Rule Properties - Fragment
    # ========================================================================

    def get_rule_fragment_match_frag(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling fragment match-frag."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "fragment", "match-frag"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "fragment", "match-frag"]

    def get_rule_fragment_match_frag_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for fragment match-frag (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "fragment", "match-frag"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "fragment", "match-frag"]

    def get_rule_fragment_match_non_frag(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling fragment match-non-frag."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "fragment", "match-non-frag"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "fragment", "match-non-frag"]

    def get_rule_fragment_match_non_frag_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for fragment match-non-frag (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "fragment", "match-non-frag"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "fragment", "match-non-frag"]

    def get_rule_fragment_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for fragment node (for deletion of entire fragment section)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "fragment"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "fragment"]

    # ========================================================================
    # Rule Properties - ICMP Code and Type (numeric)
    # ========================================================================

    def get_rule_icmpv6_code(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting ICMPv6 code."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "icmpv6", "code", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "icmpv6", "code", value]

    def get_rule_icmpv6_code_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for ICMPv6 code (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "icmpv6", "code"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "icmpv6", "code"]

    def get_rule_icmpv6_type(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting ICMPv6 type (numeric)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "icmpv6", "type", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "icmpv6", "type", value]

    def get_rule_icmpv6_type_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for ICMPv6 type (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "icmpv6", "type"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "icmpv6", "type"]

    # ========================================================================
    # Rule Properties - Interface Group (inbound/outbound)
    # ========================================================================

    def get_rule_inbound_interface_group(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting inbound interface group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "inbound-interface", "group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "inbound-interface", "group", group_name]

    def get_rule_inbound_interface_group_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for inbound interface group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "inbound-interface", "group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "inbound-interface", "group"]

    def get_rule_outbound_interface_group(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting outbound interface group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "outbound-interface", "group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "outbound-interface", "group", group_name]

    def get_rule_outbound_interface_group_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for outbound interface group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "outbound-interface", "group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "outbound-interface", "group"]

    # ========================================================================
    # Rule Properties - Limit
    # ========================================================================

    def get_rule_limit_rate(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting rate limit."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "limit", "rate", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "limit", "rate", value]

    def get_rule_limit_rate_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for rate limit (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "limit", "rate"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "limit", "rate"]

    def get_rule_limit_burst(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting limit burst."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "limit", "burst", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "limit", "burst", value]

    def get_rule_limit_burst_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for limit burst (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "limit", "burst"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "limit", "burst"]

    def get_rule_limit_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for limit node (for deletion of entire limit section)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "limit"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "limit"]

    # ========================================================================
    # Rule Properties - Log Options
    # ========================================================================

    def get_rule_log_options_group(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting log options group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "log-options", "group", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "log-options", "group", value]

    def get_rule_log_options_group_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for log options group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "log-options", "group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "log-options", "group"]

    def get_rule_log_options_level(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting log options level."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "log-options", "level", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "log-options", "level", value]

    def get_rule_log_options_level_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for log options level (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "log-options", "level"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "log-options", "level"]

    def get_rule_log_options_queue_threshold(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting log options queue threshold."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "log-options", "queue-threshold", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "log-options", "queue-threshold", value]

    def get_rule_log_options_queue_threshold_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for log options queue threshold (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "log-options", "queue-threshold"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "log-options", "queue-threshold"]

    def get_rule_log_options_snapshot_length(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting log options snapshot length."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "log-options", "snapshot-length", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "log-options", "snapshot-length", value]

    def get_rule_log_options_snapshot_length_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for log options snapshot length (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "log-options", "snapshot-length"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "log-options", "snapshot-length"]

    def get_rule_log_options_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for log-options node (for deletion of entire log-options section)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "log-options"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "log-options"]

    # ========================================================================
    # Rule Properties - Mark (match)
    # ========================================================================

    def get_rule_mark(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting mark match value."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "mark", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "mark", value]

    def get_rule_mark_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for mark match (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "mark"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "mark"]

    # ========================================================================
    # Rule Properties - Packet Length
    # ========================================================================

    def get_rule_packet_length(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting packet length match."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "packet-length", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "packet-length", value]

    def get_rule_packet_length_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for packet length (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "packet-length"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "packet-length"]

    # ========================================================================
    # Rule Properties - Packet Length Exclude
    # ========================================================================

    def get_rule_packet_length_exclude(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting packet length exclude match."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "packet-length-exclude", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "packet-length-exclude", value]

    def get_rule_packet_length_exclude_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for packet length exclude (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "packet-length-exclude"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "packet-length-exclude"]

    # ========================================================================
    # Rule Properties - Packet Type
    # ========================================================================

    def get_rule_packet_type(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting packet type match."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "packet-type", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "packet-type", value]

    def get_rule_packet_type_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for packet type (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "packet-type"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "packet-type"]

    # ========================================================================
    # Rule Properties - Queue
    # ========================================================================

    def get_rule_queue(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting queue target."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "queue", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "queue", value]

    def get_rule_queue_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for queue (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "queue"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "queue"]

    # ========================================================================
    # Rule Properties - Queue Options
    # ========================================================================

    def get_rule_queue_options(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting queue options."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "queue-options", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "queue-options", value]

    def get_rule_queue_options_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for queue options (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "queue-options"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "queue-options"]

    # ========================================================================
    # Rule Properties - Recent
    # ========================================================================

    def get_rule_recent_count(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting recent count."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "recent", "count", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "recent", "count", value]

    def get_rule_recent_count_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for recent count (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "recent", "count"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "recent", "count"]

    def get_rule_recent_time(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting recent time."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "recent", "time", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "recent", "time", value]

    def get_rule_recent_time_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for recent time (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "recent", "time"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "recent", "time"]

    def get_rule_recent_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for recent node (for deletion of entire recent section)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "recent"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "recent"]

    # ========================================================================
    # Rule Properties - Source FQDN and Address Mask
    # ========================================================================

    def get_rule_source_fqdn(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source FQDN."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "fqdn", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "fqdn", value]

    def get_rule_source_fqdn_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source FQDN (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "fqdn"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "fqdn"]

    def get_rule_source_address_mask(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source address mask."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "address-mask", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "address-mask", value]

    def get_rule_source_address_mask_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source address mask (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "address-mask"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "address-mask"]

    # ========================================================================
    # Rule Properties - Destination FQDN, Address Mask, and MAC Address
    # ========================================================================

    def get_rule_destination_fqdn(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination FQDN."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "fqdn", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "fqdn", value]

    def get_rule_destination_fqdn_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination FQDN (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "fqdn"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "fqdn"]

    def get_rule_destination_address_mask(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination address mask."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "address-mask", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "address-mask", value]

    def get_rule_destination_address_mask_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination address mask (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "address-mask"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "address-mask"]

    def get_rule_destination_mac_address(self, chain: str, rule_number: int, mac: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination MAC address."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "mac-address", mac]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "mac-address", mac]

    def get_rule_destination_mac_address_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination MAC address (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "mac-address"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "mac-address"]

    # ========================================================================
    # Rule Properties - Dynamic Address Group (source and destination)
    # ========================================================================

    def get_rule_source_group_dynamic_address(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source dynamic address group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group", "dynamic-address-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group", "dynamic-address-group", group_name]

    def get_rule_source_group_dynamic_address_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source dynamic address group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "source", "group", "dynamic-address-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "source", "group", "dynamic-address-group"]

    def get_rule_destination_group_dynamic_address(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination dynamic address group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group", "dynamic-address-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group", "dynamic-address-group", group_name]

    def get_rule_destination_group_dynamic_address_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination dynamic address group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "destination", "group", "dynamic-address-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "destination", "group", "dynamic-address-group"]

    # ========================================================================
    # Rule Properties - Synproxy
    # ========================================================================

    def get_rule_synproxy_tcp_mss(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting synproxy TCP MSS."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "synproxy", "tcp", "mss", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "synproxy", "tcp", "mss", value]

    def get_rule_synproxy_tcp_mss_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for synproxy TCP MSS (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "synproxy", "tcp", "mss"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "synproxy", "tcp", "mss"]

    def get_rule_synproxy_tcp_window_scale(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting synproxy TCP window scale."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "synproxy", "tcp", "window-scale", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "synproxy", "tcp", "window-scale", value]

    def get_rule_synproxy_tcp_window_scale_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for synproxy TCP window scale (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "synproxy", "tcp", "window-scale"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "synproxy", "tcp", "window-scale"]

    def get_rule_synproxy_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for synproxy node (for deletion of entire synproxy section)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "synproxy"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "synproxy"]

    # ========================================================================
    # Rule Properties - TCP MSS (match)
    # ========================================================================

    def get_rule_tcp_mss(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting TCP MSS match value."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "tcp", "mss", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "tcp", "mss", value]

    def get_rule_tcp_mss_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for TCP MSS match (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "tcp", "mss"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "tcp", "mss"]

    # ========================================================================
    # Rule Properties - Time
    # ========================================================================

    def get_rule_time_startdate(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting time start date."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "time", "startdate", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "time", "startdate", value]

    def get_rule_time_startdate_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for time start date (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "time", "startdate"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "time", "startdate"]

    def get_rule_time_starttime(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting time start time."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "time", "starttime", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "time", "starttime", value]

    def get_rule_time_starttime_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for time start time (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "time", "starttime"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "time", "starttime"]

    def get_rule_time_stopdate(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting time stop date."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "time", "stopdate", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "time", "stopdate", value]

    def get_rule_time_stopdate_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for time stop date (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "time", "stopdate"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "time", "stopdate"]

    def get_rule_time_stoptime(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting time stop time."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "time", "stoptime", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "time", "stoptime", value]

    def get_rule_time_stoptime_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for time stop time (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "time", "stoptime"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "time", "stoptime"]

    def get_rule_time_weekdays(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting time weekdays."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "time", "weekdays", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "time", "weekdays", value]

    def get_rule_time_weekdays_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for time weekdays (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "time", "weekdays"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "time", "weekdays"]

    def get_rule_time_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for time node (for deletion of entire time section)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "time"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "time"]

    # ========================================================================
    # Rule Properties - hop-limit Match (eq/gt/lt)
    # ========================================================================

    def get_rule_hop_limit_eq(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting hop-limit equal match."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "hop-limit", "eq", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "hop-limit", "eq", value]

    def get_rule_hop_limit_eq_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for hop-limit equal match (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "hop-limit", "eq"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "hop-limit", "eq"]

    def get_rule_hop_limit_gt(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting hop-limit greater-than match."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "hop-limit", "gt", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "hop-limit", "gt", value]

    def get_rule_hop_limit_gt_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for hop-limit greater-than match (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "hop-limit", "gt"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "hop-limit", "gt"]

    def get_rule_hop_limit_lt(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting hop-limit less-than match."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "hop-limit", "lt", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "hop-limit", "lt", value]

    def get_rule_hop_limit_lt_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for hop-limit less-than match (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "hop-limit", "lt"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "hop-limit", "lt"]

    def get_rule_hop_limit_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for hop-limit node (for deletion of entire hop-limit section)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "hop-limit"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "hop-limit"]

    # ========================================================================
    # Rule Properties - Add Address to Group
    # ========================================================================

    def get_rule_add_address_to_group_src_group(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting add-address-to-group source address group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "add-address-to-group", "source-address", "address-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "add-address-to-group", "source-address", "address-group", group_name]

    def get_rule_add_address_to_group_src_group_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for add-address-to-group source address group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "add-address-to-group", "source-address", "address-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "add-address-to-group", "source-address", "address-group"]

    def get_rule_add_address_to_group_src_timeout(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting add-address-to-group source address timeout."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "add-address-to-group", "source-address", "timeout", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "add-address-to-group", "source-address", "timeout", value]

    def get_rule_add_address_to_group_src_timeout_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for add-address-to-group source address timeout (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "add-address-to-group", "source-address", "timeout"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "add-address-to-group", "source-address", "timeout"]

    def get_rule_add_address_to_group_src_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for add-address-to-group source-address node (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "add-address-to-group", "source-address"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "add-address-to-group", "source-address"]

    def get_rule_add_address_to_group_dst_group(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting add-address-to-group destination address group."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "add-address-to-group", "destination-address", "address-group", group_name]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "add-address-to-group", "destination-address", "address-group", group_name]

    def get_rule_add_address_to_group_dst_group_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for add-address-to-group destination address group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "add-address-to-group", "destination-address", "address-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "add-address-to-group", "destination-address", "address-group"]

    def get_rule_add_address_to_group_dst_timeout(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting add-address-to-group destination address timeout."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "add-address-to-group", "destination-address", "timeout", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "add-address-to-group", "destination-address", "timeout", value]

    def get_rule_add_address_to_group_dst_timeout_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for add-address-to-group destination address timeout (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "add-address-to-group", "destination-address", "timeout"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "add-address-to-group", "destination-address", "timeout"]

    def get_rule_add_address_to_group_dst_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for add-address-to-group destination-address node (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "add-address-to-group", "destination-address"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "add-address-to-group", "destination-address"]

    def get_rule_add_address_to_group_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for add-address-to-group node (for deletion of entire section)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "add-address-to-group"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "add-address-to-group"]

    # ========================================================================
    # Rule Properties - Set Connection Mark, TCP MSS, and Set Path
    # ========================================================================

    def get_rule_set_connection_mark(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting connection mark."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "set", "connection-mark", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "set", "connection-mark", value]

    def get_rule_set_connection_mark_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for set connection mark (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "set", "connection-mark"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "set", "connection-mark"]

    def get_rule_set_tcp_mss(self, chain: str, rule_number: int, value: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting TCP MSS value."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "set", "tcp-mss", value]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "set", "tcp-mss", value]

    def get_rule_set_tcp_mss_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for set TCP MSS (for deletion)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "set", "tcp-mss"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "set", "tcp-mss"]

    def get_rule_set_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for set node (for deletion of entire set section)."""
        if is_custom:
            return ["firewall", "ipv6", "name", chain, "rule", str(rule_number), "set"]
        return ["firewall", "ipv6", chain, "filter", "rule", str(rule_number), "set"]
