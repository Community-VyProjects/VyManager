"""
L2TPv3 Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..l2tpv3 import L2TPv3InterfaceMapper
from .v1_5 import L2TPv3Mapper_v1_5


def get_l2tpv3_mapper(version: str) -> L2TPv3InterfaceMapper:
    """Return the L2TPv3 interface mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return L2TPv3InterfaceMapper(version)
    return L2TPv3Mapper_v1_5(version)


__all__ = ["L2TPv3Mapper_v1_5", "get_l2tpv3_mapper"]
