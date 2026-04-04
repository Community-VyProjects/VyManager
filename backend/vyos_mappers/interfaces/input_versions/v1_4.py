"""
Input (IFB) Interface Mapper - VyOS 1.4

No version-specific differences for input interfaces in VyOS 1.4.
"""

from ..input import InputInterfaceMapper


class InputMapper_v1_4(InputInterfaceMapper):
    """VyOS 1.4 input interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)
