"""DHCP Server router."""
from .dhcp import router, set_device_registry, set_configured_device_name

__all__ = ["router", "set_device_registry", "set_configured_device_name"]
