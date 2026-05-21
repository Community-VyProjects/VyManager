"""Factory for version-specific Config-Sync mappers."""
from ..config_sync import ConfigSyncMapper
from .v1_4 import ConfigSyncMapperV1_4
from .v1_5 import ConfigSyncMapperV1_5


def get_config_sync_mapper(version: str):
    """Return a version-merged Config-Sync mapper."""
    base = ConfigSyncMapper(version)

    if "1.4" in version:
        version_specific = ConfigSyncMapperV1_4()
    else:
        version_specific = ConfigSyncMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
