"""
Input (IFB) Interface Mapper - VyOS 1.5

No version-specific differences for input interfaces in VyOS 1.5.
"""

from ..input import InputInterfaceMapper


class InputMapper_v1_5(InputInterfaceMapper):
    """VyOS 1.5 input interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)
