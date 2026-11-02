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
        # parse_config must live here. A method on the base mapper is bound
        # to `base`, so version branches would not see the merged mapper.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_conntrack_sync_config

            return parse_conntrack_sync_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
