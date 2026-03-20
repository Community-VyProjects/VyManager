"""Factory for version-specific IPSec mappers."""

from ..ipsec import IPSecMapper
from .v1_4 import IPSecMapperV1_4
from .v1_5 import IPSecMapperV1_5


def get_ipsec_mapper(version: str) -> IPSecMapper:
    """
    Factory function to get appropriate mapper for version.

    Args:
        version: VyOS version string (e.g., "1.4", "1.5")

    Returns:
        Merged mapper with base and version-specific methods
    """
    base = IPSecMapper(version)

    if "1.4" in version:
        version_specific = IPSecMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = IPSecMapperV1_5()
    else:
        version_specific = IPSecMapperV1_5()  # Default to latest

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
