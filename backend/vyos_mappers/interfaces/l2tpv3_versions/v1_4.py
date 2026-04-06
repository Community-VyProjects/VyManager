"""
L2TPv3 Interface Mapper - VyOS 1.4

L2TPv3 command set is identical between VyOS 1.4 and 1.5.
"""

from ..l2tpv3 import L2TPv3InterfaceMapper


class L2TPv3Mapper_v1_4(L2TPv3InterfaceMapper):
    """VyOS 1.4 L2TPv3 interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)
