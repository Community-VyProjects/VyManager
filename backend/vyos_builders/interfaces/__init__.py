"""
Interface Batch Builders

Provides batch operation builders for different interface types.
"""

from .ethernet import EthernetInterfaceBuilderMixin
from .dummy import DummyInterfaceBuilderMixin

__all__ = [
    "EthernetInterfaceBuilderMixin",
    "DummyInterfaceBuilderMixin",
]
