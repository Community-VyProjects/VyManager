"""
VyOS Command Mappers - Modular structure

Each feature category (interfaces, firewall, nat, etc.) has its own subdirectory.
This keeps the codebase organized and maintainable as it grows.
"""

from .base import BaseFeatureMapper, CommandMapperRegistry
from .interfaces import EthernetInterfaceMapper, DummyInterfaceMapper
from .interfaces.ethernet_versions import get_ethernet_mapper
from .firewall import FirewallGroupsMapper, FirewallIPv4Mapper, FirewallIPv6Mapper, BridgeFirewallMapper, FlowtablesMapper
from .firewall.groups_versions import get_firewall_groups_mapper
from .firewall.ipv4_versions import get_firewall_ipv4_mapper
from .firewall.ipv6_versions import get_firewall_ipv6_mapper
from .nat import NATMapper
from .nat.nat_versions import get_nat_mapper
from .dhcp import DHCPMapper
from .dhcp.dhcp_versions import get_dhcp_mapper
from .static_routes import StaticRoutesMapper
from .static_routes.static_routes_versions import get_static_routes_mapper
from .route_map import RouteMapMapper
from .route_map.route_map_versions import get_route_map_mapper
from .access_list import AccessListMapper
from .access_list.access_list_versions import get_access_list_mapper
from .prefix_list import PrefixListMapper
from .prefix_list.prefix_list_versions import get_prefix_list_mapper
from .local_route import LocalRouteMapper
from .local_route.local_route_versions import get_local_route_mapper
from .route import RouteMapper
from .route.route_versions import get_route_mapper
from .as_path_list import AsPathListMapper
from .firewall_global_options import FirewallGlobalOptionsMapper
from .firewall_global_options.firewall_global_options_versions import get_firewall_global_options_mapper
from .wireguard import WireGuardMapper
from .wireguard.wireguard_versions import get_wireguard_mapper
from .babel import BabelMapper
from .babel.babel_versions import get_babel_mapper
from .bfd import BfdMapper
from .bfd.bfd_versions import get_bfd_mapper
from .bgp import BgpMapper
from .bgp.bgp_versions import get_bgp_mapper

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
# Static Routes uses factory for version-specific mappers
CommandMapperRegistry.register_feature("static_routes", get_static_routes_mapper)
# Route Map uses factory for version-specific mappers
CommandMapperRegistry.register_feature("route_map", get_route_map_mapper)
# Access List uses factory for version-specific mappers
CommandMapperRegistry.register_feature("access_list", get_access_list_mapper)
# Prefix List uses factory for version-specific mappers
CommandMapperRegistry.register_feature("prefix_list", get_prefix_list_mapper)
# Local Route uses factory for version-specific mappers
CommandMapperRegistry.register_feature("local_route", get_local_route_mapper)
# Route uses factory for version-specific mappers
CommandMapperRegistry.register_feature("route", get_route_mapper)
# AS Path List uses direct class (no version differences)
CommandMapperRegistry.register_feature("as_path_list", AsPathListMapper)
# Firewall Global Options uses factory for version-specific mappers
CommandMapperRegistry.register_feature("firewall_global_options", get_firewall_global_options_mapper)
# WireGuard uses factory for version-specific mappers
CommandMapperRegistry.register_feature("wireguard", get_wireguard_mapper)
# Bridge Firewall uses direct class (version checking is internal)
CommandMapperRegistry.register_feature("firewall_bridge", BridgeFirewallMapper)
# Flowtables uses direct class (no version differences)
CommandMapperRegistry.register_feature("firewall_flowtables", FlowtablesMapper)
# Babel uses factory for version-specific mappers
CommandMapperRegistry.register_feature("babel", get_babel_mapper)
# BFD uses factory for version-specific mappers
CommandMapperRegistry.register_feature("bfd", get_bfd_mapper)
# BGP uses factory for version-specific mappers
CommandMapperRegistry.register_feature("bgp", get_bgp_mapper)

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
    "StaticRoutesMapper",
    "RouteMapMapper",
    "AccessListMapper",
    "PrefixListMapper",
    "LocalRouteMapper",
    "RouteMapper",
    "AsPathListMapper",
    "FirewallGlobalOptionsMapper",
    "WireGuardMapper",
    "BridgeFirewallMapper",
    "FlowtablesMapper",
    "BabelMapper",
    "BfdMapper",
    "BgpMapper",
]
