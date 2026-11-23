"""VyOS 1.5 high-availability mapper.

1.5 adds ``health-check timeout`` under VRRP groups and sync groups and
``vrrp snmp trap``.
"""

from typing import List

from ..high_availability import BASE, HighAvailabilityMapper


class HighAvailabilityMapperV1_5(HighAvailabilityMapper):
    """VyOS 1.5 high-availability mapper."""

    def get_vrrp_group_health_check_timeout_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "group", name, "health-check", "timeout", value]

    def get_vrrp_sync_group_health_check_timeout_path(self, name: str, value: str) -> List[str]:
        return BASE + ["vrrp", "sync-group", name, "health-check", "timeout", value]

    def get_vrrp_snmp_trap_path(self) -> List[str]:
        return BASE + ["vrrp", "snmp", "trap"]
