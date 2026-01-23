"""
Service API Routers

FastAPI routers for VyOS service configurations (DNS, NTP, SSH, etc.).
"""

from . import dns, ntp, ssh, dhcp_relay

__all__ = ["dns", "ntp", "ssh", "dhcp_relay"]
