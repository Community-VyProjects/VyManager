"""
VyOS 1.5 specific BGP mapper overrides.

BGP command trees are nearly identical between 1.4 and 1.5.
VyOS 1.5 adds BMP local-rib monitoring and nhrp in redistribute.
This file exists for the version-aware factory pattern.
"""

from typing import List


class BgpMapperV1_5:
    """VyOS 1.5 specific BGP paths."""

    def get_bmp_target_monitor_local_rib(self, name: str, afi: str) -> List[str]:
        """BMP local-rib monitoring (1.5 only)."""
        return ["protocols", "bgp", "bmp", "target", name, "monitor", afi, "local-rib"]
