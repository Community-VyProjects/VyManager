"""
Tunnel version-aware mapper factory.

Merges base TunnelMapper with version-specific paths (v1_4 or v1_5).
"""

from ..tunnel import TunnelMapper
from .v1_4 import TunnelMapperV1_4
from .v1_5 import TunnelMapperV1_5


def get_tunnel_mapper(version: str):
    """Factory function that returns a merged mapper for the given VyOS version."""
    base = TunnelMapper(version)
    version_specific = TunnelMapperV1_5() if "1.5" in version or "latest" in version else TunnelMapperV1_4()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
