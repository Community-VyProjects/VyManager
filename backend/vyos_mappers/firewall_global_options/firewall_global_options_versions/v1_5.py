"""VyOS 1.5 firewall global-options mapper.

VyOS 1.5 adds:
  - apply-to-bridged-traffic {ipv4, ipv6, accept-invalid ethernet-type}
  - geoip {maxmind-account-id, maxmind-license-key, maxmind-lite, provider,
    source-address, vrf}
  - state-policy offload offload-target
  - timeout {icmp, other, tcp <state>, udp {other, stream}}
"""

from typing import List, Tuple

from ..firewall_global_options import FirewallGlobalOptionsMapper

# Lab `allowed:` lines on 1.5.
GEOIP_PROVIDER_VALUES = ("db-ip", "maxmind")
BRIDGED_ETHERNET_TYPE_VALUES = ("arp", "dhcp", "pppoe", "802.1q", "802.1ad", "pppoe-discovery", "wol")


class FirewallGlobalOptionsMapperV1_5(FirewallGlobalOptionsMapper):
    """VyOS 1.5 firewall global-options mapper with the 1.5-only paths."""

    # ========================================================================
    # Value lists
    # ========================================================================

    def geoip_provider_values(self) -> Tuple[str, ...]:
        return GEOIP_PROVIDER_VALUES

    def bridged_ethernet_type_values(self) -> Tuple[str, ...]:
        return BRIDGED_ETHERNET_TYPE_VALUES

    # ========================================================================
    # Apply to bridged traffic
    # ========================================================================

    def get_apply_to_bridged_traffic_path(self) -> List[str]:
        return self._base() + ["apply-to-bridged-traffic"]

    def get_apply_to_bridged_traffic_family(self, family: str) -> List[str]:
        """``ipv4`` or ``ipv6``: valueless flags; set and delete share the path."""
        return self.get_apply_to_bridged_traffic_path() + [family]

    def get_apply_to_bridged_traffic_accept_invalid_path(self) -> List[str]:
        return self.get_apply_to_bridged_traffic_path() + ["accept-invalid"]

    def get_apply_to_bridged_traffic_accept_invalid_ethernet_type(self, ethernet_type: str) -> List[str]:
        """One value of the ``multi:`` ethernet-type leaf (set or delete)."""
        return self.get_apply_to_bridged_traffic_accept_invalid_path() + ["ethernet-type", ethernet_type]

    # ========================================================================
    # GeoIP
    # ========================================================================

    def get_geoip_path(self) -> List[str]:
        return self._base() + ["geoip"]

    def get_geoip_leaf(self, leaf: str, value: str) -> List[str]:
        """A single-value geoip leaf (provider, maxmind-account-id, ...)."""
        return self.get_geoip_path() + [leaf, value]

    def get_geoip_leaf_path(self, leaf: str) -> List[str]:
        return self.get_geoip_path() + [leaf]

    def get_geoip_maxmind_lite(self) -> List[str]:
        """``maxmind-lite`` is a valueless flag; set and delete share the path."""
        return self.get_geoip_path() + ["maxmind-lite"]

    # ========================================================================
    # State policy offload
    # ========================================================================

    def get_state_policy_offload_path(self) -> List[str]:
        return self.get_state_policy_path() + ["offload"]

    def get_state_policy_offload_target(self, flowtable: str) -> List[str]:
        return self.get_state_policy_offload_path() + ["offload-target", flowtable]

    # ========================================================================
    # Connection tracking timeouts
    # ========================================================================

    def get_timeout_path(self) -> List[str]:
        return self._base() + ["timeout"]

    def get_timeout(self, leaf: List[str], seconds: str) -> List[str]:
        """``leaf`` is the path under ``timeout`` (``["tcp", "close"]``)."""
        return self.get_timeout_path() + leaf + [seconds]

    def get_timeout_leaf_path(self, leaf: List[str]) -> List[str]:
        """``["tcp"]`` / ``["udp"]`` name the protocol node itself."""
        return self.get_timeout_path() + leaf
