"""L2TP VPN Command Mapper package."""

from .l2tp import L2TPMapper
from .l2tp_versions import get_l2tp_mapper

__all__ = ["L2TPMapper", "get_l2tp_mapper"]
