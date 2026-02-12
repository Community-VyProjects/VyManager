"""
VyOS 1.4 Failover Mapper Overrides

1.4 differences:
- No dhcp-interface support
- check/target is a multi-value node (flat list of IPs, no sub-properties)
"""

from typing import List


class FailoverMapperV1_4:
    """VyOS 1.4 specific failover paths."""

    def _base(self) -> List[str]:
        return ["protocols", "failover"]

    # ========================================================================
    # Check Target (multi-value in 1.4 — just an IP list, no sub-nodes)
    # ========================================================================

    def get_next_hop_check_target(self, destination: str, next_hop: str, target: str) -> List[str]:
        """In 1.4, target is a multi-value leaf node."""
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target", target]

    def get_next_hop_check_target_path(self, destination: str, next_hop: str) -> List[str]:
        """Path for deleting all targets."""
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target"]
