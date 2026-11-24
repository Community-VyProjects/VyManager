"""VyOS 1.5 PPPoE server mapper.

``authentication any-login``, ``interface <x> vlan-mon`` and ``ppp-options
ipv6-peer-interface-id-secret`` exist only on 1.5. Path methods do not
re-check the node: the builder already called ``require_node``.
"""

from typing import List

from ..pppoe_server import BASE, PPPoEServerMapper


class PPPoEServerMapperV1_5(PPPoEServerMapper):
    """VyOS 1.5 PPPoE server mapper with any-login, vlan-mon and the peer id secret."""

    def get_auth_any_login(self) -> List[str]:
        return BASE + ["authentication", "any-login"]

    def get_interface_vlan_mon(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "vlan-mon"]

    def get_ppp_ipv6_peer_interface_id_secret(self, value: str) -> List[str]:
        return BASE + ["ppp-options", "ipv6-peer-interface-id-secret", value]

    def get_ppp_ipv6_peer_interface_id_secret_delete(self) -> List[str]:
        return BASE + ["ppp-options", "ipv6-peer-interface-id-secret"]
