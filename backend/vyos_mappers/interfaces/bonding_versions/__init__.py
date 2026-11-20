"""
Bonding Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ...base import is_vyos_1_4
from ..bonding import BondingInterfaceMapper
from .v1_4 import BondingMapper_v1_4
from .v1_5 import BondingMapper_v1_5


def get_bonding_mapper(version: str) -> BondingInterfaceMapper:
    """Get version-specific bonding mapper."""
    if not is_vyos_1_4(version):
        return BondingMapper_v1_5(version)
    return BondingMapper_v1_4(version)
