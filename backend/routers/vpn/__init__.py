"""
VPN API Routers

FastAPI routers for VPN configurations (IPsec, OpenVPN).
"""

from . import ipsec, openvpn

__all__ = ["ipsec", "openvpn"]
