"""
VXLAN mapper factory.

Returns the shared VxlanMapper on 1.4 and the 1.5 subclass otherwise.
"""

from ..vxlan import VxlanMapper
from .v1_5 import VxlanMapperV1_5


def get_vxlan_mapper(version: str) -> VxlanMapper:
    """Return the vxlan mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return VxlanMapper(version)
    return VxlanMapperV1_5(version)


__all__ = ["VxlanMapperV1_5", "get_vxlan_mapper"]
