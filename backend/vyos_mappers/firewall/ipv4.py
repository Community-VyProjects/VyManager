"""
Firewall IPv4 Command Mapper

Handles command path generation for IPv4 firewall rules.
Version-specific logic is in version-specific files.
"""

from typing import List
from ..base import BaseFeatureMapper


class FirewallIPv4Mapper(BaseFeatureMapper):
    """Base mapper for IPv4 firewall operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # Base Chain Operations (forward, input, output)
    # ========================================================================

    def get_base_chain_rule(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for creating a rule in a base chain."""
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number)]

    def get_base_chain_rule_path(self, chain: str, rule_number: int) -> List[str]:
        """Get command path for a rule (for deletion)."""
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number)]

    def get_base_chain_default_action(self, chain: str, action: str) -> List[str]:
        """Get command path for setting default action on base chain."""
        return ["firewall", "ipv4", chain, "filter", "default-action", action]

    def get_base_chain_default_action_path(self, chain: str) -> List[str]:
        """Get command path for default action (for deletion)."""
        return ["firewall", "ipv4", chain, "filter", "default-action"]

    # ========================================================================
    # Custom Chain Operations (named chains)
    # ========================================================================

    def get_custom_chain_rule(self, chain_name: str, rule_number: int) -> List[str]:
        """Get command path for creating a rule in a custom chain."""
        return ["firewall", "ipv4", "name", chain_name, "rule", str(rule_number)]

    def get_custom_chain_rule_path(self, chain_name: str, rule_number: int) -> List[str]:
        """Get command path for a custom chain rule (for deletion)."""
        return ["firewall", "ipv4", "name", chain_name, "rule", str(rule_number)]

    def get_custom_chain(self, chain_name: str) -> List[str]:
        """Get command path for creating a custom chain."""
        return ["firewall", "ipv4", "name", chain_name]

    def get_custom_chain_path(self, chain_name: str) -> List[str]:
        """Get command path for custom chain (for deletion)."""
        return ["firewall", "ipv4", "name", chain_name]

    def get_custom_chain_description(self, chain_name: str, description: str) -> List[str]:
        """Get command path for setting custom chain description."""
        return ["firewall", "ipv4", "name", chain_name, "description", description]

    def get_custom_chain_description_path(self, chain_name: str) -> List[str]:
        """Get command path for custom chain description (for deletion)."""
        return ["firewall", "ipv4", "name", chain_name, "description"]

    def get_custom_chain_default_action(self, chain_name: str, action: str) -> List[str]:
        """Get command path for setting default action on custom chain."""
        return ["firewall", "ipv4", "name", chain_name, "default-action", action]

    def get_custom_chain_default_action_path(self, chain_name: str) -> List[str]:
        """Get command path for custom chain default action (for deletion)."""
        return ["firewall", "ipv4", "name", chain_name, "default-action"]

    # ========================================================================
    # Rule Properties - Common
    # ========================================================================

    def get_rule_description(self, chain: str, rule_number: int, description: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting rule description."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "description", description]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "description", description]

    def get_rule_description_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for rule description (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "description"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "description"]

    def get_rule_action(self, chain: str, rule_number: int, action: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting rule action."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "action", action]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "action", action]

    def get_rule_action_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for rule action (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "action"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "action"]

    def get_rule_disable(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for disabling a rule."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "disable"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "disable"]

    def get_rule_disable_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for rule disable (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "disable"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "disable"]

    def get_rule_log(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling rule logging."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "log"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "log"]

    def get_rule_log_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for rule log (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "log"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "log"]

    def get_rule_protocol(self, chain: str, rule_number: int, protocol: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting rule protocol."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "protocol", protocol]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "protocol", protocol]

    def get_rule_protocol_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for rule protocol (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "protocol"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "protocol"]

    # ========================================================================
    # Rule Properties - Source
    # ========================================================================

    def get_rule_source_address(self, chain: str, rule_number: int, address: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source address."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "address", address]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "address", address]

    def get_rule_source_address_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source address (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "address"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "address"]

    def get_rule_source_port(self, chain: str, rule_number: int, port: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source port."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "port", port]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "port", port]

    def get_rule_source_port_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source port (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "port"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "port"]

    def get_rule_source_mac_address(self, chain: str, rule_number: int, mac_address: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source MAC address."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "mac-address", mac_address]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "mac-address", mac_address]

    def get_rule_source_mac_address_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source MAC address (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "mac-address"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "mac-address"]

    def get_rule_source_geoip_country(self, chain: str, rule_number: int, country_code: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source GeoIP country code."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "geoip", "country-code", country_code]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "geoip", "country-code", country_code]

    def get_rule_source_geoip_country_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source GeoIP country code (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "geoip", "country-code"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "geoip", "country-code"]

    def get_rule_source_geoip_inverse(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling source GeoIP inverse match."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "geoip", "inverse-match"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "geoip", "inverse-match"]

    def get_rule_source_geoip_inverse_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source GeoIP inverse match (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "geoip", "inverse-match"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "geoip", "inverse-match"]

    def get_rule_source_geoip_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source GeoIP node (for deletion of entire geoip section)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "geoip"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "geoip"]

    def get_rule_source_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for entire source node (for deletion when switching to 'any')."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source"]

    def get_rule_source_group_address(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source address group."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "group", "address-group", group_name]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "group", "address-group", group_name]

    def get_rule_source_group_address_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source address group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "group", "address-group"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "group", "address-group"]

    def get_rule_source_group_network(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source network group."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "group", "network-group", group_name]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "group", "network-group", group_name]

    def get_rule_source_group_network_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source network group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "group", "network-group"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "group", "network-group"]

    def get_rule_source_group_port(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source port group."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "group", "port-group", group_name]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "group", "port-group", group_name]

    def get_rule_source_group_port_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source port group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "group", "port-group"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "group", "port-group"]

    def get_rule_source_group_mac(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source MAC group."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "group", "mac-group", group_name]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "group", "mac-group", group_name]

    def get_rule_source_group_mac_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source MAC group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "group", "mac-group"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "group", "mac-group"]

    def get_rule_source_group_domain(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source domain group."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "group", "domain-group", group_name]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "group", "domain-group", group_name]

    def get_rule_source_group_domain_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source domain group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "group", "domain-group"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "group", "domain-group"]

    def get_rule_source_mac(self, chain: str, rule_number: int, mac: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source MAC address."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "mac-address", mac]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "mac-address", mac]

    def get_rule_source_mac_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source MAC address (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "mac-address"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "mac-address"]

    # ========================================================================
    # Rule Properties - Destination
    # ========================================================================

    def get_rule_destination_address(self, chain: str, rule_number: int, address: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination address."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "address", address]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "address", address]

    def get_rule_destination_address_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination address (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "address"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "address"]

    def get_rule_destination_port(self, chain: str, rule_number: int, port: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination port."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "port", port]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "port", port]

    def get_rule_destination_port_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination port (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "port"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "port"]

    def get_rule_destination_geoip_country(self, chain: str, rule_number: int, country_code: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination GeoIP country code."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "geoip", "country-code", country_code]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "geoip", "country-code", country_code]

    def get_rule_destination_geoip_country_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination GeoIP country code (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "geoip", "country-code"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "geoip", "country-code"]

    def get_rule_destination_geoip_inverse(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling destination GeoIP inverse match."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "geoip", "inverse-match"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "geoip", "inverse-match"]

    def get_rule_destination_geoip_inverse_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination GeoIP inverse match (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "geoip", "inverse-match"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "geoip", "inverse-match"]

    def get_rule_destination_geoip_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination GeoIP node (for deletion of entire geoip section)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "geoip"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "geoip"]

    def get_rule_destination_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for entire destination node (for deletion when switching to 'any')."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination"]

    def get_rule_destination_group_address(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination address group."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "group", "address-group", group_name]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "group", "address-group", group_name]

    def get_rule_destination_group_address_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination address group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "group", "address-group"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "group", "address-group"]

    def get_rule_destination_group_network(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination network group."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "group", "network-group", group_name]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "group", "network-group", group_name]

    def get_rule_destination_group_network_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination network group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "group", "network-group"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "group", "network-group"]

    def get_rule_destination_group_port(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination port group."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "group", "port-group", group_name]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "group", "port-group", group_name]

    def get_rule_destination_group_port_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination port group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "group", "port-group"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "group", "port-group"]

    def get_rule_destination_group_mac(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination MAC group."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "group", "mac-group", group_name]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "group", "mac-group", group_name]

    def get_rule_destination_group_mac_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination MAC group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "group", "mac-group"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "group", "mac-group"]

    def get_rule_destination_group_domain(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination domain group."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "group", "domain-group", group_name]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "group", "domain-group", group_name]

    def get_rule_destination_group_domain_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination domain group (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "group", "domain-group"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "group", "domain-group"]

    def get_rule_source_group_remote(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting source remote group (VyOS 1.5+ only)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "group", "remote-group", group_name]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "group", "remote-group", group_name]

    def get_rule_source_group_remote_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for source remote group (for deletion) (VyOS 1.5+ only)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "source", "group", "remote-group"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "source", "group", "remote-group"]

    def get_rule_destination_group_remote(self, chain: str, rule_number: int, group_name: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting destination remote group (VyOS 1.5+ only)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "group", "remote-group", group_name]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "group", "remote-group", group_name]

    def get_rule_destination_group_remote_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for destination remote group (for deletion) (VyOS 1.5+ only)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "destination", "group", "remote-group"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "destination", "group", "remote-group"]

    # ========================================================================
    # Rule Properties - State
    # ========================================================================

    def get_rule_state_established(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling established state matching."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "state", "established"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "state", "established"]

    def get_rule_state_established_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for established state (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "state", "established"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "state", "established"]

    def get_rule_state_new(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling new state matching."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "state", "new"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "state", "new"]

    def get_rule_state_new_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for new state (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "state", "new"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "state", "new"]

    def get_rule_state_related(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling related state matching."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "state", "related"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "state", "related"]

    def get_rule_state_related_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for related state (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "state", "related"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "state", "related"]

    def get_rule_state_invalid(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for enabling invalid state matching."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "state", "invalid"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "state", "invalid"]

    def get_rule_state_invalid_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for invalid state (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "state", "invalid"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "state", "invalid"]

    # ========================================================================
    # Rule Properties - Interface
    # ========================================================================

    def get_rule_inbound_interface(self, chain: str, rule_number: int, interface: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting inbound interface."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "inbound-interface", "name", interface]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "inbound-interface", "name", interface]

    def get_rule_inbound_interface_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for inbound interface (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "inbound-interface"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "inbound-interface"]

    def get_rule_outbound_interface(self, chain: str, rule_number: int, interface: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting outbound interface."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "outbound-interface", "name", interface]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "outbound-interface", "name", interface]

    def get_rule_outbound_interface_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for outbound interface (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "outbound-interface"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "outbound-interface"]

    # ========================================================================
    # Rule Properties - Packet Modifications
    # ========================================================================

    def get_rule_set_dscp(self, chain: str, rule_number: int, dscp: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting DSCP value."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "set", "dscp", dscp]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "set", "dscp", dscp]

    def get_rule_set_dscp_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for DSCP (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "set", "dscp"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "set", "dscp"]

    def get_rule_set_mark(self, chain: str, rule_number: int, mark: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting packet mark."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "set", "mark", mark]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "set", "mark", mark]

    def get_rule_set_mark_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for packet mark (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "set", "mark"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "set", "mark"]

    def get_rule_set_ttl(self, chain: str, rule_number: int, ttl: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting TTL value."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "set", "ttl", ttl]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "set", "ttl", ttl]

    def get_rule_set_ttl_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for TTL (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "set", "ttl"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "set", "ttl"]

    # ========================================================================
    # Rule Properties - TCP Flags
    # ========================================================================

    def get_rule_tcp_flags(self, chain: str, rule_number: int, flag: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting TCP flags.

        Flag can be either:
        - A simple flag name: "syn", "ack", etc.
        - An inverted flag: "not syn", "not ack", etc.

        VyOS expects: set firewall ipv4 forward filter rule 100 tcp flags [not] <flag>
        """
        # Split flag into components if it contains "not"
        flag_parts = flag.split()

        if is_custom:
            base_path = ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "tcp", "flags"]
        else:
            base_path = ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "tcp", "flags"]

        # Add flag components to path
        return base_path + flag_parts

    def get_rule_tcp_flags_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for TCP flags (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "tcp", "flags"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "tcp", "flags"]

    # ========================================================================
    # Rule Properties - ICMP
    # ========================================================================

    def get_rule_icmp_type_name(self, chain: str, rule_number: int, icmp_type: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting ICMP type name."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "icmp", "type-name", icmp_type]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "icmp", "type-name", icmp_type]

    def get_rule_icmp_type_name_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for ICMP type name (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "icmp", "type-name"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "icmp", "type-name"]

    # ========================================================================
    # Rule Properties - Jump Target
    # ========================================================================

    def get_rule_jump_target(self, chain: str, rule_number: int, target: str, is_custom: bool = False) -> List[str]:
        """Get command path for setting jump target."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "jump-target", target]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "jump-target", target]

    def get_rule_jump_target_path(self, chain: str, rule_number: int, is_custom: bool = False) -> List[str]:
        """Get command path for jump target (for deletion)."""
        if is_custom:
            return ["firewall", "ipv4", "name", chain, "rule", str(rule_number), "jump-target"]
        return ["firewall", "ipv4", chain, "filter", "rule", str(rule_number), "jump-target"]
