"""
Interface API Routers

FastAPI routers for different interface types.
"""

from . import ethernet, dummy

__all__ = ["ethernet", "dummy"]
