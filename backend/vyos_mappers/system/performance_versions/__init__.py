"""
System Option Performance Mapper - Version-Specific Implementations
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..performance import SystemPerformanceMapper


def get_system_performance_mapper(version: str) -> "SystemPerformanceMapper":
    """
    Factory for the system performance mapper for the given VyOS version.
    """
    from .v1_4 import SystemPerformanceMapper_v1_4
    from .v1_5 import SystemPerformanceMapper_v1_5

    if version.startswith("1.4"):
        return SystemPerformanceMapper_v1_4(version)
    # 1.5 and unknown default to 1.5
    return SystemPerformanceMapper_v1_5(version)


__all__ = ["get_system_performance_mapper"]
