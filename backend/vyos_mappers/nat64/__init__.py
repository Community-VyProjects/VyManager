"""NAT64 mappers package."""
from .nat64 import NAT64Mapper
from .nat64_versions import get_nat64_mapper

__all__ = ["NAT64Mapper", "get_nat64_mapper"]
