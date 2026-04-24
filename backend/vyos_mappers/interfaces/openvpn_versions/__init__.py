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
    """Get version-specific OpenVPN interface mapper."""
    if "1.5" in version or "latest" in version:
        return OpenvpnMapper_v1_5(version)
    return OpenvpnMapper_v1_4(version)
