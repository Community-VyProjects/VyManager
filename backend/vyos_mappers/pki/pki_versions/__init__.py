"""Factory for PKI mappers.

The shared class is returned on 1.4. ACME ``listen-address`` also takes IPv6
on 1.5, so that version gets the subclass. There is no merge proxy and no
1.4 file.
"""
from ..pki import PKIMapper
from .v1_5 import PKIMapperV1_5


def get_pki_mapper(version: str) -> PKIMapper:
    """Return the shared mapper, or the 1.5 subclass.

    A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
    """
    if "1.4" in version:
        return PKIMapper(version)
    return PKIMapperV1_5(version)


__all__ = ["PKIMapperV1_5", "get_pki_mapper"]
