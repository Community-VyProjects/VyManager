"""VyOS 1.5 IPoE server mapper.

``service ipoe-server idle-timeout`` and ``interface <x> vlan-mon`` exist only
on 1.5. Path methods do not re-check the node: the builder already called
``require_node``.
"""

from typing import List

from ..ipoe_server import BASE, IPoEServerMapper


class IPoEServerMapperV1_5(IPoEServerMapper):
    """VyOS 1.5 IPoE server mapper with idle-timeout and vlan-mon."""

    def get_idle_timeout(self, value: str) -> List[str]:
        return BASE + ["idle-timeout", value]

    def get_idle_timeout_delete(self) -> List[str]:
        return BASE + ["idle-timeout"]

    def get_interface_vlan_mon(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "vlan-mon"]
