"""
VyOS Command Mappers - Modular structure

Each feature category (interfaces, firewall, nat, etc.) has its own subdirectory.
This keeps the codebase organized and maintainable as it grows.
"""

from .base import BaseFeatureMapper, CommandMapperRegistry
from .interfaces import EthernetInterfaceMapper, DummyInterfaceMapper
from .interfaces.ethernet_versions import get_ethernet_mapper
from .firewall import FirewallGroupsMapper, FirewallIPv4Mapper, FirewallIPv6Mapper
from .firewall.groups_versions import get_firewall_groups_mapper
from .firewall.ipv4_versions import get_firewall_ipv4_mapper
from .firewall.ipv6_versions import get_firewall_ipv6_mapper
from .nat import NATMapper
from .nat.nat_versions import get_nat_mapper
from .dhcp import DHCPMapper
from .dhcp.dhcp_versions import get_dhcp_mapper

# Auto-register all mappers
# Ethernet uses factory for version-specific mappers
CommandMapperRegistry.register_feature("interface_ethernet", get_ethernet_mapper)
# Dummy uses direct class (no version differences)
CommandMapperRegistry.register_feature("interface_dummy", DummyInterfaceMapper)
# Firewall groups uses factory for version-specific mappers
CommandMapperRegistry.register_feature("firewall_groups", get_firewall_groups_mapper)
# Firewall IPv4 uses factory for version-specific mappers
CommandMapperRegistry.register_feature("firewall_ipv4", get_firewall_ipv4_mapper)
# Firewall IPv6 uses factory for version-specific mappers
CommandMapperRegistry.register_feature("firewall_ipv6", get_firewall_ipv6_mapper)
# NAT uses factory for version-specific mappers
CommandMapperRegistry.register_feature("nat", get_nat_mapper)
# DHCP uses factory for version-specific mappers
CommandMapperRegistry.register_feature("dhcp", get_dhcp_mapper)

__all__ = [
    "BaseFeatureMapper",
    "CommandMapperRegistry",
    "EthernetInterfaceMapper",
    "DummyInterfaceMapper",
    "FirewallGroupsMapper",
    "FirewallIPv4Mapper",
    "FirewallIPv6Mapper",
    "NATMapper",
    "DHCPMapper",
]
