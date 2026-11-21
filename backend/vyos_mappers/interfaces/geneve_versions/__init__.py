"""
GENEVE Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ...base import is_vyos_1_4
from ..geneve import GeneveInterfaceMapper
from .v1_4 import GeneveMapper_v1_4
from .v1_5 import GeneveMapper_v1_5


def get_geneve_mapper(version: str) -> GeneveInterfaceMapper:
    """Get version-specific geneve interface mapper."""
    if not is_vyos_1_4(version):
        return GeneveMapper_v1_5(version)
    return GeneveMapper_v1_4(version)
