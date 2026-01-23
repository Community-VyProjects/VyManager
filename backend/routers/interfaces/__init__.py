"""
Interface API Routers

FastAPI routers for different interface types.
"""

from . import ethernet, dummy, bonding, bridge, tunnel, vlan, vxlan

__all__ = ["ethernet", "dummy", "bonding", "bridge", "tunnel", "vlan", "vxlan"]
