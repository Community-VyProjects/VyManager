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
from .pseudo_ethernet import PseudoEthernetInterfaceMapper
from .virtual_ethernet import VirtualEthernetInterfaceMapper
from .vpp import VppInterfaceMapper
from .vti import VtiInterfaceMapper
from .wireless import WirelessInterfaceMapper

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
    "PseudoEthernetInterfaceMapper",
    "VirtualEthernetInterfaceMapper",
    "VppInterfaceMapper",
    "VtiInterfaceMapper",
    "WirelessInterfaceMapper",
]
