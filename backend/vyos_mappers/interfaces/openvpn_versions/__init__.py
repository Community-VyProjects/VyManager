"""
OpenVPN Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.

Version differences:
- 1.4: encryption/ncp-ciphers (single list, no fallback)
- 1.5: encryption/data-ciphers + encryption/data-ciphers-fallback
- 1.5: ipv6/address/interface-identifier (1.5 only)
"""

from ..openvpn import OpenvpnInterfaceMapper
from .v1_4 import OpenvpnMapper_v1_4
from .v1_5 import OpenvpnMapper_v1_5


def get_openvpn_mapper(version: str) -> OpenvpnInterfaceMapper:
    """Return the OpenVPN interface mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return OpenvpnMapper_v1_4(version)
    return OpenvpnMapper_v1_5(version)


__all__ = ["OpenvpnMapper_v1_4", "OpenvpnMapper_v1_5", "get_openvpn_mapper"]
