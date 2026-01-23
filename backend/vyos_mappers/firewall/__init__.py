"""
Firewall Mappers

Handles version-specific command translation for firewall features.
"""

from .groups import FirewallGroupsMapper
from .ipv4 import FirewallIPv4Mapper
from .ipv6 import FirewallIPv6Mapper

__all__ = [
    "FirewallGroupsMapper",
    "FirewallIPv4Mapper",
    "FirewallIPv6Mapper",
]
