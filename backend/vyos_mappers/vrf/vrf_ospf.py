"""
VRF OSPF Command Mapper

``vrf name <NAME> protocols ospf`` is the global ``protocols ospf`` tree on
both labs, and VRF OSPF ops run the global ``OspfBatchBuilder`` first. Its mapper,
and the 1.5 subclass in ``ospf_versions``, own every path that builder serves,
including the 1.5-only leaves and the redistribute allowlist.

This mapper holds only the op and verb pairs the global builder has no method
for, which VRF dispatch falls back to by name:

- ``area <id> area-type <type>`` set from one Select value (the global
  builder has one method per type);
- the set of a virtual-link md5 ``key-id``, and the deletes of an md5
  ``md5-key``, of one segment-routing block label, and of a bare
  ``ldp-sync``.
"""

from typing import List

from ..base import BaseFeatureMapper
from ..ospf.ospf_versions import get_ospf_mapper


class VrfOspfMapper(BaseFeatureMapper):
    """VRF OSPF fallback paths the global OSPF builder does not serve."""

    def _base(self, name: str) -> List[str]:
        return ["vrf", "name", name, "protocols", "ospf"]

    # ========================================================================
    # Area
    # ========================================================================

    def get_ospf_area_type(self, name: str, area: str, area_type: str) -> List[str]:
        if area_type not in get_ospf_mapper(self.version).area_types():
            raise ValueError(f"area-type {area_type} is not supported on this device")
        return self._base(name) + ["area", area, "area-type", area_type]

    # --- Area Virtual-Link ---

    def get_ospf_area_virtual_link_authentication_md5_key_id(self, name: str, area: str, address: str, key_id: str) -> List[str]:
        return self._base(name) + ["area", area, "virtual-link", address, "authentication", "md5", "key-id", key_id]

    def get_ospf_area_virtual_link_authentication_md5_key_id_md5_key(self, name: str, area: str, address: str, key_id: str, value: str) -> List[str]:
        return self._base(name) + ["area", area, "virtual-link", address, "authentication", "md5", "key-id", key_id, "md5-key", value]

    # ========================================================================
    # Interface
    # ========================================================================

    def get_ospf_interface_authentication_md5_key_id_md5_key(self, name: str, iface: str, key_id: str, value: str) -> List[str]:
        return self._base(name) + ["interface", iface, "authentication", "md5", "key-id", key_id, "md5-key", value]

    # ========================================================================
    # LDP Sync (Global)
    # ========================================================================

    def get_ospf_ldp_sync(self, name: str) -> List[str]:
        return self._base(name) + ["ldp-sync"]

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
