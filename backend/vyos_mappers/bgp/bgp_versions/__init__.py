"""Factory for BGP protocol mappers.

The shared class is returned directly on 1.4. 1.5-only leaves live on the
subclass. A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ...base import is_vyos_1_4
from ..bgp import BgpMapper
from .v1_5 import BgpMapperV1_5


def get_bgp_mapper(version: str) -> BgpMapper:
    """Return the BGP mapper for this device."""
    if is_vyos_1_4(version):
        return BgpMapper(version)
    return BgpMapperV1_5(version)
