"""
VXLAN Mapper - VyOS 1.4 specific paths.

VyOS 1.4 does NOT support:
  - ipv6 address interface-identifier
  - vlan-to-vni <id> description
"""


class VxlanMapperV1_4:
    """VyOS 1.4 specific VXLAN mapper. No additional paths beyond base."""
    pass
