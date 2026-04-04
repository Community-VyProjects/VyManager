"""
Interface Mappers

Handles version-specific command translation for different interface types.
"""

from .ethernet import EthernetInterfaceMapper
from .dummy import DummyInterfaceMapper
from .bonding import BondingInterfaceMapper
from .bridge import BridgeInterfaceMapper
from .geneve import GeneveInterfaceMapper
from .input import InputInterfaceMapper

__all__ = [
    "EthernetInterfaceMapper",
    "DummyInterfaceMapper",
    "BondingInterfaceMapper",
    "BridgeInterfaceMapper",
    "GeneveInterfaceMapper",
    "InputInterfaceMapper",
]
