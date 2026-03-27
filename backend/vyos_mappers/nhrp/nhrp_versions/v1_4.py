"""
NHRP Mapper — VyOS 1.4 specific paths

VyOS 1.4 uses:
  - cisco-authentication (not authentication)
  - holding-time (not holdtime)
  - map {ip} nbma-address / cisco / register
  - dynamic-map {net} nbma-domain-name
  - non-caching, shortcut-destination, shortcut-target flags
  - multicast accepts "dynamic" or "nhs" (single value)
  - No NHS, MTU, network-id, or registration-no-unique support
"""

from typing import List

BASE = ["protocols", "nhrp", "tunnel"]


class NhrpMapperV1_4:
    """VyOS 1.4 NHRP mapper — version-specific paths."""

    # -----------------------------------------------------------------------
    # Authentication (cisco-authentication in 1.4)
    # -----------------------------------------------------------------------

    def get_authentication_path(self, tunnel: str, value: str) -> List[str]:
        return BASE + [tunnel, "cisco-authentication", value]

    def get_authentication_base_path(self, tunnel: str) -> List[str]:
        return BASE + [tunnel, "cisco-authentication"]

    # -----------------------------------------------------------------------
    # Holding time (holding-time in 1.4)
    # -----------------------------------------------------------------------

    def get_holding_time_path(self, tunnel: str, value: str) -> List[str]:
        return BASE + [tunnel, "holding-time", value]

    def get_holding_time_base_path(self, tunnel: str) -> List[str]:
        return BASE + [tunnel, "holding-time"]

    # -----------------------------------------------------------------------
    # Map — 1.4 style: map {ip} nbma-address / cisco / register
    # -----------------------------------------------------------------------

    def get_map_path(self, tunnel: str, tunnel_ip: str) -> List[str]:
        return BASE + [tunnel, "map", tunnel_ip]

    def get_map_nbma_path(self, tunnel: str, tunnel_ip: str, nbma: str) -> List[str]:
        return BASE + [tunnel, "map", tunnel_ip, "nbma-address", nbma]

    def get_map_nbma_base_path(self, tunnel: str, tunnel_ip: str) -> List[str]:
        return BASE + [tunnel, "map", tunnel_ip, "nbma-address"]

    def get_map_cisco_path(self, tunnel: str, tunnel_ip: str) -> List[str]:
        return BASE + [tunnel, "map", tunnel_ip, "cisco"]

    def get_map_register_path(self, tunnel: str, tunnel_ip: str) -> List[str]:
        return BASE + [tunnel, "map", tunnel_ip, "register"]

    # -----------------------------------------------------------------------
    # Dynamic map — 1.4 only
    # -----------------------------------------------------------------------

    def get_dynamic_map_path(self, tunnel: str, network: str) -> List[str]:
        return BASE + [tunnel, "dynamic-map", network]

    def get_dynamic_map_nbma_domain_path(self, tunnel: str, network: str, fqdn: str) -> List[str]:
        return BASE + [tunnel, "dynamic-map", network, "nbma-domain-name", fqdn]

    def get_dynamic_map_nbma_domain_base_path(self, tunnel: str, network: str) -> List[str]:
        return BASE + [tunnel, "dynamic-map", network, "nbma-domain-name"]

    # -----------------------------------------------------------------------
    # 1.4-only flags
    # -----------------------------------------------------------------------

    def get_non_caching_path(self, tunnel: str) -> List[str]:
        return BASE + [tunnel, "non-caching"]

    def get_shortcut_destination_path(self, tunnel: str) -> List[str]:
        return BASE + [tunnel, "shortcut-destination"]

    # -----------------------------------------------------------------------
    # Shortcut target — 1.4 only
    # -----------------------------------------------------------------------

    def get_shortcut_target_path(self, tunnel: str, target: str) -> List[str]:
        return BASE + [tunnel, "shortcut-target", target]

    def get_shortcut_target_holding_time_path(self, tunnel: str, target: str, value: str) -> List[str]:
        return BASE + [tunnel, "shortcut-target", target, "holding-time", value]

    def get_shortcut_target_holding_time_base_path(self, tunnel: str, target: str) -> List[str]:
        return BASE + [tunnel, "shortcut-target", target, "holding-time"]
