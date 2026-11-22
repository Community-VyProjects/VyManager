"""Factories for version-specific VRF mappers.

A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..vrf import VrfMapper
from ..vrf_isis import VrfIsisMapper
from .v1_5 import VrfIsisMapperV1_5, VrfMapperV1_5


def get_vrf_mapper(version: str) -> VrfMapper:
    """Return the VRF mapper for this device."""
    if "1.4" in version:
        return VrfMapper(version)
    return VrfMapperV1_5(version)


def get_vrf_isis_mapper(version: str) -> VrfIsisMapper:
    """Return the VRF IS-IS mapper for this device."""
    if "1.4" in version:
        return VrfIsisMapper(version)
    return VrfIsisMapperV1_5(version)


__all__ = ["VrfIsisMapperV1_5", "VrfMapperV1_5", "get_vrf_isis_mapper", "get_vrf_mapper"]
