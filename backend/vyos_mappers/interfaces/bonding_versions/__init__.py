"""
Bonding Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..bonding import BondingInterfaceMapper
from .v1_4 import BondingMapper_v1_4
from .v1_5 import BondingMapper_v1_5


def get_bonding_mapper(version: str) -> BondingInterfaceMapper:
    """Get version-specific bonding mapper."""
    if "1.5" in version or "latest" in version:
        return BondingMapper_v1_5(version)
    return BondingMapper_v1_4(version)
