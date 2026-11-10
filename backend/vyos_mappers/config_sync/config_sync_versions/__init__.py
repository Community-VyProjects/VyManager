"""Factory for Config-Sync mappers.

The shared class is returned directly on 1.4. Section system login exists
only on 1.5, so that version gets the subclass. There is no merge proxy
and no empty 1.4 file.
"""
from ..config_sync import ConfigSyncMapper
from .v1_5 import ConfigSyncMapperV1_5


def get_config_sync_mapper(version: str) -> ConfigSyncMapper:
    """Return the shared mapper, or the 1.5 subclass when login exists.

    Substring match like the other factories: a rolling string is 1.5.
    Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return ConfigSyncMapper(version)
    return ConfigSyncMapperV1_5(version)
