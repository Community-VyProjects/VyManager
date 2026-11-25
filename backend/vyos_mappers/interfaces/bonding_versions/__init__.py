"""
Bonding Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..bonding import BondingInterfaceMapper
from .v1_5 import BondingMapper_v1_5


def get_bonding_mapper(version: str) -> BondingInterfaceMapper:
    """Return the bonding interface mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return BondingInterfaceMapper(version)
    return BondingMapper_v1_5(version)


__all__ = ["BondingMapper_v1_5", "get_bonding_mapper"]
