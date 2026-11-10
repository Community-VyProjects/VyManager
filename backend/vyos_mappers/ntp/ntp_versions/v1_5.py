"""VyOS 1.5 NTP mapper.

``service ntp timestamp interface IFACE receive-filter`` exists only on 1.5.
"""

from typing import List

from ..ntp import BASE, NTPMapper


class NTPMapperV1_5(NTPMapper):
    """VyOS 1.5 NTP mapper with timestamp receive-filter."""

    def __init__(self, version: str):
        super().__init__(version)

    def get_timestamp_interface_receive_filter(self, iface: str, value: str) -> List[str]:
        self._require_node("timestamp_receive_filter")
        return BASE + ["timestamp", "interface", iface, "receive-filter", value]

    def get_timestamp_interface_receive_filter_delete(self, iface: str) -> List[str]:
        self._require_node("timestamp_receive_filter")
        return BASE + ["timestamp", "interface", iface, "receive-filter"]
