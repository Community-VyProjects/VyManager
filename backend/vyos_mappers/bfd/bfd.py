"""
BFD Protocol Command Mapper

Handles command path generation for BFD (Bidirectional Forwarding Detection) configuration.
Version-specific logic is in version-specific files.
"""

from typing import List
from ..base import BaseFeatureMapper


class BfdMapper(BaseFeatureMapper):
    """Base mapper with common operations shared between VyOS 1.4 and 1.5."""

    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Peer Paths
    # ========================================================================

    def get_peer_path(self, peer: str) -> List[str]:
        return ["protocols", "bfd", "peer", peer]

    def get_peer_echo_mode(self, peer: str) -> List[str]:
        return ["protocols", "bfd", "peer", peer, "echo-mode"]

    def get_peer_interval_echo_interval(self, peer: str, value: str) -> List[str]:
        return ["protocols", "bfd", "peer", peer, "interval", "echo-interval", value]

    def get_peer_interval_multiplier(self, peer: str, value: str) -> List[str]:
        return ["protocols", "bfd", "peer", peer, "interval", "multiplier", value]

    def get_peer_interval_receive(self, peer: str, value: str) -> List[str]:
        return ["protocols", "bfd", "peer", peer, "interval", "receive", value]

    def get_peer_interval_transmit(self, peer: str, value: str) -> List[str]:
        return ["protocols", "bfd", "peer", peer, "interval", "transmit", value]

    def get_peer_minimum_ttl(self, peer: str, value: str) -> List[str]:
        return ["protocols", "bfd", "peer", peer, "minimum-ttl", value]

    def get_peer_multihop(self, peer: str) -> List[str]:
        return ["protocols", "bfd", "peer", peer, "multihop"]

    def get_peer_passive(self, peer: str) -> List[str]:
        return ["protocols", "bfd", "peer", peer, "passive"]

    def get_peer_profile(self, peer: str, profile: str) -> List[str]:
        return ["protocols", "bfd", "peer", peer, "profile", profile]

    def get_peer_shutdown(self, peer: str) -> List[str]:
        return ["protocols", "bfd", "peer", peer, "shutdown"]

    def get_peer_source_address(self, peer: str, address: str) -> List[str]:
        return ["protocols", "bfd", "peer", peer, "source", "address", address]

    def get_peer_source_interface(self, peer: str, interface: str) -> List[str]:
        return ["protocols", "bfd", "peer", peer, "source", "interface", interface]

    def get_peer_vrf(self, peer: str, vrf: str) -> List[str]:
        return ["protocols", "bfd", "peer", peer, "vrf", vrf]

    # ========================================================================
    # Profile Paths
    # ========================================================================

    def get_profile_path(self, profile: str) -> List[str]:
        return ["protocols", "bfd", "profile", profile]

    def get_profile_echo_mode(self, profile: str) -> List[str]:
        return ["protocols", "bfd", "profile", profile, "echo-mode"]

    def get_profile_interval_echo_interval(self, profile: str, value: str) -> List[str]:
        return ["protocols", "bfd", "profile", profile, "interval", "echo-interval", value]

    def get_profile_interval_multiplier(self, profile: str, value: str) -> List[str]:
        return ["protocols", "bfd", "profile", profile, "interval", "multiplier", value]

    def get_profile_interval_receive(self, profile: str, value: str) -> List[str]:
        return ["protocols", "bfd", "profile", profile, "interval", "receive", value]

    def get_profile_interval_transmit(self, profile: str, value: str) -> List[str]:
        return ["protocols", "bfd", "profile", profile, "interval", "transmit", value]

    def get_profile_minimum_ttl(self, profile: str, value: str) -> List[str]:
        return ["protocols", "bfd", "profile", profile, "minimum-ttl", value]

    def get_profile_passive(self, profile: str) -> List[str]:
        return ["protocols", "bfd", "profile", profile, "passive"]

    def get_profile_shutdown(self, profile: str) -> List[str]:
        return ["protocols", "bfd", "profile", profile, "shutdown"]
