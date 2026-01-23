"""
Factory for version-specific IPv6 firewall mappers.
"""

from ..ipv6 import FirewallIPv6Mapper
from .v1_4 import FirewallIPv6MapperV1_4
from .v1_5 import FirewallIPv6MapperV1_5


def get_firewall_ipv6_mapper(version: str):
    """
    Factory function to get appropriate mapper for version.

    Args:
        version: VyOS version string (e.g., "1.4", "1.5")

    Returns:
        Merged mapper with base and version-specific methods
    """
    base = FirewallIPv6Mapper(version)

    if "1.4" in version:
        version_specific = FirewallIPv6MapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = FirewallIPv6MapperV1_5()
    else:
        # Default to latest
        version_specific = FirewallIPv6MapperV1_5()

    # Merge base and version-specific mappers
    class MergedMapper:
        def __getattr__(self, name):
            # Try version-specific first, fall back to base
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
