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
        # parse_config must live here. A method on SystemMapper is bound to
        # `base`, so 1.4 would still read 1.5 syslog/sflow keys.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_system_config

            return parse_system_config(self, full_config)

        def parse_config_management(self, system_config):
            from ..config_parse import parse_config_management

            return parse_config_management(system_config)

        def __getattr__(self, name: str):
            # Version-specific methods take priority over base
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()  # type: ignore[return-value]


__all__ = ["get_system_mapper"]
