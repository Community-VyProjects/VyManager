"""Factory for version-specific L2TP mappers."""

from ..l2tp import L2TPMapper
from .v1_4 import L2TPMapperV1_4
from .v1_5 import L2TPMapperV1_5


def get_l2tp_mapper(version: str) -> L2TPMapper:
    """
    Factory function to get appropriate mapper for version.

    The L2TP command tree is identical between VyOS 1.4 and 1.5,
    but we keep the version structure for consistency and future changes.

    Args:
        version: VyOS version string (e.g., "1.4", "1.5")

    Returns:
        Merged mapper with base and version-specific methods
    """
    base = L2TPMapper(version)

    if "1.4" in version:
        version_specific = L2TPMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = L2TPMapperV1_5()
    else:
        version_specific = L2TPMapperV1_5()  # Default to latest

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
