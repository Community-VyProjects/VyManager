"""Factory for version-specific Broadcast Relay mappers."""
from ..broadcast_relay import BroadcastRelayMapper
from .v1_4 import BroadcastRelayMapperV1_4
from .v1_5 import BroadcastRelayMapperV1_5


def get_broadcast_relay_mapper(version: str):
    """Return a version-merged Broadcast Relay mapper."""
    base = BroadcastRelayMapper(version)

    if "1.4" in version:
        version_specific = BroadcastRelayMapperV1_4()
    else:
        version_specific = BroadcastRelayMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
