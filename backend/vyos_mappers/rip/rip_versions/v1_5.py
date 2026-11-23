"""VyOS 1.5 RIP mapper.

``protocols rip redistribute nhrp`` exists only on 1.5.
"""

from typing import FrozenSet

from ..rip import RipMapper


class RipMapperV1_5(RipMapper):
    """VyOS 1.5 RIP mapper with NHRP redistribute."""

    def redistribute_protocols(self) -> FrozenSet[str]:
        return super().redistribute_protocols() | {"nhrp"}
