"""Factory for the bridge firewall mapper.

A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..bridge import BridgeFirewallMapper
from .v1_5 import BridgeFirewallMapperV1_5


def get_bridge_firewall_mapper(version: str) -> BridgeFirewallMapper:
    """Return the bridge firewall mapper for this device."""
    if "1.4" in version:
        return BridgeFirewallMapper(version)
    return BridgeFirewallMapperV1_5(version)
