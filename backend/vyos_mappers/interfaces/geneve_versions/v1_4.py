"""
GENEVE Interface Mapper - VyOS 1.4

VyOS 1.4 does NOT support:
- ipv6 address interface-identifier
"""

from ..geneve import GeneveInterfaceMapper


class GeneveMapper_v1_4(GeneveInterfaceMapper):
    """VyOS 1.4 geneve interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)
