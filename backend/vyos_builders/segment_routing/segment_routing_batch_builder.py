"""Segment Routing Protocol Batch Builder.

Provides all batch operations for Segment Routing (SRv6) configuration.
Covers: SRv6 locator management and per-interface SRv6 HMAC policy.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class SegmentRoutingBatchBuilder:
    """Complete batch builder for Segment Routing protocol operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "segment_routing"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "SegmentRoutingBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "SegmentRoutingBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    @property
    def m(self):
        return self.mappers[self.mapper_key]

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v14 = "1.4" in self.version
        is_v15 = "1.5" in self.version or "latest" in self.version
        return {
            "version": self.version,
            "version_info": {
                "is_1_4": is_v14,
                "is_1_5": is_v15,
                # VyOS 1.4 FRR reload rejects any modification of an existing
                # segment-routing tree; editing requires delete + recreate in
                # separate commits. Create-from-empty and delete-to-empty work.
                "modify_requires_recreate": is_v14,
            },
            "features": {
                "locators": {
                    "supported": True,
                    "description": "SRv6 locator management (prefix, block/node lengths, function bits, uSID behavior)",
                },
                "interface_srv6": {
                    "supported": True,
                    "description": "Per-interface SRv6 packet acceptance with HMAC policy (accept/drop/ignore, default accept)",
                },
            },
        }

    # ========================================================================
    # SRv6 Locators
    # ========================================================================

    def set_locator(self, name: str) -> "SegmentRoutingBatchBuilder":
        return self.add_set(self.m.get_locator(name))

    def delete_locator(self, name: str) -> "SegmentRoutingBatchBuilder":
        return self.add_delete(self.m.get_locator_delete(name))

    def set_locator_prefix(self, name: str, prefix: str) -> "SegmentRoutingBatchBuilder":
        return self.add_set(self.m.get_locator_prefix(name, prefix))

    def delete_locator_prefix(self, name: str) -> "SegmentRoutingBatchBuilder":
        return self.add_delete(self.m.get_locator_prefix_delete(name))

    def set_locator_block_len(self, name: str, value: str) -> "SegmentRoutingBatchBuilder":
        return self.add_set(self.m.get_locator_block_len(name, value))

    def delete_locator_block_len(self, name: str) -> "SegmentRoutingBatchBuilder":
        return self.add_delete(self.m.get_locator_block_len_delete(name))

    def set_locator_node_len(self, name: str, value: str) -> "SegmentRoutingBatchBuilder":
        return self.add_set(self.m.get_locator_node_len(name, value))

    def delete_locator_node_len(self, name: str) -> "SegmentRoutingBatchBuilder":
        return self.add_delete(self.m.get_locator_node_len_delete(name))

    def set_locator_func_bits(self, name: str, value: str) -> "SegmentRoutingBatchBuilder":
        return self.add_set(self.m.get_locator_func_bits(name, value))

    def delete_locator_func_bits(self, name: str) -> "SegmentRoutingBatchBuilder":
        return self.add_delete(self.m.get_locator_func_bits_delete(name))

    def set_locator_behavior_usid(self, name: str) -> "SegmentRoutingBatchBuilder":
        return self.add_set(self.m.get_locator_behavior_usid(name))

    def delete_locator_behavior_usid(self, name: str) -> "SegmentRoutingBatchBuilder":
        return self.add_delete(self.m.get_locator_behavior_usid_delete(name))

    def delete_srv6(self) -> "SegmentRoutingBatchBuilder":
        # Deleting the last locator leaves an empty srv6 node behind, which
        # VyOS verify() still counts as "SRv6 configured" — blocking deletion
        # of the last SRv6 interface. This removes the whole srv6 subtree.
        return self.add_delete(self.m.get_srv6_delete())

    # ========================================================================
    # Per-interface SRv6 options
    # ========================================================================

    def set_interface_hmac(self, interface: str, policy: str) -> "SegmentRoutingBatchBuilder":
        return self.add_set(self.m.get_interface_hmac(interface, policy))

    def delete_interface_hmac(self, interface: str) -> "SegmentRoutingBatchBuilder":
        return self.add_delete(self.m.get_interface_hmac_delete(interface))

    def set_interface_srv6(self, interface: str) -> "SegmentRoutingBatchBuilder":
        return self.add_set(self.m.get_interface_srv6(interface))

    def delete_interface(self, interface: str) -> "SegmentRoutingBatchBuilder":
        return self.add_delete(self.m.get_interface_delete(interface))

    # ========================================================================
    # Delete entire Segment Routing configuration
    # ========================================================================

    def delete_segment_routing(self) -> "SegmentRoutingBatchBuilder":
        return self.add_delete(self.m.get_segment_routing_delete())
