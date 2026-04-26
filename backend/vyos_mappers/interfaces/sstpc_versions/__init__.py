"""
SSTPC Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.

Version differences:
- None: SSTPC config tree is identical between VyOS 1.4 and 1.5.
"""

from ..sstpc import SstpcInterfaceMapper
from .v1_4 import SstpcMapper_v1_4
from .v1_5 import SstpcMapper_v1_5


def get_sstpc_mapper(version: str) -> SstpcInterfaceMapper:
    """Get version-specific SSTPC interface mapper."""
    if "1.5" in version or "latest" in version:
        return SstpcMapper_v1_5(version)
    return SstpcMapper_v1_4(version)
