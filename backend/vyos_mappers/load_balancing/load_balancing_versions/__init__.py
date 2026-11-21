"""Factory for load-balancing mappers.

The shared class is returned directly on 1.4. 1.5-only leaves live on the
subclass. A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ...base import is_vyos_1_4
from ..load_balancing import LoadBalancingMapper
from .v1_5 import LoadBalancingMapperV1_5


def get_load_balancing_mapper(version: str) -> LoadBalancingMapper:
    """Return the load-balancing mapper for this device."""
    if is_vyos_1_4(version):
        return LoadBalancingMapper(version)
    return LoadBalancingMapperV1_5(version)
