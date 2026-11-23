"""Factory for version-specific VRF IS-IS mappers."""

from ..vrf_isis import VrfIsisMapper
from .v1_5 import VrfIsisMapperV1_5


def get_vrf_isis_mapper(version: str) -> VrfIsisMapper:
    """Return the VRF IS-IS mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return VrfIsisMapper(version)
    return VrfIsisMapperV1_5(version)


__all__ = ["VrfIsisMapperV1_5", "get_vrf_isis_mapper"]
