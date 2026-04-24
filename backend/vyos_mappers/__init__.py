"""
VyOS Command Mappers - Modular structure

Each feature category (interfaces, firewall, nat, etc.) has its own subdirectory.
This keeps the codebase organized and maintainable as it grows.
"""

from .base import BaseFeatureMapper, CommandMapperRegistry
from .interfaces import EthernetInterfaceMapper, DummyInterfaceMapper, BondingInterfaceMapper, BridgeInterfaceMapper, GeneveInterfaceMapper, InputInterfaceMapper, L2TPv3InterfaceMapper, LoopbackInterfaceMapper, MacsecInterfaceMapper, OpenvpnInterfaceMapper, PppoeInterfaceMapper
from .interfaces.ethernet_versions import get_ethernet_mapper
from .interfaces.dummy_versions import get_dummy_mapper
from .interfaces.bonding_versions import get_bonding_mapper
from .interfaces.bridge_versions import get_bridge_mapper
from .interfaces.geneve_versions import get_geneve_mapper
from .interfaces.input_versions import get_input_mapper
from .interfaces.l2tpv3_versions import get_l2tpv3_mapper
from .interfaces.loopback_versions import get_loopback_mapper
from .interfaces.macsec_versions import get_macsec_mapper
from .interfaces.openvpn_versions import get_openvpn_mapper
from .interfaces.pppoe_versions import get_pppoe_mapper
from .firewall import FirewallGroupsMapper, FirewallIPv4Mapper, FirewallIPv6Mapper, BridgeFirewallMapper, FlowtablesMapper, FirewallZonesMapper
from .firewall.groups_versions import get_firewall_groups_mapper
from .firewall.ipv4_versions import get_firewall_ipv4_mapper
from .firewall.ipv6_versions import get_firewall_ipv6_mapper
from .firewall.zones_versions import get_firewall_zones_mapper
from .nat import NATMapper
from .nat.nat_versions import get_nat_mapper
from .nat64 import NAT64Mapper
from .nat64.nat64_versions import get_nat64_mapper
from .nat66 import NAT66Mapper
from .nat66.nat66_versions import get_nat66_mapper
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
from .failover import FailoverMapper
from .failover.failover_versions import get_failover_mapper
from .igmp_proxy import IgmpProxyMapper
from .ospf import OspfMapper
from .ospf.ospf_versions import get_ospf_mapper
from .ospfv3 import Ospfv3Mapper
from .ospfv3.ospfv3_versions import get_ospfv3_mapper
from .vrf import VrfMapper, VrfStaticMapper, VrfRpkiMapper, VrfFailoverMapper
from .vrf import VrfOspfMapper, VrfOspfv3Mapper, VrfIsisMapper, VrfBgpMapper
from .vrf import VrfDhcpMapper, VrfDhcpv6Mapper
from .vrf.vrf_versions import get_vrf_mapper, get_vrf_static_mapper
from .system.performance_versions import get_system_performance_mapper
from .system.system_mapper import SystemMapper
from .system.system_versions import get_system_mapper
from .high_availability import HighAvailabilityMapper
from .high_availability.high_availability_versions import get_high_availability_mapper
from .load_balancing import LoadBalancingMapper
from .load_balancing.load_balancing_versions import get_load_balancing_mapper
from .isis import IsisMapper
from .isis.isis_versions import get_isis_mapper
from .openfabric import OpenfabricMapper
from .openfabric.openfabric_versions import get_openfabric_mapper
from .mpls import MplsMapper
from .mpls.mpls_versions import get_mpls_mapper
from .ipsec import IPSecMapper
from .ipsec.ipsec_versions import get_ipsec_mapper
from .l2tp import L2TPMapper
from .l2tp.l2tp_versions import get_l2tp_mapper
from .pki import PKIMapper
from .pki.pki_versions import get_pki_mapper
from .tunnel import TunnelMapper
from .tunnel.tunnel_versions import get_tunnel_mapper
from .vxlan import VxlanMapper
from .vxlan.vxlan_versions import get_vxlan_mapper
from .nhrp import NhrpMapper
from .nhrp.nhrp_versions import get_nhrp_mapper
from .pim import PimMapper
from .pim.pim_versions import get_pim_mapper
from .pim6 import Pim6Mapper
from .pim6.pim6_versions import get_pim6_mapper

