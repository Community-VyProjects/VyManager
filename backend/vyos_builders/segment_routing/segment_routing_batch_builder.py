"""Segment Routing Protocol Batch Builder.

Provides all batch operations for Segment Routing (SRv6) configuration.
Covers: SRv6 locator management and per-interface SRv6 HMAC policy.
"""

from typing import Dict, Any, cast
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.segment_routing import SegmentRoutingMapper
from vyos_builders.base import BatchBuilder


class SegmentRoutingBatchBuilder(BatchBuilder):
    """Complete batch builder for Segment Routing protocol operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "segment_routing"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    @property
    def m(self) -> SegmentRoutingMapper:
        return cast(SegmentRoutingMapper, self.mappers[self.mapper_key])

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            # On 1.4 an edit of a committed tree is a delete commit followed
            # by a create commit; see SegmentRoutingMapper.modify_requires_recreate.
            "modify_requires_recreate": self.m.modify_requires_recreate(),
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
