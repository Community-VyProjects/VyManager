"""
Interface Mappers

Handles version-specific command translation for different interface types.
"""

from .ethernet import EthernetInterfaceMapper
from .dummy import DummyInterfaceMapper

__all__ = [
    "EthernetInterfaceMapper",
    "DummyInterfaceMapper",
]
