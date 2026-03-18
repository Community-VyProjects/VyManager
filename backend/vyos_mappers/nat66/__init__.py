"""NAT66 mappers package."""
from .nat66 import NAT66Mapper
from .nat66_versions import get_nat66_mapper

__all__ = ["NAT66Mapper", "get_nat66_mapper"]
