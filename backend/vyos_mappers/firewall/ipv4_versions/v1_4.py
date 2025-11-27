"""
VyOS 1.4 specific IPv4 firewall commands.

Handles version-specific differences in command syntax for VyOS 1.4.
VyOS 1.4 uses 'firewall ipv4' structure same as 1.5.
"""

from typing import List


class FirewallIPv4MapperV1_4:
    """Version-specific mapper for VyOS 1.4 IPv4 firewall."""

    # VyOS 1.4 uses the same firewall ipv4 structure as 1.5
    # Most commands are handled by the base mapper
    # This class exists for future version-specific differences if needed

    pass
