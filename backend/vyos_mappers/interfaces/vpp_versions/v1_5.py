"""VPP Interface Mapper — VyOS 1.5

VPP is a 1.5-only feature; no path differences from the base mapper.
This class exists for consistency with the versioned-mapper pattern.
"""

from ..vpp import VppInterfaceMapper


class VppMapper_v1_5(VppInterfaceMapper):
    pass
