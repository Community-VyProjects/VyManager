"""
NDP Proxy Command Mapper

Handles command path generation for service ndp-proxy configuration.
No version differences between VyOS 1.4 and 1.5.

Config tree:
  service ndp-proxy/
    route-refresh          (10000-120000 ms, default 30000)
    interface/<IFACE>/
      disable
      enable-router-bit
      timeout              (500-120000 ms, default 500)
      ttl                  (10000-120000 ms, default 30000)
      prefix/<PREFIX>/
        disable
        mode               (static|auto|interface, default static)
        interface          (required for interface mode)
"""

from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "ndp-proxy"]


class NdpProxyMapper(BaseFeatureMapper):
    """Mapper for NDP Proxy commands. Identical on VyOS 1.4 and 1.5."""

    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Global Paths
    # ========================================================================

    def get_ndp_proxy_path(self) -> List[str]:
        return BASE[:]

    def get_route_refresh(self, value: str) -> List[str]:
        return BASE + ["route-refresh", value]

    def get_route_refresh_path(self) -> List[str]:
        return BASE + ["route-refresh"]

    # ========================================================================
    # Interface Paths
    # ========================================================================

    def get_interface_path(self, interface: str) -> List[str]:
        return BASE + ["interface", interface]

    def get_interface_disable(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "disable"]

    def get_interface_enable_router_bit(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "enable-router-bit"]

    def get_interface_timeout(self, interface: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "timeout", value]

    def get_interface_timeout_path(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "timeout"]

    def get_interface_ttl(self, interface: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "ttl", value]

    def get_interface_ttl_path(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "ttl"]

    # ========================================================================
    # Prefix Paths
    # ========================================================================

    def get_prefix_path(self, interface: str, prefix: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix]

    def get_prefix_disable(self, interface: str, prefix: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "disable"]

    def get_prefix_mode(self, interface: str, prefix: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "mode", value]

    def get_prefix_mode_path(self, interface: str, prefix: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "mode"]

    def get_prefix_interface(self, interface: str, prefix: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "interface", value]

    def get_prefix_interface_path(self, interface: str, prefix: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "interface"]
