"""Factory for version-specific Segment Routing protocol mappers."""
from ..segment_routing import SegmentRoutingMapper
from .v1_4 import SegmentRoutingMapperV1_4
from .v1_5 import SegmentRoutingMapperV1_5


def get_segment_routing_mapper(version: str):
    """Return a version-merged Segment Routing mapper."""
    base = SegmentRoutingMapper(version)

    if "1.4" in version:
        version_specific = SegmentRoutingMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = SegmentRoutingMapperV1_5()
    else:
        version_specific = SegmentRoutingMapperV1_5()

    class MergedMapper:
        # parse_config must live here. A method on the base mapper is bound
        # to `base`, so version branches would not see the merged mapper.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_segment_routing_config

            return parse_segment_routing_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
