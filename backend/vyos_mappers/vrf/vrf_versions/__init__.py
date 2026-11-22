"""Factory for version-specific VRF mappers."""

from ..vrf import VrfMapper
from .v1_5 import VrfMapperV1_5


def get_vrf_mapper(version: str) -> VrfMapper:
    """Return the VRF mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return VrfMapper(version)
    return VrfMapperV1_5(version)


__all__ = ["VrfMapperV1_5", "get_vrf_mapper"]
