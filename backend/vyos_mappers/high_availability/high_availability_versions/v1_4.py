from typing import List

_V15_ONLY = "This VRRP option requires VyOS 1.5+. Current device is running v1.4"


class HighAvailabilityMapperV1_4:
    """VyOS 1.4 rejects VRRP health-check timeout and SNMP trap.

    ``health-check timeout`` (group and sync-group) and ``vrrp snmp trap``
    only exist from VyOS 1.5. Raising here maps to HTTP 400 instead of
    emitting a path the device rejects at commit.
    """

    def get_vrrp_group_health_check_timeout_path(self, name: str, value: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    def get_vrrp_sync_group_health_check_timeout_path(self, name: str, value: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    def get_vrrp_snmp_trap_path(self) -> List[str]:
        raise ValueError(_V15_ONLY)
