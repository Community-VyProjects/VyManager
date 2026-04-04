"""
GENEVE Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..geneve import GeneveInterfaceMapper
from .v1_4 import GeneveMapper_v1_4
from .v1_5 import GeneveMapper_v1_5


def get_geneve_mapper(version: str) -> GeneveInterfaceMapper:
    """Get version-specific geneve interface mapper."""
    if "1.5" in version or "latest" in version:
        return GeneveMapper_v1_5(version)
    return GeneveMapper_v1_4(version)
