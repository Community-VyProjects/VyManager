"""
REST client module - backward compatibility shim.

This module maintains backward compatibility by re-exporting classes
from the refactored core module structure.

Public API imports (from pyvyos import ...) continue to work unchanged.
Direct imports from this module may show deprecation warnings in future versions.
"""
from .core.rest_client import ApiResponse, RestClient

__all__ = ["ApiResponse", "RestClient"]
