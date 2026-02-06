"""VyOS 1.5 specific static routes commands."""
from typing import List


class StaticRoutesMapperV1_5:
    """
    Version-specific mapper for VyOS 1.5.

    Key differences from VyOS 1.4:
    - Multicast routes use "mroute" instead of "multicast"
    - Multicast routes combine next-hop and interface under same prefix
    - Uses "interface" directly instead of separate "interface-route" type
    """

    # ========================================================================
    # Multicast Routes (1.5 specific - uses "mroute" instead of "multicast")
    # VyOS 1.5 structure:
    #   mroute <dst> next-hop <ip> [distance <n>] [disable]
    #   mroute <dst> interface <interface> [distance <n>] [disable]
    # ========================================================================

    def get_mroute_path(self, prefix: str) -> List[str]:
        """Get command path for mroute (1.5)."""
        return ["protocols", "static", "mroute", prefix]

    def get_mroute_interface_path(self, prefix: str, interface: str) -> List[str]:
        """Get command path for mroute interface (1.5)."""
        return ["protocols", "static", "mroute", prefix, "interface", interface]

    def get_mroute_interface_disable(self, prefix: str, interface: str) -> List[str]:
        """Get command path for mroute interface disable (1.5)."""
        return ["protocols", "static", "mroute", prefix, "interface", interface, "disable"]

    def get_mroute_interface_distance(
        self, prefix: str, interface: str, distance: str
    ) -> List[str]:
        """Get command path for mroute interface distance (1.5)."""
        return ["protocols", "static", "mroute", prefix, "interface", interface, "distance", distance]

    def get_mroute_next_hop_path(self, prefix: str, next_hop: str) -> List[str]:
        """Get command path for mroute next-hop (1.5)."""
        return ["protocols", "static", "mroute", prefix, "next-hop", next_hop]

    def get_mroute_next_hop_disable(self, prefix: str, next_hop: str) -> List[str]:
        """Get command path for mroute next-hop disable (1.5)."""
        return ["protocols", "static", "mroute", prefix, "next-hop", next_hop, "disable"]

    def get_mroute_next_hop_distance(
        self, prefix: str, next_hop: str, distance: str
    ) -> List[str]:
        """Get command path for mroute next-hop distance (1.5)."""
        return ["protocols", "static", "mroute", prefix, "next-hop", next_hop, "distance", distance]

    # ========================================================================
    # Config key for parsing
    # ========================================================================

    def get_multicast_config_key(self) -> str:
        """Return the config key for multicast routes in VyOS 1.5."""
        return "mroute"
