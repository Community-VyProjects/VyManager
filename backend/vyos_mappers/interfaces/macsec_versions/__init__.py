"""
MACsec Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ...base import is_vyos_1_4
from ..macsec import MacsecInterfaceMapper
from .v1_4 import MacsecMapper_v1_4
from .v1_5 import MacsecMapper_v1_5


def get_macsec_mapper(version: str) -> MacsecInterfaceMapper:
    """Get version-specific MACsec interface mapper."""
    if not is_vyos_1_4(version):
        return MacsecMapper_v1_5(version)
    return MacsecMapper_v1_4(version)
