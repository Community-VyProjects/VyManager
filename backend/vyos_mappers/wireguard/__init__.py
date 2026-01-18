"""WireGuard VPN mapper package."""

from .wireguard import WireGuardMapper
from .wireguard_versions import get_wireguard_mapper

__all__ = ["WireGuardMapper", "get_wireguard_mapper"]
