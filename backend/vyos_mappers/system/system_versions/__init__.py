"""
System Mapper - Version Factory

Returns a merged mapper that combines version-specific overrides with
the base SystemMapper. Version-specific methods take priority.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..system_mapper import SystemMapper


def get_system_mapper(version: str) -> "SystemMapper":
    """
    Factory for the system mapper for the given VyOS version.

    Returns a MergedMapper that delegates to version-specific methods first,
    falling back to the base SystemMapper for common paths.
    """
    from ..system_mapper import SystemMapper
    from .v1_4 import SystemMapperV1_4
    from .v1_5 import SystemMapperV1_5

    base = SystemMapper(version)

    if version.startswith("1.4"):
        version_specific = SystemMapperV1_4()
    else:
        # 1.5 and unknown versions default to 1.5 behaviour
        version_specific = SystemMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name: str):
            # Version-specific methods take priority over base
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()  # type: ignore[return-value]


__all__ = ["get_system_mapper"]
