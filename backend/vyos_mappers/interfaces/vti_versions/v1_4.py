"""
VTI Interface Mapper - VyOS 1.4

VyOS 1.4 VTI interfaces support the same feature set as 1.5.
No version-specific overrides needed.
"""

from ..vti import VtiInterfaceMapper


class VtiMapper_v1_4(VtiInterfaceMapper):
    """VyOS 1.4 VTI interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)
