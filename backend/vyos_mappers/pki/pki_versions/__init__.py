"""Factory for version-specific PKI mappers."""

from ..pki import PKIMapper
from .v1_4 import PKIMapperV1_4
from .v1_5 import PKIMapperV1_5


def get_pki_mapper(version: str) -> PKIMapper:
    """
    Factory function to get appropriate mapper for version.

    The PKI command tree is nearly identical between VyOS 1.4 and 1.5.
    Only difference: VyOS 1.5 ACME listen-address supports IPv6.

    Args:
        version: VyOS version string (e.g., "1.4", "1.5")

    Returns:
        Merged mapper with base and version-specific methods
    """
    base = PKIMapper(version)

    if "1.4" in version:
        version_specific = PKIMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = PKIMapperV1_5()
    else:
        version_specific = PKIMapperV1_5()  # Default to latest

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
