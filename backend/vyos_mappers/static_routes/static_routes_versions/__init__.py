"""Factory for static routes mappers."""

from ...base import is_vyos_1_4
from ..static_routes import StaticRoutesMapper
from .v1_4 import StaticRoutesMapperV1_4
from .v1_5 import StaticRoutesMapperV1_5


def get_static_routes_mapper(version: str) -> StaticRoutesMapper:
    """Return the static routes mapper for this device."""
    if is_vyos_1_4(version):
        return StaticRoutesMapperV1_4(version)
    return StaticRoutesMapperV1_5(version)


__all__ = ["StaticRoutesMapperV1_4", "StaticRoutesMapperV1_5", "get_static_routes_mapper"]
