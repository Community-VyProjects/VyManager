"""
Interface API Routers

FastAPI routers for different interface types.
"""

from . import ethernet, dummy, bonding, bridge, geneve, input, l2tpv3, loopback, macsec, openvpn, virtual_ethernet

__all__ = ["ethernet", "dummy", "bonding", "bridge", "geneve", "input", "l2tpv3", "loopback", "macsec", "openvpn", "virtual_ethernet"]
