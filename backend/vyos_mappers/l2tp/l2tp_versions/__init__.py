"""Factory for L2TP mappers.

The shared class is returned directly on 1.4. The 1.5-only leaf lives on the
subclass. A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..l2tp import L2TPMapper
from .v1_5 import L2TPMapperV1_5


def get_l2tp_mapper(version: str) -> L2TPMapper:
    """Return the L2TP mapper for this device."""
    if "1.4" in version:
        return L2TPMapper(version)
    return L2TPMapperV1_5(version)
