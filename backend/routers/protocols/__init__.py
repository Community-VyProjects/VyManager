"""
Protocol Routers

Routers for routing protocol configurations.
"""

from . import bgp
from . import ospf
from . import ospfv3
from . import rip
from . import ripng
from . import isis
from . import babel
from . import openfabric

__all__ = ["bgp", "ospf", "ospfv3", "rip", "ripng", "isis", "babel", "openfabric"]
