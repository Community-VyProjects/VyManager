"""
Input (IFB) Interface Version-Specific Mappers

Factory function returns the appropriate mapper based on VyOS version.
"""

from ...base import is_vyos_1_4
from ..input import InputInterfaceMapper
from .v1_4 import InputMapper_v1_4
from .v1_5 import InputMapper_v1_5


def get_input_mapper(version: str) -> InputInterfaceMapper:
    """Get version-specific input interface mapper."""
    if not is_vyos_1_4(version):
        return InputMapper_v1_5(version)
    return InputMapper_v1_4(version)
