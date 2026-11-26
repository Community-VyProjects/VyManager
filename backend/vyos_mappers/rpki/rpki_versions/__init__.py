"""Factory for RPKI protocol mappers.

The shared class is returned directly on 1.4. Cache ``source-address``
exists only on 1.5, so that version gets the subclass. There is no merge
proxy and no empty 1.4 file.
"""
from ..rpki import RpkiMapper
from .v1_5 import RpkiMapperV1_5


def get_rpki_mapper(version: str) -> RpkiMapper:
    """Return the shared mapper, or the 1.5 subclass.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return RpkiMapper(version)
    return RpkiMapperV1_5(version)


__all__ = ["RpkiMapperV1_5", "get_rpki_mapper"]
