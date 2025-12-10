"""
VyOS 1.5 specific route policy commands.
"""

from typing import List


class RouteMapperV1_5:
    """Version-specific mapper for VyOS 1.5."""

    def get_set_vrf(self, policy_type: str, name: str, rule: str, vrf: str) -> List[str]:
        """Set VRF (1.5+ only)."""
        return ["policy", policy_type, name, "rule", rule, "set", "vrf", vrf]
