"""
High Availability (HA) Routers

Includes:
- VRRP (Virtual Router Redundancy Protocol)
"""

from .vrrp import router as vrrp_router

__all__ = ["vrrp_router"]
