"""
Interface Batch Builders

Provides batch operation builders for different interface types.
"""

from .ethernet import EthernetInterfaceBuilderMixin
from .dummy import DummyInterfaceBuilderMixin
from .bonding import BondingInterfaceBuilderMixin
from .bridge import BridgeInterfaceBuilderMixin
from .geneve import GeneveInterfaceBuilderMixin
from .input import InputInterfaceBuilderMixin
from .l2tpv3 import L2TPv3InterfaceBuilderMixin
from .loopback import LoopbackInterfaceBuilderMixin
from .macsec import MacsecInterfaceBuilderMixin
from .openvpn import OpenvpnInterfaceBuilderMixin

__all__ = [
    "EthernetInterfaceBuilderMixin",
    "DummyInterfaceBuilderMixin",
    "BondingInterfaceBuilderMixin",
    "BridgeInterfaceBuilderMixin",
    "GeneveInterfaceBuilderMixin",
    "InputInterfaceBuilderMixin",
    "L2TPv3InterfaceBuilderMixin",
    "LoopbackInterfaceBuilderMixin",
    "MacsecInterfaceBuilderMixin",
    "OpenvpnInterfaceBuilderMixin",
]
