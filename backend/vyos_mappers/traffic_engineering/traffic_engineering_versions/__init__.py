"""Factory for the Traffic Engineering mapper.

The shared class is returned on 1.4, where ``protocols traffic-engineering``
does not exist. The 1.5 subclass holds the paths. A rolling string is 1.5.
Only a string that contains ``1.4`` is 1.4.
"""

from ..traffic_engineering import TrafficEngineeringMapper
from .v1_5 import TrafficEngineeringMapperV1_5


def get_traffic_engineering_mapper(version: str) -> TrafficEngineeringMapper:
    """Return the shared mapper, or the 1.5 subclass."""
    if "1.4" in version:
        return TrafficEngineeringMapper(version)
    return TrafficEngineeringMapperV1_5(version)


__all__ = ["TrafficEngineeringMapperV1_5", "get_traffic_engineering_mapper"]
