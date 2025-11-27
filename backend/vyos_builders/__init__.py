"""
VyOS Batch Builders

Self-contained batch builders for different features.
Each builder includes all necessary operations for its feature type.
"""

from .interfaces import EthernetInterfaceBuilderMixin, DummyInterfaceBuilderMixin
from .firewall import FirewallGroupsBatchBuilder, FirewallIPv4BatchBuilder, FirewallIPv6BatchBuilder
from .nat import NATBatchBuilder
from .dhcp import DHCPBatchBuilder

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
]
