"""Factory for version-specific VRF mappers."""
from ...base import is_vyos_1_4

from ..vrf import VrfMapper
from .v1_5 import VrfMapperV1_5


def get_vrf_mapper(version: str) -> VrfMapper:
    """Return the VRF mapper for this device."""
    if is_vyos_1_4(version):
        return VrfMapper(version)
    return VrfMapperV1_5(version)


__all__ = ["VrfMapperV1_5", "get_vrf_mapper"]
