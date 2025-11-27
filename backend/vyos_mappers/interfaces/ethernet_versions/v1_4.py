"""
VyOS 1.4 Ethernet Interface Mapper

Overrides for VyOS 1.4-specific behavior.
Primarily handles features that are NOT available in 1.4.
"""

from typing import Dict, Any, List
from ..ethernet import EthernetInterfaceMapper


class EthernetMapper_v1_4(EthernetInterfaceMapper):
    """
    VyOS 1.4-specific ethernet interface mapper.

    Overrides methods to exclude or disable features not available in 1.4.
    Returns normalized structure where unavailable features are set to None/False.
    """

    # ========================================================================
    # Command Generation Overrides - Commands not available in v1.4
    # ========================================================================

    def get_ip_enable_directed_broadcast(self, interface: str) -> List[str]:
        """
        Directed broadcast is not available in v1.4.

        Raise error if someone tries to use this feature with v1.4 device.
        """
        raise ValueError(
            f"enable-directed-broadcast requires VyOS 1.5+. "
            f"Current device is running v1.4"
        )

    # ========================================================================
    # Parsing Overrides - Normalize unavailable features
    # ========================================================================

    def _parse_ip_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse IP configuration for VyOS 1.4.

        Overrides base implementation to handle features not available in 1.4.
        Returns same structure as v1.5 but with unavailable features set to None.
        """
        ip_config = config.get("ip", {})
        if not ip_config:
            return None

        return {
            # Standard features (available in all versions)
            "adjust_mss": ip_config.get("adjust-mss"),
            "arp_cache_timeout": ip_config.get("arp-cache-timeout"),
            "disable_arp_filter": "disable-arp-filter" in ip_config,
            "enable_arp_accept": "enable-arp-accept" in ip_config,
            "enable_arp_announce": "enable-arp-announce" in ip_config,
            "enable_arp_ignore": "enable-arp-ignore" in ip_config,
            "enable_proxy_arp": "enable-proxy-arp" in ip_config,
            "proxy_arp_pvlan": "proxy-arp-pvlan" in ip_config,
            "source_validation": ip_config.get("source-validation"),
            # v1.5+ features - NOT available in 1.4, always None for normalization
            "enable_directed_broadcast": None,  # Feature not available in 1.4
        }
