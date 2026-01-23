"""
VyOS 1.4 specific IPv6 firewall commands.

Handles version-specific differences in command syntax for VyOS 1.4.
VyOS 1.4 uses 'firewall ipv6' structure same as 1.5.
"""

from typing import List


class FirewallIPv6MapperV1_4:
    """Version-specific mapper for VyOS 1.4 IPv6 firewall."""

    # VyOS 1.4 uses the same firewall ipv6 structure as 1.5
    # Most commands are handled by the base mapper
    # This class exists for future version-specific differences if needed

    pass
