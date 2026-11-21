"""VyOS 1.5 L2TP mapper.

``vpn l2tp remote-access ppp-options ipv6-peer-interface-id-secret`` exists
only on 1.5. Path methods do not re-check the node: the builder already
called ``require_node``.
"""

from typing import List

from ..l2tp import L2TPMapper


class L2TPMapperV1_5(L2TPMapper):
    """VyOS 1.5 L2TP mapper with the calling-sid IID secret."""

    def get_ppp_ipv6_peer_interface_id_secret_path(self, secret: str) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "ipv6-peer-interface-id-secret", secret]

    def get_ppp_ipv6_peer_interface_id_secret_delete_path(self) -> List[str]:
        return ["vpn", "l2tp", "remote-access", "ppp-options", "ipv6-peer-interface-id-secret"]
