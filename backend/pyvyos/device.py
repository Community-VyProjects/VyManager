"""
Device module - backward compatibility shim.

This module maintains backward compatibility by re-exporting classes
from the refactored core module structure.

Public API imports (from pyvyos import ...) continue to work unchanged.
Direct imports from this module may show deprecation warnings in future versions.
"""
from .core.device import VyDevice
from .core.rest_client import ApiResponse

__all__ = ["VyDevice", "ApiResponse"]
