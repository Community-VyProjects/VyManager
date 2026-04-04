"""
Dummy Interface Mapper - VyOS 1.4

VyOS 1.4 does NOT support:
- mac address configuration
- netns (network namespace)
"""

from ..dummy import DummyInterfaceMapper


class DummyMapper_v1_4(DummyInterfaceMapper):
    """VyOS 1.4 dummy interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)
