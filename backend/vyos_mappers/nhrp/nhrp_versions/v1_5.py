"""
NHRP Mapper — VyOS 1.5 specific paths

VyOS 1.5 uses:
  - authentication (not cisco-authentication)
  - holdtime (not holding-time)
  - map tunnel-ip {ip} nbma {ip|local}
  - nhs tunnel-ip {ip|dynamic} nbma {ip} (multi)
  - mtu, network-id, registration-no-unique
  - multicast accepts IP addresses or "dynamic" (multi-value)
  - No dynamic-map, non-caching, shortcut-destination, or shortcut-target
"""

from typing import List

BASE = ["protocols", "nhrp", "tunnel"]


class NhrpMapperV1_5:
    """VyOS 1.5 NHRP mapper — version-specific paths."""

    # -----------------------------------------------------------------------
    # Authentication (authentication in 1.5)
    # -----------------------------------------------------------------------

    def get_authentication_path(self, tunnel: str, value: str) -> List[str]:
        return BASE + [tunnel, "authentication", value]

    def get_authentication_base_path(self, tunnel: str) -> List[str]:
        return BASE + [tunnel, "authentication"]

    # -----------------------------------------------------------------------
    # Holdtime (holdtime in 1.5)
    # -----------------------------------------------------------------------

    def get_holding_time_path(self, tunnel: str, value: str) -> List[str]:
        return BASE + [tunnel, "holdtime", value]

    def get_holding_time_base_path(self, tunnel: str) -> List[str]:
        return BASE + [tunnel, "holdtime"]

    # -----------------------------------------------------------------------
    # Map — 1.5 style: map tunnel-ip {ip} nbma {ip|local}
    # -----------------------------------------------------------------------

    def get_map_path(self, tunnel: str, tunnel_ip: str) -> List[str]:
        return BASE + [tunnel, "map", "tunnel-ip", tunnel_ip]

    def get_map_nbma_path(self, tunnel: str, tunnel_ip: str, nbma: str) -> List[str]:
        return BASE + [tunnel, "map", "tunnel-ip", tunnel_ip, "nbma", nbma]

    def get_map_nbma_base_path(self, tunnel: str, tunnel_ip: str) -> List[str]:
        return BASE + [tunnel, "map", "tunnel-ip", tunnel_ip, "nbma"]

    # -----------------------------------------------------------------------
    # NHS — 1.5 only: nhs tunnel-ip {ip|dynamic} nbma {ip}
    # -----------------------------------------------------------------------

    def get_nhs_path(self, tunnel: str, tunnel_ip: str) -> List[str]:
        return BASE + [tunnel, "nhs", "tunnel-ip", tunnel_ip]

    def get_nhs_nbma_path(self, tunnel: str, tunnel_ip: str, nbma: str) -> List[str]:
        return BASE + [tunnel, "nhs", "tunnel-ip", tunnel_ip, "nbma", nbma]

    def get_nhs_nbma_base_path(self, tunnel: str, tunnel_ip: str) -> List[str]:
        return BASE + [tunnel, "nhs", "tunnel-ip", tunnel_ip, "nbma"]

    def get_nhs_base_path(self, tunnel: str) -> List[str]:
        return BASE + [tunnel, "nhs"]

    # -----------------------------------------------------------------------
    # MTU — 1.5 only
    # -----------------------------------------------------------------------

    def get_mtu_path(self, tunnel: str, value: str) -> List[str]:
        return BASE + [tunnel, "mtu", value]

    def get_mtu_base_path(self, tunnel: str) -> List[str]:
        return BASE + [tunnel, "mtu"]

    # -----------------------------------------------------------------------
    # Network ID — 1.5 only
    # -----------------------------------------------------------------------

    def get_network_id_path(self, tunnel: str, value: str) -> List[str]:
        return BASE + [tunnel, "network-id", value]

    def get_network_id_base_path(self, tunnel: str) -> List[str]:
        return BASE + [tunnel, "network-id"]

    # -----------------------------------------------------------------------
    # Registration no-unique — 1.5 only
    # -----------------------------------------------------------------------

    def get_registration_no_unique_path(self, tunnel: str) -> List[str]:
        return BASE + [tunnel, "registration-no-unique"]
