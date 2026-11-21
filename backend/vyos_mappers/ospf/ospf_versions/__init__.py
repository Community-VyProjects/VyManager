"""Factory for OSPF protocol mappers.

The shared class is returned directly on 1.4. 1.5-only leaves live on the
subclass. A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ...base import is_vyos_1_4
from ..ospf import OspfMapper
from .v1_5 import OspfMapperV1_5


def get_ospf_mapper(version: str) -> OspfMapper:
    """Return the OSPF mapper for this device."""
    if is_vyos_1_4(version):
        return OspfMapper(version)
    return OspfMapperV1_5(version)
