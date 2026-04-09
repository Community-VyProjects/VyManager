"""
Loopback Interface Mapper - VyOS 1.4

Loopback commands are identical between 1.4 and 1.5.
No version-specific overrides needed.
"""

from ..loopback import LoopbackInterfaceMapper


class LoopbackMapper_v1_4(LoopbackInterfaceMapper):
    """VyOS 1.4 loopback interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)
