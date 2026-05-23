"""Factory for version-specific Event Handler mappers."""
from ..event_handler import EventHandlerMapper
from .v1_4 import EventHandlerMapperV1_4
from .v1_5 import EventHandlerMapperV1_5


def get_event_handler_mapper(version: str):
    """Return a version-merged Event Handler mapper."""
    base = EventHandlerMapper(version)

    if "1.4" in version:
        version_specific = EventHandlerMapperV1_4()
    else:
        version_specific = EventHandlerMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
