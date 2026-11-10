"""VyOS 1.4 NTP mapper.

``service ntp timestamp interface`` does not exist on 1.4. The 1.4 class
does not gain those path methods.
"""

from ..ntp import NTPMapper


class NTPMapperV1_4(NTPMapper):
    """VyOS 1.4 NTP mapper."""

    def __init__(self, version: str):
        super().__init__(version)
