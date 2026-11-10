"""VyOS 1.5 WireGuard mapper.

``interfaces wireguard <if> peer <name> host-name`` exists only on 1.5.
"""

from typing import List

from ..wireguard import WireGuardMapper


class WireGuardMapperV1_5(WireGuardMapper):
    """VyOS 1.5 WireGuard mapper with peer endpoint hostname."""

    def __init__(self, version: str):
        super().__init__(version)

    def get_peer_host_name(self, interface: str, peer: str, hostname: str) -> List[str]:
        self._require_node("peer_host_name")
        return ["interfaces", "wireguard", interface, "peer", peer, "host-name", hostname]

    def get_peer_host_name_delete(self, interface: str, peer: str) -> List[str]:
        self._require_node("peer_host_name")
        return ["interfaces", "wireguard", interface, "peer", peer, "host-name"]
