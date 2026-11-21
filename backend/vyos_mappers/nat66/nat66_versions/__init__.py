"""Factory for NAT66 mappers.

The shared class is returned directly on 1.4. The 1.5-only group subtrees
live on the subclass.
"""
from ...base import is_vyos_1_4
from ..nat66 import NAT66Mapper
from .v1_5 import NAT66MapperV1_5


def get_nat66_mapper(version: str) -> NAT66Mapper:
    """Return the NAT66 mapper for this device."""
    if is_vyos_1_4(version):
        return NAT66Mapper(version)
    return NAT66MapperV1_5(version)
