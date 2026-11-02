"""Read-model for BFD config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

from typing import Any, Dict, List, Optional


def _empty_interval() -> Dict[str, Optional[int]]:
    return {
        "echo_interval": None,
        "multiplier": None,
        "receive": None,
        "transmit": None,
    }


def _empty_source() -> Dict[str, Optional[str]]:
    return {"address": None, "interface": None}


def parse_interval(config: dict) -> Dict[str, Optional[int]]:
    """Parse BFD interval settings from config."""
    interval_raw = config.get("interval", {})
    if not interval_raw:
        return _empty_interval()

    return {
        "echo_interval": int(interval_raw["echo-interval"]) if interval_raw.get("echo-interval") else None,
        "multiplier": int(interval_raw["multiplier"]) if interval_raw.get("multiplier") else None,
        "receive": int(interval_raw["receive"]) if interval_raw.get("receive") else None,
        "transmit": int(interval_raw["transmit"]) if interval_raw.get("transmit") else None,
    }


def parse_source(config: dict) -> Dict[str, Optional[str]]:
    """Parse BFD peer source configuration."""
    source_raw = config.get("source", {})
    if not source_raw:
        return _empty_source()

    return {
        "address": source_raw.get("address"),
        "interface": source_raw.get("interface"),
    }


def parse_peers(peers_raw: dict) -> List[Dict[str, Any]]:
    """Parse BFD peer configurations."""
    peers = []

    for peer_addr, peer_config in peers_raw.items():
        if peer_config is None:
            peer_config = {}

        peers.append(
            {
                "address": peer_addr,
                "echo_mode": "echo-mode" in peer_config,
                "interval": parse_interval(peer_config),
                "minimum_ttl": int(peer_config["minimum-ttl"]) if peer_config.get("minimum-ttl") else None,
                "multihop": "multihop" in peer_config,
                "passive": "passive" in peer_config,
                "profile": peer_config.get("profile"),
                "shutdown": "shutdown" in peer_config,
                "source": parse_source(peer_config),
                "vrf": peer_config.get("vrf"),
            }
        )

    return peers


def parse_profiles(profiles_raw: dict) -> List[Dict[str, Any]]:
    """Parse BFD profile configurations."""
    profiles = []

    for profile_name, profile_config in profiles_raw.items():
        if profile_config is None:
            profile_config = {}

        profiles.append(
            {
                "name": profile_name,
                "echo_mode": "echo-mode" in profile_config,
                "interval": parse_interval(profile_config),
                "minimum_ttl": int(profile_config["minimum-ttl"]) if profile_config.get("minimum-ttl") else None,
                "passive": "passive" in profile_config,
                "shutdown": "shutdown" in profile_config,
            }
        )

    return profiles


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/bfd/config payload."""
    bfd_config = full_config.get("protocols", {}).get("bfd", {})
    if not bfd_config:
        return {"peers": [], "profiles": []}

    return {
        "peers": parse_peers(bfd_config.get("peer", {})),
        "profiles": parse_profiles(bfd_config.get("profile", {})),
    }
