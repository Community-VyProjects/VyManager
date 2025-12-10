"""
VyOS 1.4 specific route policy commands.
"""

from typing import List


class RouteMapperV1_4:
    """Version-specific mapper for VyOS 1.4."""

    # VyOS 1.4 does not have VRF support in policy route
    # All common operations are in the base mapper
    pass
