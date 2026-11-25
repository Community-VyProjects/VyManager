"""
GENEVE Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..geneve import GeneveInterfaceMapper
from .v1_5 import GeneveMapper_v1_5


def get_geneve_mapper(version: str) -> GeneveInterfaceMapper:
    """Return the geneve interface mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return GeneveInterfaceMapper(version)
    return GeneveMapper_v1_5(version)


__all__ = ["GeneveMapper_v1_5", "get_geneve_mapper"]
