"""
VPN Mappers

Mappers for VPN configurations (IPsec, OpenVPN).
"""

from .ipsec import IPsecMapper
from .openvpn import OpenVPNMapper

__all__ = [
    "IPsecMapper",
    "OpenVPNMapper",
]
