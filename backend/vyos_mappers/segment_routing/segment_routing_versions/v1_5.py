"""Segment Routing behavior that differs on VyOS 1.5."""

from ..segment_routing import SegmentRoutingMapper


class SegmentRoutingMapperV1_5(SegmentRoutingMapper):
    """VyOS 1.5 Segment Routing mapper."""

    def modify_requires_recreate(self) -> bool:
        return False
