"""Factory for version-specific WireGuard mappers."""

from ..wireguard import WireGuardMapper
from .v1_4 import WireGuardMapperV1_4
from .v1_5 import WireGuardMapperV1_5


def get_wireguard_mapper(version: str) -> WireGuardMapper:
    """
    Factory function to get appropriate mapper for version.

    Args:
        version: VyOS version string (e.g., "1.4", "1.5")

    Returns:
        Merged mapper with base and version-specific methods
    """
    base = WireGuardMapper(version)

    if "1.4" in version:
        version_specific = WireGuardMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = WireGuardMapperV1_5()
    else:
        version_specific = WireGuardMapperV1_5()  # Default to latest

    # Merge base and version-specific mappers
    class MergedMapper:
        def __getattr__(self, name):
            # Try version-specific first, fall back to base
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
