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
from .l2tpv3 import L2TPv3InterfaceMapper
from .loopback import LoopbackInterfaceMapper
from .macsec import MacsecInterfaceMapper
from .openvpn import OpenvpnInterfaceMapper
from .pppoe import PppoeInterfaceMapper

__all__ = [
    "EthernetInterfaceMapper",
    "DummyInterfaceMapper",
    "BondingInterfaceMapper",
    "BridgeInterfaceMapper",
    "GeneveInterfaceMapper",
    "InputInterfaceMapper",
    "L2TPv3InterfaceMapper",
    "LoopbackInterfaceMapper",
    "MacsecInterfaceMapper",
    "OpenvpnInterfaceMapper",
    "PppoeInterfaceMapper",
]
