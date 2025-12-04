"""
VyOS Batch Builders

Self-contained batch builders for different features.
Each builder includes all necessary operations for its feature type.
"""

from .interfaces import EthernetInterfaceBuilderMixin, DummyInterfaceBuilderMixin
from .firewall import FirewallGroupsBatchBuilder, FirewallIPv4BatchBuilder, FirewallIPv6BatchBuilder
from .nat import NATBatchBuilder
from .dhcp import DHCPBatchBuilder
from .static_routes import StaticRoutesBatchBuilder
from .route_map import RouteMapBatchBuilder
from .access_list import AccessListBatchBuilder
from .prefix_list import PrefixListBatchBuilder

# Directly use the self-contained builders
EthernetBatchBuilder = EthernetInterfaceBuilderMixin
DummyBatchBuilder = DummyInterfaceBuilderMixin

__all__ = [
    "EthernetBatchBuilder",
    "DummyBatchBuilder",
    "FirewallGroupsBatchBuilder",
    "FirewallIPv4BatchBuilder",
    "FirewallIPv6BatchBuilder",
    "NATBatchBuilder",
    "DHCPBatchBuilder",
    "StaticRoutesBatchBuilder",
    "RouteMapBatchBuilder",
    "AccessListBatchBuilder",
    "PrefixListBatchBuilder",
]
