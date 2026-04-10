"""
MACsec Interface Mapper - VyOS 1.5

MACsec commands are identical between 1.4 and 1.5.
No version-specific overrides needed.
"""

from ..macsec import MacsecInterfaceMapper


class MacsecMapper_v1_5(MacsecInterfaceMapper):
    """VyOS 1.5 MACsec interface mapper."""

    def __init__(self, version: str):
        super().__init__(version)
