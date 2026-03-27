"""
NHRP Mapper — Base paths (common to all VyOS versions)

All NHRP configuration lives under protocols/nhrp.
Version-specific differences (authentication key names, map structure,
NHS support, etc.) are handled by version-specific mappers.
"""

from typing import List
from ..base import BaseFeatureMapper

BASE = ["protocols", "nhrp", "tunnel"]


class NhrpMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # -----------------------------------------------------------------------
    # Root paths
    # -----------------------------------------------------------------------

    def get_nhrp_path(self) -> List[str]:
        """Root NHRP path."""
        return ["protocols", "nhrp"]

    def get_tunnel_path(self, tunnel: str) -> List[str]:
        """Path for a specific tunnel."""
        return BASE + [tunnel]

    # -----------------------------------------------------------------------
    # Common flags (both versions)
    # -----------------------------------------------------------------------

    def get_redirect_path(self, tunnel: str) -> List[str]:
        return BASE + [tunnel, "redirect"]

    def get_shortcut_path(self, tunnel: str) -> List[str]:
        return BASE + [tunnel, "shortcut"]

    # -----------------------------------------------------------------------
    # Multicast — base path (value handling differs per version)
    # -----------------------------------------------------------------------

    def get_multicast_path(self, tunnel: str, value: str) -> List[str]:
        return BASE + [tunnel, "multicast", value]

    def get_multicast_base_path(self, tunnel: str) -> List[str]:
        return BASE + [tunnel, "multicast"]
