"""Factory for version-specific Conntrack-Sync mappers."""
from ..conntrack_sync import ConntrackSyncMapper
from .v1_4 import ConntrackSyncMapperV1_4
from .v1_5 import ConntrackSyncMapperV1_5


def get_conntrack_sync_mapper(version: str):
    """Return a version-merged Conntrack-Sync mapper."""
    base = ConntrackSyncMapper(version)

    if "1.4" in version:
        version_specific = ConntrackSyncMapperV1_4()
    else:
        version_specific = ConntrackSyncMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
