"""VyOS 1.5 Babel mapper.

``protocols babel redistribute ipv4 nhrp`` and ``ipv6 nhrp`` exist only on 1.5.
"""

from typing import FrozenSet

from ..babel import BabelMapper


class BabelMapperV1_5(BabelMapper):
    """VyOS 1.5 Babel mapper with NHRP redistribute."""

    def redistribute_ipv4_protocols(self) -> FrozenSet[str]:
        return super().redistribute_ipv4_protocols() | {"nhrp"}

    def redistribute_ipv6_protocols(self) -> FrozenSet[str]:
        return super().redistribute_ipv6_protocols() | {"nhrp"}