# Auto-register all mappers
# Ethernet uses factory for version-specific mappers
CommandMapperRegistry.register_feature("interface_ethernet", get_ethernet_mapper)
# Dummy uses factory for version-specific mappers
CommandMapperRegistry.register_feature("interface_dummy", get_dummy_mapper)
# Bonding uses factory for version-specific mappers
CommandMapperRegistry.register_feature("interface_bonding", get_bonding_mapper)
# Bridge uses factory for version-specific mappers
CommandMapperRegistry.register_feature("interface_bridge", get_bridge_mapper)
# Geneve uses factory for version-specific mappers
CommandMapperRegistry.register_feature("interface_geneve", get_geneve_mapper)
# Input (IFB) uses factory for version-specific mappers
CommandMapperRegistry.register_feature("interface_input", get_input_mapper)
# L2TPv3 uses factory for version-specific mappers
CommandMapperRegistry.register_feature("interface_l2tpv3", get_l2tpv3_mapper)
# Loopback uses factory for version-specific mappers
CommandMapperRegistry.register_feature("interface_loopback", get_loopback_mapper)
# MACsec uses factory for version-specific mappers
CommandMapperRegistry.register_feature("interface_macsec", get_macsec_mapper)
# OpenVPN uses factory for version-specific mappers
CommandMapperRegistry.register_feature("interface_openvpn", get_openvpn_mapper)
# PPPoE uses factory for version-specific mappers
CommandMapperRegistry.register_feature("interface_pppoe", get_pppoe_mapper)
# Firewall groups uses factory for version-specific mappers
CommandMapperRegistry.register_feature("firewall_groups", get_firewall_groups_mapper)
# Firewall IPv4 uses factory for version-specific mappers
CommandMapperRegistry.register_feature("firewall_ipv4", get_firewall_ipv4_mapper)
# Firewall IPv6 uses factory for version-specific mappers
CommandMapperRegistry.register_feature("firewall_ipv6", get_firewall_ipv6_mapper)
# NAT uses factory for version-specific mappers
CommandMapperRegistry.register_feature("nat", get_nat_mapper)
# NAT64 uses factory for version-specific mappers
CommandMapperRegistry.register_feature("nat64", get_nat64_mapper)
# NAT66 uses factory for version-specific mappers
CommandMapperRegistry.register_feature("nat66", get_nat66_mapper)
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
# Firewall Zones uses factory for version-specific mappers
CommandMapperRegistry.register_feature("firewall_zones", get_firewall_zones_mapper)
# Babel uses factory for version-specific mappers
CommandMapperRegistry.register_feature("babel", get_babel_mapper)
# BFD uses factory for version-specific mappers
CommandMapperRegistry.register_feature("bfd", get_bfd_mapper)
# BGP uses factory for version-specific mappers
CommandMapperRegistry.register_feature("bgp", get_bgp_mapper)
# Failover uses factory for version-specific mappers
CommandMapperRegistry.register_feature("failover", get_failover_mapper)
# IGMP Proxy uses direct class (no version differences)
CommandMapperRegistry.register_feature("igmp_proxy", IgmpProxyMapper)
# OSPF uses factory for version-specific mappers
CommandMapperRegistry.register_feature("ospf", get_ospf_mapper)
# OSPFv3 uses factory for version-specific mappers
CommandMapperRegistry.register_feature("ospfv3", get_ospfv3_mapper)
# VRF uses factory for version-specific mappers
CommandMapperRegistry.register_feature("vrf", get_vrf_mapper)
# VRF Static Routes uses factory for version-specific BFD paths
CommandMapperRegistry.register_feature("vrf_static", get_vrf_static_mapper)
# VRF sub-mappers use lambda factories (they don't take version in constructor)
CommandMapperRegistry.register_feature("vrf_rpki", lambda v: VrfRpkiMapper())
CommandMapperRegistry.register_feature("vrf_failover", lambda v: VrfFailoverMapper())
CommandMapperRegistry.register_feature("vrf_ospf", lambda v: VrfOspfMapper())
CommandMapperRegistry.register_feature("vrf_ospfv3", lambda v: VrfOspfv3Mapper())
CommandMapperRegistry.register_feature("vrf_isis", lambda v: VrfIsisMapper())
CommandMapperRegistry.register_feature("vrf_bgp", lambda v: VrfBgpMapper())
CommandMapperRegistry.register_feature("vrf_dhcp", lambda v: VrfDhcpMapper())
CommandMapperRegistry.register_feature("vrf_dhcpv6", lambda v: VrfDhcpv6Mapper())
CommandMapperRegistry.register_feature("system_performance", get_system_performance_mapper)
# System general mapper (hostname, login, syslog, conntrack, etc.)
CommandMapperRegistry.register_feature("system", get_system_mapper)
# High Availability uses factory for version-specific mappers
CommandMapperRegistry.register_feature("high_availability", get_high_availability_mapper)
# Load Balancing uses factory for version-specific mappers
CommandMapperRegistry.register_feature("load_balancing", get_load_balancing_mapper)
# ISIS uses factory for version-specific mappers
CommandMapperRegistry.register_feature("isis", get_isis_mapper)
# OpenFabric uses factory for version-specific mappers
CommandMapperRegistry.register_feature("openfabric", get_openfabric_mapper)
# MPLS uses factory for version-specific mappers
CommandMapperRegistry.register_feature("mpls", get_mpls_mapper)
# IPSec uses factory for version-specific mappers
CommandMapperRegistry.register_feature("ipsec", get_ipsec_mapper)
# L2TP uses factory for version-specific mappers
CommandMapperRegistry.register_feature("l2tp", get_l2tp_mapper)
# PKI uses factory for version-specific mappers
CommandMapperRegistry.register_feature("pki", get_pki_mapper)
# Tunnel uses factory for version-specific mappers
CommandMapperRegistry.register_feature("tunnel", get_tunnel_mapper)
# VXLAN uses factory for version-specific mappers
CommandMapperRegistry.register_feature("vxlan", get_vxlan_mapper)
# NHRP uses factory for version-specific mappers
CommandMapperRegistry.register_feature("nhrp", get_nhrp_mapper)
# PIM uses factory for version-specific mappers
CommandMapperRegistry.register_feature("pim", get_pim_mapper)
# PIMv6 uses factory for version-specific mappers
CommandMapperRegistry.register_feature("pim6", get_pim6_mapper)

__all__ = [
    "BaseFeatureMapper",
    "CommandMapperRegistry",
    "SystemMapper",
    "EthernetInterfaceMapper",
    "DummyInterfaceMapper",
    "FirewallGroupsMapper",
    "FirewallIPv4Mapper",
    "FirewallIPv6Mapper",
    "NATMapper",
    "NAT64Mapper",
    "NAT66Mapper",
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
    "FirewallZonesMapper",
    "BabelMapper",
    "BfdMapper",
    "BgpMapper",
    "FailoverMapper",
    "IgmpProxyMapper",
    "OspfMapper",
    "Ospfv3Mapper",
    "VrfMapper",
    "VrfStaticMapper",
    "VrfRpkiMapper",
    "VrfFailoverMapper",
    "VrfOspfMapper",
    "VrfOspfv3Mapper",
    "VrfIsisMapper",
    "VrfBgpMapper",
    "VrfDhcpMapper",
    "VrfDhcpv6Mapper",
    "HighAvailabilityMapper",
    "IsisMapper",
    "OpenfabricMapper",
    "MplsMapper",
    "IPSecMapper",
    "L2TPMapper",
    "PKIMapper",
    "TunnelMapper",
    "VxlanMapper",
    "NhrpMapper",
    "PimMapper",
    "Pim6Mapper",
    "BondingInterfaceMapper",
    "BridgeInterfaceMapper",
    "GeneveInterfaceMapper",
    "InputInterfaceMapper",
    "L2TPv3InterfaceMapper",
    "LoopbackInterfaceMapper",
    "MacsecInterfaceMapper",
    "OpenvpnInterfaceMapper",
    "PppoeInterfaceMapper",
]
