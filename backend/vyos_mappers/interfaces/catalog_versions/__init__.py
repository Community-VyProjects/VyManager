"""Factory for version-specific interface catalog mappers."""

from ..catalog import InterfaceCatalogMapper
from .v1_5 import InterfaceCatalogMapperV1_5


def get_interface_catalog_mapper(version: str) -> InterfaceCatalogMapper:
    """Return the interface catalog mapper for this device.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return InterfaceCatalogMapper(version)
    return InterfaceCatalogMapperV1_5(version)


__all__ = ["InterfaceCatalogMapperV1_5", "get_interface_catalog_mapper"]
