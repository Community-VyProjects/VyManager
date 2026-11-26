"""VyOS 1.5 RPKI mapper.

VyOS 1.5 adds ``protocols rpki cache <ADDR> source-address``.
"""

from typing import List

from ..rpki import RpkiMapper


class RpkiMapperV1_5(RpkiMapper):
    """VyOS 1.5 RPKI mapper with the 1.5-only cache paths."""

    def get_cache_source_address(self, address: str, source: str) -> List[str]:
        return self._rpki() + ["cache", address, "source-address", source]

    def get_cache_source_address_delete(self, address: str) -> List[str]:
        return self._rpki() + ["cache", address, "source-address"]
