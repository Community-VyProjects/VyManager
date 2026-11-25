"""
MACsec Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ..macsec import MacsecInterfaceMapper
from .v1_5 import MacsecMapper_v1_5


def get_macsec_mapper(version: str) -> MacsecInterfaceMapper:
    """Return the MACsec interface mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return MacsecInterfaceMapper(version)
    return MacsecMapper_v1_5(version)


__all__ = ["MacsecMapper_v1_5", "get_macsec_mapper"]
