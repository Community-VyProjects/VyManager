"""Factory for Conntrack-Sync mappers.

The shared class is returned directly on 1.4. ``purge-timeout`` and IPv6
addresses exist only on 1.5, so that version gets the subclass. There is no
merge proxy and no empty 1.4 file.
"""
from ..conntrack_sync import ConntrackSyncMapper
from .v1_5 import ConntrackSyncMapperV1_5


def get_conntrack_sync_mapper(version: str) -> ConntrackSyncMapper:
    """Return the shared mapper, or the 1.5 subclass.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return ConntrackSyncMapper(version)
    return ConntrackSyncMapperV1_5(version)
