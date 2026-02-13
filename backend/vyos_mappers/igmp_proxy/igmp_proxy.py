"""
IGMP Proxy Command Mapper

Handles command path generation for protocols igmp-proxy configuration.
IGMP Proxy has no version differences between VyOS 1.4 and 1.5.

Config tree:
  protocols igmp-proxy/
    disable
    disable-quickleave
    interface/<IFACE>/
      role           (upstream|downstream|disabled)
      threshold      (1-255)
      alt-subnet     (multi-value, IPv4 prefix)
      whitelist      (multi-value, IPv4 prefix)
"""

from typing import List
from ..base import BaseFeatureMapper


class IgmpProxyMapper(BaseFeatureMapper):
    """Mapper for IGMP Proxy commands. Identical on VyOS 1.4 and 1.5."""

    def __init__(self, version: str):
        super().__init__(version)

    def _base(self) -> List[str]:
        return ["protocols", "igmp-proxy"]

    # ========================================================================
    # Global Paths
    # ========================================================================

    def get_igmp_proxy_path(self) -> List[str]:
        return self._base()

    def get_disable_path(self) -> List[str]:
        return self._base() + ["disable"]

    def get_disable_quickleave_path(self) -> List[str]:
        return self._base() + ["disable-quickleave"]

    # ========================================================================
    # Interface Paths
    # ========================================================================

    def get_interface_path(self, interface: str) -> List[str]:
        return self._base() + ["interface", interface]

    def get_interface_role(self, interface: str, value: str) -> List[str]:
        return self._base() + ["interface", interface, "role", value]

    def get_interface_role_path(self, interface: str) -> List[str]:
        return self._base() + ["interface", interface, "role"]

    def get_interface_threshold(self, interface: str, value: str) -> List[str]:
        return self._base() + ["interface", interface, "threshold", value]

    def get_interface_threshold_path(self, interface: str) -> List[str]:
        return self._base() + ["interface", interface, "threshold"]

    def get_interface_alt_subnet(self, interface: str, value: str) -> List[str]:
        return self._base() + ["interface", interface, "alt-subnet", value]

    def get_interface_alt_subnet_path(self, interface: str) -> List[str]:
        return self._base() + ["interface", interface, "alt-subnet"]

    def get_interface_whitelist(self, interface: str, value: str) -> List[str]:
        return self._base() + ["interface", interface, "whitelist", value]

    def get_interface_whitelist_path(self, interface: str) -> List[str]:
        return self._base() + ["interface", interface, "whitelist"]
