"""VyOS 1.5 Conntrack-Sync mapper.

``service conntrack-sync purge-timeout`` exists only on 1.5, and 1.5 accepts
IPv6 for the interface peer, listen-address and mcast-group.
"""
from typing import List

from ..conntrack_sync import BASE, ConntrackSyncMapper


class ConntrackSyncMapperV1_5(ConntrackSyncMapper):
    """VyOS 1.5 conntrack-sync mapper with purge-timeout and IPv6 addresses."""

    def address_families(self) -> List[str]:
        return ["ipv4", "ipv6"]

    def get_purge_timeout(self, timeout: str) -> List[str]:
        return BASE + ["purge-timeout", timeout]

    def get_purge_timeout_delete(self) -> List[str]:
        return BASE + ["purge-timeout"]
