"""
Interface Mappers

Handles version-specific command translation for different interface types.
"""

from .ethernet import EthernetInterfaceMapper
from .dummy import DummyInterfaceMapper
from .bonding import BondingInterfaceMapper
from .bridge import BridgeInterfaceMapper
from .tunnel import TunnelInterfaceMapper
from .vlan import VLANInterfaceMapper
from .vxlan import VXLANInterfaceMapper

__all__ = [
    "EthernetInterfaceMapper",
    "DummyInterfaceMapper",
    "BondingInterfaceMapper",
    "BridgeInterfaceMapper",
    "TunnelInterfaceMapper",
    "VLANInterfaceMapper",
    "VXLANInterfaceMapper",
]
