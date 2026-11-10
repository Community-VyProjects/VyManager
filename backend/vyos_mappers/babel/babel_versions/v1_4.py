"""VyOS 1.4 Babel mapper.

``protocols babel redistribute ipv4 nhrp`` and ``ipv6 nhrp`` do not exist
on 1.4. This class does not gain those protocols.
"""

from ..babel import BabelMapper


class BabelMapperV1_4(BabelMapper):
    """VyOS 1.4 Babel mapper."""

    def __init__(self, version: str):
        super().__init__(version)
