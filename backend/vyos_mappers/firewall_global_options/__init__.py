"""Firewall Global Options mapper module."""
from .firewall_global_options import FirewallGlobalOptionsMapper
from .firewall_global_options_versions import get_firewall_global_options_mapper

__all__ = [
    "FirewallGlobalOptionsMapper",
    "get_firewall_global_options_mapper",
]
