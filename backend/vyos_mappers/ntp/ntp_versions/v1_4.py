"""VyOS 1.4 NTP mapper — version-specific guards.

`service ntp timestamp interface IFACE receive-filter` only exists from
VyOS 1.5. On 1.4 the node does not exist, so raise here instead of emitting
a path the device would reject at commit. The batch dispatcher maps the
ValueError to HTTP 400.
"""
from typing import List

_RECEIVE_FILTER_UNSUPPORTED = (
    "NTP timestamp receive-filter requires VyOS 1.5+. Current device is running v1.4"
)


class NTPMapperV1_4:
    def get_timestamp_interface_receive_filter(self, iface: str, value: str) -> List[str]:
        raise ValueError(_RECEIVE_FILTER_UNSUPPORTED)

    def get_timestamp_interface_receive_filter_delete(self, iface: str) -> List[str]:
        raise ValueError(_RECEIVE_FILTER_UNSUPPORTED)
