"""
Babel Protocol Batch Builder

Provides all batch operations for Babel routing protocol configuration.
Handles version-specific differences through the mapper layer.
"""

from typing import Dict, Any
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.babel.babel import BabelMapper
from vyos_builders.base import BatchBuilder


class BabelBatchBuilder(BatchBuilder):
    """Complete batch builder for Babel protocol operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "babel"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    def _mapper(self) -> BabelMapper:
        mapper = self.mappers[self.mapper_key]
        if not isinstance(mapper, BabelMapper):
            raise TypeError("babel mapper is not BabelMapper")
        return mapper

    # ========================================================================
    # Interface Operations
    # ========================================================================

    def set_interface(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_path(interface)
        return self.add_set(path)

    def delete_interface(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_path(interface)
        return self.add_delete(path)

    def set_interface_type(self, interface: str, iface_type: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_type(interface, iface_type)
        return self.add_set(path)

    def delete_interface_type(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_type_delete(interface)
        return self.add_delete(path)

    def set_interface_channel(self, interface: str, channel: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_channel(interface, channel)
        return self.add_set(path)

    def delete_interface_channel(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_channel_delete(interface)
        return self.add_delete(path)

    def set_interface_hello_interval(self, interface: str, interval: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_hello_interval(interface, interval)
        return self.add_set(path)

    def delete_interface_hello_interval(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_hello_interval_delete(interface)
        return self.add_delete(path)

    def set_interface_update_interval(self, interface: str, interval: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_update_interval(interface, interval)
        return self.add_set(path)

    def delete_interface_update_interval(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_update_interval_delete(interface)
        return self.add_delete(path)

    def set_interface_rxcost(self, interface: str, rxcost: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_rxcost(interface, rxcost)
        return self.add_set(path)

    def delete_interface_rxcost(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_rxcost_delete(interface)
        return self.add_delete(path)

    def set_interface_split_horizon(self, interface: str, mode: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_split_horizon(interface, mode)
        return self.add_set(path)

    def delete_interface_split_horizon(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_split_horizon_delete(interface)
        return self.add_delete(path)

    def set_interface_enable_timestamps(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_enable_timestamps(interface)
        return self.add_set(path)

    def delete_interface_enable_timestamps(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_enable_timestamps(interface)
        return self.add_delete(path)

    def set_interface_max_rtt_penalty(self, interface: str, penalty: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_max_rtt_penalty(interface, penalty)
        return self.add_set(path)

    def delete_interface_max_rtt_penalty(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_max_rtt_penalty_delete(interface)
        return self.add_delete(path)

    def set_interface_rtt_decay(self, interface: str, decay: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_rtt_decay(interface, decay)
        return self.add_set(path)

    def delete_interface_rtt_decay(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_rtt_decay_delete(interface)
        return self.add_delete(path)

    def set_interface_rtt_min(self, interface: str, rtt_min: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_rtt_min(interface, rtt_min)
        return self.add_set(path)

    def delete_interface_rtt_min(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_rtt_min_delete(interface)
        return self.add_delete(path)

    def set_interface_rtt_max(self, interface: str, rtt_max: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_rtt_max(interface, rtt_max)
        return self.add_set(path)

    def delete_interface_rtt_max(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_interface_rtt_max_delete(interface)
        return self.add_delete(path)

    # ========================================================================
    # Parameters Operations
    # ========================================================================

    def set_parameters_diversity(self) -> "BabelBatchBuilder":
        path = self._mapper().get_parameters_diversity()
        return self.add_set(path)

    def delete_parameters_diversity(self) -> "BabelBatchBuilder":
        path = self._mapper().get_parameters_diversity()
        return self.add_delete(path)

    def set_parameters_diversity_factor(self, factor: str) -> "BabelBatchBuilder":
        path = self._mapper().get_parameters_diversity_factor(factor)
        return self.add_set(path)

    def delete_parameters_diversity_factor(self) -> "BabelBatchBuilder":
        path = self._mapper().get_parameters_diversity_factor_delete()
        return self.add_delete(path)

    def set_parameters_resend_delay(self, delay: str) -> "BabelBatchBuilder":
        path = self._mapper().get_parameters_resend_delay(delay)
        return self.add_set(path)

    def delete_parameters_resend_delay(self) -> "BabelBatchBuilder":
        path = self._mapper().get_parameters_resend_delay_delete()
        return self.add_delete(path)

    def set_parameters_smoothing_half_life(self, half_life: str) -> "BabelBatchBuilder":
        path = self._mapper().get_parameters_smoothing_half_life(half_life)
        return self.add_set(path)

    def delete_parameters_smoothing_half_life(self) -> "BabelBatchBuilder":
        path = self._mapper().get_parameters_smoothing_half_life_delete()
        return self.add_delete(path)

    # ========================================================================
    # Redistribute Operations
    # ========================================================================

    def set_redistribute_ipv4(self, protocol: str) -> "BabelBatchBuilder":
        path = self._mapper().get_redistribute_ipv4(protocol)
        return self.add_set(path)

    def delete_redistribute_ipv4(self, protocol: str) -> "BabelBatchBuilder":
        path = self._mapper().get_redistribute_ipv4_delete(protocol)
        return self.add_delete(path)

    def set_redistribute_ipv6(self, protocol: str) -> "BabelBatchBuilder":
        path = self._mapper().get_redistribute_ipv6(protocol)
        return self.add_set(path)

    def delete_redistribute_ipv6(self, protocol: str) -> "BabelBatchBuilder":
        path = self._mapper().get_redistribute_ipv6_delete(protocol)
        return self.add_delete(path)

    # ========================================================================
    # Distribute-list Operations (global)
    # ========================================================================

    def set_distribute_list_ipv4_access_list_in(self, acl: str) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_access_list_in(acl)
        return self.add_set(path)

    def delete_distribute_list_ipv4_access_list_in(self) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_access_list_in_delete()
        return self.add_delete(path)

    def set_distribute_list_ipv4_access_list_out(self, acl: str) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_access_list_out(acl)
        return self.add_set(path)

    def delete_distribute_list_ipv4_access_list_out(self) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_access_list_out_delete()
        return self.add_delete(path)

    def set_distribute_list_ipv4_prefix_list_in(self, prefix_list: str) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_prefix_list_in(prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv4_prefix_list_in(self) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_prefix_list_in_delete()
        return self.add_delete(path)

    def set_distribute_list_ipv4_prefix_list_out(self, prefix_list: str) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_prefix_list_out(prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv4_prefix_list_out(self) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_prefix_list_out_delete()
        return self.add_delete(path)

    def set_distribute_list_ipv6_access_list_in(self, acl: str) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_access_list_in(acl)
        return self.add_set(path)

    def delete_distribute_list_ipv6_access_list_in(self) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_access_list_in_delete()
        return self.add_delete(path)

    def set_distribute_list_ipv6_access_list_out(self, acl: str) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_access_list_out(acl)
        return self.add_set(path)

    def delete_distribute_list_ipv6_access_list_out(self) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_access_list_out_delete()
        return self.add_delete(path)

    def set_distribute_list_ipv6_prefix_list_in(self, prefix_list: str) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_prefix_list_in(prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv6_prefix_list_in(self) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_prefix_list_in_delete()
        return self.add_delete(path)

    def set_distribute_list_ipv6_prefix_list_out(self, prefix_list: str) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_prefix_list_out(prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv6_prefix_list_out(self) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_prefix_list_out_delete()
        return self.add_delete(path)

    # ========================================================================
    # Distribute-list Operations (per-interface)
    # ========================================================================

    def set_distribute_list_ipv4_iface_access_list_in(
        self, interface: str, acl: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_iface_access_list_in(interface, acl)
        return self.add_set(path)

    def delete_distribute_list_ipv4_iface_access_list_in(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_iface_access_list_in_delete(interface)
        return self.add_delete(path)

    def set_distribute_list_ipv4_iface_access_list_out(
        self, interface: str, acl: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_iface_access_list_out(interface, acl)
        return self.add_set(path)

    def delete_distribute_list_ipv4_iface_access_list_out(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_iface_access_list_out_delete(interface)
        return self.add_delete(path)

    def set_distribute_list_ipv4_iface_prefix_list_in(
        self, interface: str, prefix_list: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_iface_prefix_list_in(interface, prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv4_iface_prefix_list_in(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_iface_prefix_list_in_delete(interface)
        return self.add_delete(path)

    def set_distribute_list_ipv4_iface_prefix_list_out(
        self, interface: str, prefix_list: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_iface_prefix_list_out(interface, prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv4_iface_prefix_list_out(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_iface_prefix_list_out_delete(interface)
        return self.add_delete(path)

    def set_distribute_list_ipv6_iface_access_list_in(
        self, interface: str, acl: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_iface_access_list_in(interface, acl)
        return self.add_set(path)

    def delete_distribute_list_ipv6_iface_access_list_in(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_iface_access_list_in_delete(interface)
        return self.add_delete(path)

    def set_distribute_list_ipv6_iface_access_list_out(
        self, interface: str, acl: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_iface_access_list_out(interface, acl)
        return self.add_set(path)

    def delete_distribute_list_ipv6_iface_access_list_out(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_iface_access_list_out_delete(interface)
        return self.add_delete(path)

    def set_distribute_list_ipv6_iface_prefix_list_in(
        self, interface: str, prefix_list: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_iface_prefix_list_in(interface, prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv6_iface_prefix_list_in(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_iface_prefix_list_in_delete(interface)
        return self.add_delete(path)

    def set_distribute_list_ipv6_iface_prefix_list_out(
        self, interface: str, prefix_list: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_iface_prefix_list_out(interface, prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv6_iface_prefix_list_out(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_iface_prefix_list_out_delete(interface)
        return self.add_delete(path)

    def delete_distribute_list_ipv4_iface(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv4_iface_delete(interface)
        return self.add_delete(path)

    def delete_distribute_list_ipv6_iface(self, interface: str) -> "BabelBatchBuilder":
        path = self._mapper().get_distribute_list_ipv6_iface_delete(interface)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "features": {
                "interfaces": {
                    "supported": True,
                    "description": "Babel interface configuration",
                },
                "parameters": {
                    "supported": True,
                    "description": "Babel global parameters (diversity, resend-delay, smoothing)",
                },
                "redistribute": {
                    "supported": True,
                    "description": "Route redistribution into Babel",
                },
                "distribute_list": {
                    "supported": True,
                    "description": "Distribute lists for route filtering",
                },
                "redistribute_nhrp": {
                    "supported": "nhrp" in self._mapper().redistribute_ipv4_protocols(),
                    "description": "Redistribute NHRP routes",
                },
            },
            "redistribute_protocols": {
                "ipv4": sorted(self._mapper().redistribute_ipv4_protocols()),
                "ipv6": sorted(self._mapper().redistribute_ipv6_protocols()),
            },
        }
