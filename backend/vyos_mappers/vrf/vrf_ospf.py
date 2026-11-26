"""
VRF OSPF Command Mapper

``vrf name <NAME> protocols ospf`` is the global ``protocols ospf`` tree on
both labs, and VRF OSPF ops run the global ``OspfBatchBuilder`` first. Its
mapper (and the 1.5 subclass in ``ospf_versions``) owns every path that
builder has, including the 1.5-only leaves and the redistribute allowlist.

This mapper holds only the paths VRF dispatch falls back to when the global
builder has no method for that op and verb.
"""

from typing import List

from ..base import BaseFeatureMapper


class VrfOspfMapper(BaseFeatureMapper):
    """VRF OSPF fallback paths the global OSPF builder does not have."""

    def _base(self, name: str) -> List[str]:
        return ["vrf", "name", name, "protocols", "ospf"]

    # ========================================================================
    # Area
    # ========================================================================

    def get_ospf_area_type(self, name: str, area: str, area_type: str) -> List[str]:
        return self._base(name) + ["area", area, "area-type", area_type]

    # --- Area Virtual-Link ---

    def get_ospf_area_virtual_link_authentication(self, name: str, area: str, address: str) -> List[str]:
        return self._base(name) + ["area", area, "virtual-link", address, "authentication"]

    def get_ospf_area_virtual_link_authentication_md5_key_id(self, name: str, area: str, address: str, key_id: str) -> List[str]:
        return self._base(name) + ["area", area, "virtual-link", address, "authentication", "md5", "key-id", key_id]

    def get_ospf_area_virtual_link_authentication_md5_key_id_md5_key(self, name: str, area: str, address: str, key_id: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "virtual-link", address, "authentication", "md5", "key-id", key_id, "md5-key", value]

    # ========================================================================
    # Interface
    # ========================================================================

    def get_ospf_interface_authentication(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "authentication"]

    def get_ospf_interface_authentication_md5_key_id_md5_key(self, name: str, iface: str, key_id: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "authentication", "md5", "key-id", key_id, "md5-key", value]

    # ========================================================================
    # LDP Sync (Global)
    # ========================================================================

    def get_ospf_ldp_sync(self, name: str) -> List[str]:
        return self._base(name) + ["ldp-sync"]

    # ========================================================================
    # Parameters
    # ========================================================================

    def get_ospf_parameters_abr_type(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "abr-type", value]

    def get_ospf_parameters_opaque_lsa(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "opaque-lsa"]

    def get_ospf_parameters_rfc1583_compatibility(self, name: str) -> List[str]:
        return self._base(name) + ["parameters", "rfc1583-compatibility"]

    def get_ospf_parameters_router_id(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["parameters", "router-id", value]

    # ========================================================================
    # Passive Interface
    # ========================================================================

    def get_ospf_passive_interface(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["passive-interface", value]

    # ========================================================================
    # Segment Routing
    # ========================================================================

    def get_ospf_segment_routing_global_block_low(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "global-block", "low-label-value", value]

    def get_ospf_segment_routing_global_block_high(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "global-block", "high-label-value", value]

    def get_ospf_segment_routing_local_block_low(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "local-block", "low-label-value", value]

    def get_ospf_segment_routing_local_block_high(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "local-block", "high-label-value", value]

    def get_ospf_segment_routing_prefix_index_value(self, name: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "prefix", prefix, "index", "value", value]

    def get_ospf_segment_routing_prefix_index_explicit_null(self, name: str, prefix: str) -> List[str]:
        return self._base(name) + ["segment-routing", "prefix", prefix, "index", "explicit-null"]

    def get_ospf_segment_routing_prefix_index_no_php_flag(self, name: str, prefix: str) -> List[str]:
        return self._base(name) + ["segment-routing", "prefix", prefix, "index", "no-php-flag"]
