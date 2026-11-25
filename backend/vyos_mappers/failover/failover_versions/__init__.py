"""Factory for failover routing mappers.

The shared class is returned directly on 1.4. ``dhcp-interface`` and the
check target ``interface``/``vrf`` children exist only on 1.5, so that
version gets the subclass. There is no merge proxy and no empty 1.4 file.
"""
from ..failover import FailoverMapper
from .v1_5 import FailoverMapperV1_5


def get_failover_mapper(version: str) -> FailoverMapper:
    """Return the shared mapper, or the 1.5 subclass.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return FailoverMapper(version)
    return FailoverMapperV1_5(version)


__all__ = ["FailoverMapperV1_5", "get_failover_mapper"]
