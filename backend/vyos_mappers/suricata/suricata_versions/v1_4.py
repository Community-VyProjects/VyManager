"""VyOS 1.4 has no service suricata node.

Path methods live on the base mapper and reject this version themselves.
"""


class SuricataMapperV1_4:
    def supported(self) -> bool:
        return False
