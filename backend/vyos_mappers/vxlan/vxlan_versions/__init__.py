"""
VXLAN version-aware mapper factory.

Merges base VxlanMapper with version-specific paths (v1_4 or v1_5).
"""

from ..vxlan import VxlanMapper
from .v1_4 import VxlanMapperV1_4
from .v1_5 import VxlanMapperV1_5


def get_vxlan_mapper(version: str):
    """Factory function that returns a merged mapper for the given VyOS version."""
    base = VxlanMapper(version)
    version_specific = VxlanMapperV1_5() if "1.5" in version or "latest" in version else VxlanMapperV1_4()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
