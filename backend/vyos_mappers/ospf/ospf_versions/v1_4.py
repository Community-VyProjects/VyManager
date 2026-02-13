"""
VyOS 1.4 specific OSPF mapper overrides.

VyOS 1.4 does not support:
- redistribute nhrp
- interface retransmit-window
- virtual-link retransmit-window
"""


class OspfMapperV1_4:
    """VyOS 1.4 specific OSPF paths. Currently no overrides needed."""
    pass
