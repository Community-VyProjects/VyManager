"""
BFD Protocol Batch Builder

Provides all batch operations for BFD (Bidirectional Forwarding Detection) configuration.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class BfdBatchBuilder:
    """Complete batch builder for BFD protocol operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "bfd"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "BfdBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "BfdBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # ========================================================================
    # Peer Operations
    # ========================================================================

    def set_peer(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_path(peer)
        return self.add_set(path)

    def delete_peer(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_path(peer)
        return self.add_delete(path)

    def set_peer_echo_mode(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_echo_mode(peer)
        return self.add_set(path)

    def delete_peer_echo_mode(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_echo_mode(peer)
        return self.add_delete(path)

    def set_peer_interval_echo_interval(self, peer: str, value: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_interval_echo_interval(peer, value)
        return self.add_set(path)

    def delete_peer_interval_echo_interval(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_path(peer) + ["interval", "echo-interval"]
        return self.add_delete(path)

    def set_peer_interval_multiplier(self, peer: str, value: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_interval_multiplier(peer, value)
        return self.add_set(path)

    def delete_peer_interval_multiplier(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_path(peer) + ["interval", "multiplier"]
        return self.add_delete(path)

    def set_peer_interval_receive(self, peer: str, value: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_interval_receive(peer, value)
        return self.add_set(path)

    def delete_peer_interval_receive(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_path(peer) + ["interval", "receive"]
        return self.add_delete(path)

    def set_peer_interval_transmit(self, peer: str, value: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_interval_transmit(peer, value)
        return self.add_set(path)

    def delete_peer_interval_transmit(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_path(peer) + ["interval", "transmit"]
        return self.add_delete(path)

    def set_peer_minimum_ttl(self, peer: str, value: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_minimum_ttl(peer, value)
        return self.add_set(path)

    def delete_peer_minimum_ttl(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_path(peer) + ["minimum-ttl"]
        return self.add_delete(path)

    def set_peer_multihop(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_multihop(peer)
        return self.add_set(path)

    def delete_peer_multihop(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_multihop(peer)
        return self.add_delete(path)

    def set_peer_passive(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_passive(peer)
        return self.add_set(path)

    def delete_peer_passive(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_passive(peer)
        return self.add_delete(path)

    def set_peer_profile(self, peer: str, profile: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_profile(peer, profile)
        return self.add_set(path)

    def delete_peer_profile(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_path(peer) + ["profile"]
        return self.add_delete(path)

    def set_peer_shutdown(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_shutdown(peer)
        return self.add_set(path)

    def delete_peer_shutdown(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_shutdown(peer)
        return self.add_delete(path)

    def set_peer_source_address(self, peer: str, address: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_source_address(peer, address)
        return self.add_set(path)

    def delete_peer_source_address(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_path(peer) + ["source", "address"]
        return self.add_delete(path)

    def set_peer_source_interface(self, peer: str, interface: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_source_interface(peer, interface)
        return self.add_set(path)

    def delete_peer_source_interface(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_path(peer) + ["source", "interface"]
        return self.add_delete(path)

    def set_peer_vrf(self, peer: str, vrf: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_vrf(peer, vrf)
        return self.add_set(path)

    def delete_peer_vrf(self, peer: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_peer_path(peer) + ["vrf"]
        return self.add_delete(path)

    # ========================================================================
    # Profile Operations
    # ========================================================================

    def set_profile(self, profile: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_path(profile)
        return self.add_set(path)

    def delete_profile(self, profile: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_path(profile)
        return self.add_delete(path)

    def set_profile_echo_mode(self, profile: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_echo_mode(profile)
        return self.add_set(path)

    def delete_profile_echo_mode(self, profile: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_echo_mode(profile)
        return self.add_delete(path)

    def set_profile_interval_echo_interval(self, profile: str, value: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_interval_echo_interval(profile, value)
        return self.add_set(path)

    def delete_profile_interval_echo_interval(self, profile: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_path(profile) + ["interval", "echo-interval"]
        return self.add_delete(path)

    def set_profile_interval_multiplier(self, profile: str, value: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_interval_multiplier(profile, value)
        return self.add_set(path)

    def delete_profile_interval_multiplier(self, profile: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_path(profile) + ["interval", "multiplier"]
        return self.add_delete(path)

    def set_profile_interval_receive(self, profile: str, value: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_interval_receive(profile, value)
        return self.add_set(path)

    def delete_profile_interval_receive(self, profile: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_path(profile) + ["interval", "receive"]
        return self.add_delete(path)

    def set_profile_interval_transmit(self, profile: str, value: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_interval_transmit(profile, value)
        return self.add_set(path)

    def delete_profile_interval_transmit(self, profile: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_path(profile) + ["interval", "transmit"]
        return self.add_delete(path)

    def set_profile_minimum_ttl(self, profile: str, value: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_minimum_ttl(profile, value)
        return self.add_set(path)

    def delete_profile_minimum_ttl(self, profile: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_path(profile) + ["minimum-ttl"]
        return self.add_delete(path)

    def set_profile_passive(self, profile: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_passive(profile)
        return self.add_set(path)

    def delete_profile_passive(self, profile: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_passive(profile)
        return self.add_delete(path)

    def set_profile_shutdown(self, profile: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_shutdown(profile)
        return self.add_set(path)

    def delete_profile_shutdown(self, profile: str) -> "BfdBatchBuilder":
        path = self.mappers[self.mapper_key].get_profile_shutdown(profile)
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
                "peers": {
                    "supported": True,
                    "description": "BFD peer configuration",
                },
                "profiles": {
                    "supported": True,
                    "description": "BFD profile templates",
                },
                "echo_mode": {
                    "supported": True,
                    "description": "Echo transmission mode",
                },
                "multihop": {
                    "supported": True,
                    "description": "Multi-hop BFD sessions",
                },
                "vrf": {
                    "supported": True,
                    "description": "VRF-aware BFD peers",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }
