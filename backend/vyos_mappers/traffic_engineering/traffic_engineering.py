"""Traffic Engineering Protocol Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper


class TrafficEngineeringMapper(BaseFeatureMapper):
    """Base mapper for Traffic Engineering configuration paths."""

    def __init__(self, version: str):
        super().__init__(version)

    def _te(self) -> List[str]:
        return ["protocols", "traffic-engineering"]

    # ========================================================================
    # Admin Groups
    # ========================================================================

    def get_admin_group(self, name: str) -> List[str]:
        return self._te() + ["admin-group", name]

    def get_admin_group_delete(self, name: str) -> List[str]:
        return self._te() + ["admin-group", name]

    def get_admin_group_bit_position(self, name: str, bit: str) -> List[str]:
        return self._te() + ["admin-group", name, "bit-position", bit]

    def get_admin_group_bit_position_delete(self, name: str) -> List[str]:
        return self._te() + ["admin-group", name, "bit-position"]

    # ========================================================================
    # Interfaces
    # ========================================================================

    def get_interface(self, iface: str) -> List[str]:
        return self._te() + ["interface", iface]

    def get_interface_delete(self, iface: str) -> List[str]:
        return self._te() + ["interface", iface]

    def get_interface_admin_group(self, iface: str, group: str) -> List[str]:
        return self._te() + ["interface", iface, "admin-group", group]

    def get_interface_admin_group_delete(self, iface: str, group: str) -> List[str]:
        return self._te() + ["interface", iface, "admin-group", group]

    def get_interface_max_bandwidth(self, iface: str, value: str) -> List[str]:
        return self._te() + ["interface", iface, "max-bandwidth", value]

    def get_interface_max_bandwidth_delete(self, iface: str) -> List[str]:
        return self._te() + ["interface", iface, "max-bandwidth"]

    def get_interface_max_reservable_bandwidth(self, iface: str, value: str) -> List[str]:
        return self._te() + ["interface", iface, "max-reservable-bandwidth", value]

    def get_interface_max_reservable_bandwidth_delete(self, iface: str) -> List[str]:
        return self._te() + ["interface", iface, "max-reservable-bandwidth"]

    def get_interface_metric(self, iface: str, value: str) -> List[str]:
        return self._te() + ["interface", iface, "metric", value]

    def get_interface_metric_delete(self, iface: str) -> List[str]:
        return self._te() + ["interface", iface, "metric"]

    # ========================================================================
    # Delete entire Traffic Engineering config
    # ========================================================================

    def get_te_delete(self) -> List[str]:
        return self._te()
