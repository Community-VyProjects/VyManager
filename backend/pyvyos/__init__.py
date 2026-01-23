"""
PyVyOS - Python SDK for VyOS REST API

Public API exports maintain backward compatibility.
Internal structure has been refactored to pyvyos.core for better organization.
"""
from .core.device import VyDevice
from .core.rest_client import ApiResponse

__all__ = ["VyDevice", "ApiResponse"]
