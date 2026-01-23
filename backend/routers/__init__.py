"""
FastAPI Routers

Each feature category (interfaces, firewall, nat, etc.) has its own subdirectory.
Import routers from their respective feature modules.
"""

from .interfaces import ethernet, dummy

__all__ = ["ethernet", "dummy"]
