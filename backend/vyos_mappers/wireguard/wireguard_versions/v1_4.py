"""VyOS 1.4 WireGuard mapper.

``interfaces wireguard peer host-name`` does not exist on 1.4. This class
does not gain that path method.
"""

from ..wireguard import WireGuardMapper


class WireGuardMapperV1_4(WireGuardMapper):
    """VyOS 1.4 WireGuard mapper."""

    def __init__(self, version: str):
        super().__init__(version)
