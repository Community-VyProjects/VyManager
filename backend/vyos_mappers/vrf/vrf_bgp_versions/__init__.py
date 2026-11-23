"""Factory for version-specific VRF BGP mappers."""

from ..vrf_bgp import VrfBgpMapper
from .v1_5 import VrfBgpMapperV1_5


def get_vrf_bgp_mapper(version: str) -> VrfBgpMapper:
    """Return the VRF BGP mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return VrfBgpMapper(version)
    return VrfBgpMapperV1_5(version)


__all__ = ["VrfBgpMapperV1_5", "get_vrf_bgp_mapper"]
