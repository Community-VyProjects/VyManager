"""
Interface API Routers

FastAPI routers for different interface types.
"""

from . import ethernet, dummy, bonding, bridge

__all__ = ["ethernet", "dummy", "bonding", "bridge"]
