"""Segment Routing Protocol Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper


class SegmentRoutingMapper(BaseFeatureMapper):
    """Base mapper for Segment Routing (SRv6) configuration paths."""

    def __init__(self, version: str):
        super().__init__(version)

    def _sr(self) -> List[str]:
        return ["protocols", "segment-routing"]

    # ========================================================================
    # SRv6 locators
    # ========================================================================

    def get_locator(self, name: str) -> List[str]:
        return self._sr() + ["srv6", "locator", name]

    def get_locator_delete(self, name: str) -> List[str]:
        return self._sr() + ["srv6", "locator", name]

    def get_locator_prefix(self, name: str, prefix: str) -> List[str]:
        return self._sr() + ["srv6", "locator", name, "prefix", prefix]

    def get_locator_prefix_delete(self, name: str) -> List[str]:
        return self._sr() + ["srv6", "locator", name, "prefix"]

    def get_locator_block_len(self, name: str, value: str) -> List[str]:
        return self._sr() + ["srv6", "locator", name, "block-len", value]

    def get_locator_block_len_delete(self, name: str) -> List[str]:
        return self._sr() + ["srv6", "locator", name, "block-len"]

    def get_locator_node_len(self, name: str, value: str) -> List[str]:
        return self._sr() + ["srv6", "locator", name, "node-len", value]

    def get_locator_node_len_delete(self, name: str) -> List[str]:
        return self._sr() + ["srv6", "locator", name, "node-len"]

    def get_locator_func_bits(self, name: str, value: str) -> List[str]:
        return self._sr() + ["srv6", "locator", name, "func-bits", value]

    def get_locator_func_bits_delete(self, name: str) -> List[str]:
        return self._sr() + ["srv6", "locator", name, "func-bits"]

    def get_locator_behavior_usid(self, name: str) -> List[str]:
        return self._sr() + ["srv6", "locator", name, "behavior-usid"]

    def get_locator_behavior_usid_delete(self, name: str) -> List[str]:
        return self._sr() + ["srv6", "locator", name, "behavior-usid"]

    def get_srv6_delete(self) -> List[str]:
        return self._sr() + ["srv6"]

    # ========================================================================
    # Per-interface SRv6 options
    # ========================================================================

    def get_interface_hmac(self, interface: str, policy: str) -> List[str]:
        return self._sr() + ["interface", interface, "srv6", "hmac", policy]

    def get_interface_hmac_delete(self, interface: str) -> List[str]:
        return self._sr() + ["interface", interface, "srv6", "hmac"]

    def get_interface_srv6(self, interface: str) -> List[str]:
        return self._sr() + ["interface", interface, "srv6"]

    def get_interface_delete(self, interface: str) -> List[str]:
        return self._sr() + ["interface", interface]

    # ========================================================================
    # Delete entire Segment Routing configuration
    # ========================================================================

    def get_segment_routing_delete(self) -> List[str]:
        return self._sr()
