"""Factory for version-specific firewall global-options mappers."""
from ..firewall_global_options import FirewallGlobalOptionsMapper
from .v1_4 import FirewallGlobalOptionsMapperV1_4
from .v1_5 import FirewallGlobalOptionsMapperV1_5


def get_firewall_global_options_mapper(version: str):
    """Factory function to get appropriate mapper for version.

    Args:
        version: VyOS version string (e.g., "1.4", "1.5")

    Returns:
        A merged mapper with base + version-specific methods
    """
    base = FirewallGlobalOptionsMapper(version)

    if "1.4" in version:
        version_specific = FirewallGlobalOptionsMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = FirewallGlobalOptionsMapperV1_5()
    else:
        # Default to latest (1.5)
        version_specific = FirewallGlobalOptionsMapperV1_5()

    # Merge base and version-specific mappers
    class MergedMapper:
        def __init__(self):
            self._base = base
            self._version_specific = version_specific

        def __getattr__(self, name):
            # Try version-specific first, fall back to base
            if hasattr(self._version_specific, name):
                return getattr(self._version_specific, name)
            return getattr(self._base, name)

    return MergedMapper()
