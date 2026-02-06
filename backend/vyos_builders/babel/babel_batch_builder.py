"""
Babel Protocol Batch Builder

Provides all batch operations for Babel routing protocol configuration.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class BabelBatchBuilder:
    """Complete batch builder for Babel protocol operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "babel"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "BabelBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "BabelBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # ========================================================================
    # Interface Operations
    # ========================================================================

    def set_interface(self, interface: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_path(interface)
        return self.add_set(path)

    def delete_interface(self, interface: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_path(interface)
        return self.add_delete(path)

    def set_interface_type(self, interface: str, iface_type: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_type(interface, iface_type)
        return self.add_set(path)

    def delete_interface_type(self, interface: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["type"]
        return self.add_delete(path)

    def set_interface_channel(self, interface: str, channel: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_channel(interface, channel)
        return self.add_set(path)

    def delete_interface_channel(self, interface: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["channel"]
        return self.add_delete(path)

    def set_interface_hello_interval(self, interface: str, interval: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_hello_interval(interface, interval)
        return self.add_set(path)

    def delete_interface_hello_interval(self, interface: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["hello-interval"]
        return self.add_delete(path)

    def set_interface_update_interval(self, interface: str, interval: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_update_interval(interface, interval)
        return self.add_set(path)

    def delete_interface_update_interval(self, interface: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["update-interval"]
        return self.add_delete(path)

    def set_interface_rxcost(self, interface: str, rxcost: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_rxcost(interface, rxcost)
        return self.add_set(path)

    def delete_interface_rxcost(self, interface: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["rxcost"]
        return self.add_delete(path)

    def set_interface_split_horizon(self, interface: str, mode: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_split_horizon(interface, mode)
        return self.add_set(path)

    def delete_interface_split_horizon(self, interface: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["split-horizon"]
        return self.add_delete(path)

    def set_interface_enable_timestamps(self, interface: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_enable_timestamps(interface)
        return self.add_set(path)

    def delete_interface_enable_timestamps(self, interface: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_enable_timestamps(interface)
        return self.add_delete(path)

    def set_interface_max_rtt_penalty(self, interface: str, penalty: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_max_rtt_penalty(interface, penalty)
        return self.add_set(path)

    def delete_interface_max_rtt_penalty(self, interface: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["max-rtt-penalty"]
        return self.add_delete(path)

    def set_interface_rtt_decay(self, interface: str, decay: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_rtt_decay(interface, decay)
        return self.add_set(path)

    def delete_interface_rtt_decay(self, interface: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["rtt-decay"]
        return self.add_delete(path)

    def set_interface_rtt_min(self, interface: str, rtt_min: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_rtt_min(interface, rtt_min)
        return self.add_set(path)

    def delete_interface_rtt_min(self, interface: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["rtt-min"]
        return self.add_delete(path)

    def set_interface_rtt_max(self, interface: str, rtt_max: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_rtt_max(interface, rtt_max)
        return self.add_set(path)

    def delete_interface_rtt_max(self, interface: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_path(interface) + ["rtt-max"]
        return self.add_delete(path)

    # ========================================================================
    # Parameters Operations
    # ========================================================================

    def set_parameters_diversity(self) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_parameters_diversity()
        return self.add_set(path)

    def delete_parameters_diversity(self) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_parameters_diversity()
        return self.add_delete(path)

    def set_parameters_diversity_factor(self, factor: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_parameters_diversity_factor(factor)
        return self.add_set(path)

    def delete_parameters_diversity_factor(self) -> "BabelBatchBuilder":
        path = ["protocols", "babel", "parameters", "diversity-factor"]
        return self.add_delete(path)

    def set_parameters_resend_delay(self, delay: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_parameters_resend_delay(delay)
        return self.add_set(path)

    def delete_parameters_resend_delay(self) -> "BabelBatchBuilder":
        path = ["protocols", "babel", "parameters", "resend-delay"]
        return self.add_delete(path)

    def set_parameters_smoothing_half_life(self, half_life: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_parameters_smoothing_half_life(half_life)
        return self.add_set(path)

    def delete_parameters_smoothing_half_life(self) -> "BabelBatchBuilder":
        path = ["protocols", "babel", "parameters", "smoothing-half-life"]
        return self.add_delete(path)

    # ========================================================================
    # Redistribute Operations
    # ========================================================================

    def set_redistribute_ipv4(self, protocol: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_redistribute_ipv4(protocol)
        return self.add_set(path)

    def delete_redistribute_ipv4(self, protocol: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_redistribute_ipv4(protocol)
        return self.add_delete(path)

    def set_redistribute_ipv6(self, protocol: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_redistribute_ipv6(protocol)
        return self.add_set(path)

    def delete_redistribute_ipv6(self, protocol: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_redistribute_ipv6(protocol)
        return self.add_delete(path)

    # ========================================================================
    # Distribute-list Operations (global)
    # ========================================================================

    def set_distribute_list_ipv4_access_list_in(self, acl: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv4_access_list_in(acl)
        return self.add_set(path)

    def delete_distribute_list_ipv4_access_list_in(self) -> "BabelBatchBuilder":
        path = ["protocols", "babel", "distribute-list", "ipv4", "access-list", "in"]
        return self.add_delete(path)

    def set_distribute_list_ipv4_access_list_out(self, acl: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv4_access_list_out(acl)
        return self.add_set(path)

    def delete_distribute_list_ipv4_access_list_out(self) -> "BabelBatchBuilder":
        path = ["protocols", "babel", "distribute-list", "ipv4", "access-list", "out"]
        return self.add_delete(path)

    def set_distribute_list_ipv4_prefix_list_in(self, prefix_list: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv4_prefix_list_in(prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv4_prefix_list_in(self) -> "BabelBatchBuilder":
        path = ["protocols", "babel", "distribute-list", "ipv4", "prefix-list", "in"]
        return self.add_delete(path)

    def set_distribute_list_ipv4_prefix_list_out(self, prefix_list: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv4_prefix_list_out(prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv4_prefix_list_out(self) -> "BabelBatchBuilder":
        path = ["protocols", "babel", "distribute-list", "ipv4", "prefix-list", "out"]
        return self.add_delete(path)

    def set_distribute_list_ipv6_access_list_in(self, acl: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv6_access_list_in(acl)
        return self.add_set(path)

    def delete_distribute_list_ipv6_access_list_in(self) -> "BabelBatchBuilder":
        path = ["protocols", "babel", "distribute-list", "ipv6", "access-list", "in"]
        return self.add_delete(path)

    def set_distribute_list_ipv6_access_list_out(self, acl: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv6_access_list_out(acl)
        return self.add_set(path)

    def delete_distribute_list_ipv6_access_list_out(self) -> "BabelBatchBuilder":
        path = ["protocols", "babel", "distribute-list", "ipv6", "access-list", "out"]
        return self.add_delete(path)

    def set_distribute_list_ipv6_prefix_list_in(self, prefix_list: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv6_prefix_list_in(prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv6_prefix_list_in(self) -> "BabelBatchBuilder":
        path = ["protocols", "babel", "distribute-list", "ipv6", "prefix-list", "in"]
        return self.add_delete(path)

    def set_distribute_list_ipv6_prefix_list_out(self, prefix_list: str) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv6_prefix_list_out(prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv6_prefix_list_out(self) -> "BabelBatchBuilder":
        path = ["protocols", "babel", "distribute-list", "ipv6", "prefix-list", "out"]
        return self.add_delete(path)

    # ========================================================================
    # Distribute-list Operations (per-interface)
    # ========================================================================

    def set_distribute_list_ipv4_iface_access_list_in(
        self, interface: str, acl: str
    ) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv4_iface_access_list_in(interface, acl)
        return self.add_set(path)

    def delete_distribute_list_ipv4_iface_access_list_in(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = [
            "protocols", "babel", "distribute-list", "ipv4",
            "interface", interface, "access-list", "in"
        ]
        return self.add_delete(path)

    def set_distribute_list_ipv4_iface_access_list_out(
        self, interface: str, acl: str
    ) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv4_iface_access_list_out(interface, acl)
        return self.add_set(path)

    def delete_distribute_list_ipv4_iface_access_list_out(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = [
            "protocols", "babel", "distribute-list", "ipv4",
            "interface", interface, "access-list", "out"
        ]
        return self.add_delete(path)

    def set_distribute_list_ipv4_iface_prefix_list_in(
        self, interface: str, prefix_list: str
    ) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv4_iface_prefix_list_in(interface, prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv4_iface_prefix_list_in(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = [
            "protocols", "babel", "distribute-list", "ipv4",
            "interface", interface, "prefix-list", "in"
        ]
        return self.add_delete(path)

    def set_distribute_list_ipv4_iface_prefix_list_out(
        self, interface: str, prefix_list: str
    ) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv4_iface_prefix_list_out(interface, prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv4_iface_prefix_list_out(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = [
            "protocols", "babel", "distribute-list", "ipv4",
            "interface", interface, "prefix-list", "out"
        ]
        return self.add_delete(path)

    def set_distribute_list_ipv6_iface_access_list_in(
        self, interface: str, acl: str
    ) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv6_iface_access_list_in(interface, acl)
        return self.add_set(path)

    def delete_distribute_list_ipv6_iface_access_list_in(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = [
            "protocols", "babel", "distribute-list", "ipv6",
            "interface", interface, "access-list", "in"
        ]
        return self.add_delete(path)

    def set_distribute_list_ipv6_iface_access_list_out(
        self, interface: str, acl: str
    ) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv6_iface_access_list_out(interface, acl)
        return self.add_set(path)

    def delete_distribute_list_ipv6_iface_access_list_out(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = [
            "protocols", "babel", "distribute-list", "ipv6",
            "interface", interface, "access-list", "out"
        ]
        return self.add_delete(path)

    def set_distribute_list_ipv6_iface_prefix_list_in(
        self, interface: str, prefix_list: str
    ) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv6_iface_prefix_list_in(interface, prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv6_iface_prefix_list_in(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = [
            "protocols", "babel", "distribute-list", "ipv6",
            "interface", interface, "prefix-list", "in"
        ]
        return self.add_delete(path)

    def set_distribute_list_ipv6_iface_prefix_list_out(
        self, interface: str, prefix_list: str
    ) -> "BabelBatchBuilder":
        path = self.mappers[self.mapper_key].get_distribute_list_ipv6_iface_prefix_list_out(interface, prefix_list)
        return self.add_set(path)

    def delete_distribute_list_ipv6_iface_prefix_list_out(
        self, interface: str
    ) -> "BabelBatchBuilder":
        path = [
            "protocols", "babel", "distribute-list", "ipv6",
            "interface", interface, "prefix-list", "out"
        ]
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_5 = "1.5" in self.version or "latest" in self.version
        is_1_4 = "1.4" in self.version

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
                    "supported": is_1_5,
                    "description": "Redistribute NHRP routes (VyOS 1.5+)",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
            "redistribute_protocols": {
                "ipv4": self._get_ipv4_redistribute_protocols(is_1_5),
                "ipv6": self._get_ipv6_redistribute_protocols(is_1_5),
            },
        }

    def _get_ipv4_redistribute_protocols(self, is_1_5: bool) -> List[str]:
        protocols = ["bgp", "connected", "isis", "kernel", "openfabric", "ospf", "rip", "static"]
        if is_1_5:
            protocols.append("nhrp")
        return sorted(protocols)

    def _get_ipv6_redistribute_protocols(self, is_1_5: bool) -> List[str]:
        protocols = ["bgp", "connected", "isis", "kernel", "openfabric", "ospfv3", "ripng", "static"]
        if is_1_5:
            protocols.append("nhrp")
        return sorted(protocols)
