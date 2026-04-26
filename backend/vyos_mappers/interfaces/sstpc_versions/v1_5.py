"""
SSTP Client Interface Mapper - VyOS 1.5

No differences from base mapper — SSTPC config tree is identical
between VyOS 1.4 and 1.5.
"""

from ..sstpc import SstpcInterfaceMapper


class SstpcMapper_v1_5(SstpcInterfaceMapper):
    """VyOS 1.5 SSTPC interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)
