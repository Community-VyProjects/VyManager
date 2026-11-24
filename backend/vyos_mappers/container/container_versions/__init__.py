"""Factory for container mappers.

The shared class is returned directly on 1.4. The 1.5-only leaves live on the
subclass. A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..container import ContainerMapper
from .v1_5 import ContainerMapperV1_5


def get_container_mapper(version: str) -> ContainerMapper:
    """Return the container mapper for this device."""
    if "1.4" in version:
        return ContainerMapper(version)
    return ContainerMapperV1_5(version)


__all__ = ["ContainerMapperV1_5", "get_container_mapper"]
