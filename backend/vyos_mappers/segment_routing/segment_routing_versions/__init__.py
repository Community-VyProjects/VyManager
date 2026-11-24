"""Factory for Segment Routing mappers.

The shared class is returned directly on 1.4. 1.5 differences live on the
subclass. A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..segment_routing import SegmentRoutingMapper
from .v1_5 import SegmentRoutingMapperV1_5


def get_segment_routing_mapper(version: str) -> SegmentRoutingMapper:
    """Return the Segment Routing mapper for this device."""
    if "1.4" in version:
        return SegmentRoutingMapper(version)
    return SegmentRoutingMapperV1_5(version)


__all__ = ["SegmentRoutingMapperV1_5", "get_segment_routing_mapper"]
